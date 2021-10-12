import fs from "fs";
import path from "path";
import Stake from "../models/Stake";
import Unstake from "../models/Unstake";
import DoUnStake from "../models/DoUnstake";
import { logger } from "../logger/logger";
import { config } from "../config/config";
import { web3, getStakeManngerAddress } from "../web3";
import { decodeLog } from "../abi/StakeMannger";
import sequelize from "../db/db";

const STATE_FILE = path.resolve("./output/eth.json");

let currentBlock = 0;

export const saveState = () => {
  web3.eth.clearSubscriptions(() => {});

  let dataToSave = {
    timestamp: new Date().getTime(),
    currentBlock,
  };

  let fileContent = JSON.stringify(dataToSave, null, "  ");
  logger.debug("Saving eth.json", fileContent);
  try {
    fs.writeFileSync(STATE_FILE, fileContent);
  } catch (ex) {
    logger.error("Error: Saving eth.json", ex);
  }
};

const readState = () => {
  try {
    let state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8") || "{}");
    currentBlock = state.currentBlock || 0;
  } catch (ex) {
    console.error("Error reading eth.json", ex.message);
    currentBlock = 0;
  }
};

const dealWithTopic = async (receipt) => {
  try {
    let txid = receipt.transactionHash;
    let tx = await web3.eth.getTransaction(txid);
    if (!tx) {
      logger.warn("Connot get transaction by txid", txid);
    }
    if (receipt.topics[0] == config.gxchain2.topics.Stake) {
      dealWithStake(receipt, tx);
    }
    if (receipt.topics[0] == config.gxchain2.topics.StartUnstake) {
      dealWithStartUnstake(receipt, tx);
    }
    if (receipt.topics[0] == config.gxchain2.topics.DoUnstake) {
      dealWithDoUnStake(receipt, tx);
    }
    currentBlock = tx.blockNumber;
  } catch (err) {
    logger.error("Error: Dealing with receipt", receipt, err);
  }
};

const dealWithStake = async (receipt, tx) => {
  logger.info("New Stake tx detected : ", tx.hash);
  const transaction = await sequelize.transaction();
  let instance = await Stake.findByPk(tx.hash);
  if (!instance) {
    let stakeParams = decodeLog("Stake", receipt.data, receipt.topics.slice(1));
    if (
      stakeParams.validator &&
      stakeParams.value &&
      stakeParams.to &&
      stakeParams.shares
    ) {
      logger.info("Creating new record of Stake");
      try {
        await Stake.create(
          {
            txHash: tx.hash,
            from: tx.from,
            validator: stakeParams.validator,
            value: stakeParams.value,
            to: stakeParams.to,
            shares: stakeParams.shares,
          },
          { transaction }
        );
        await transaction.commit();
      } catch (err) {
        logger.error(err);
        await transaction.rollback();
      }
    } else {
      logger.log("Illegal Stake record find", stakeParams, tx);
    }
  } else {
    logger.error(`The tx ${tx.hash} already exist in Stake records, skip`);
  }
};

const dealWithStartUnstake = async (receipt, tx) => {
  logger.info("New StartUnstake tx detected : ", tx.hash);
  const transaction = await sequelize.transaction();
  let instance = await Unstake.findByPk(tx.hash);
  if (!instance) {
    let startUnstakeParams = decodeLog(
      "StartUnstake",
      receipt.data,
      receipt.topics.slice(1)
    );
    if (
      startUnstakeParams.id &&
      startUnstakeParams.validator &&
      startUnstakeParams.value &&
      startUnstakeParams.to &&
      startUnstakeParams.unstakeShares &&
      startUnstakeParams.timestamp
    ) {
      logger.info("Creating new record of StartUnstake");
      try {
        await Unstake.create(
          {
            id: startUnstakeParams.id,
            txHash: tx.hash,
            from: tx.from,
            validator: startUnstakeParams.validator,
            value: startUnstakeParams.value,
            to: startUnstakeParams.to,
            unstakeShares: startUnstakeParams.unstakeShares,
            timestamp: startUnstakeParams.timestamp,
            state: 0,
          },
          { transaction }
        );
        await transaction.commit();
      } catch (err) {
        logger.error(err);
        await transaction.rollback();
      }
    } else {
      logger.log("Illegal withdraw record find", startUnstakeParams, tx);
    }
  } else {
    logger.error(
      `The tx ${tx.hash} already exist in startUnstake records, skip`
    );
  }
};

const dealWithDoUnStake = async (receipt, tx) => {
  logger.info("New DoUnStake tx detected : ", tx.hash);
  const timestamp = (await web3.eth.getBlock(tx.blockNumber)).timestamp;
  const transaction = await sequelize.transaction();
  let instance = await DoUnStake.findByPk(tx.hash);
  if (!instance) {
    let DoUnstakeParams = decodeLog(
      "DoUnstake",
      receipt.data,
      receipt.topics.slice(1)
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(DoUnstakeParams);
    if (
      DoUnstakeParams.validator &&
      DoUnstakeParams.id &&
      DoUnstakeParams.to &&
      DoUnstakeParams.amount
    ) {
      logger.info("Creating new record of DoUnstake");
      try {
        await DoUnStake.create(
          {
            txHash: tx.hash,
            from: tx.from,
            validator: DoUnstakeParams.validator,
            id: DoUnstakeParams.id,
            to: DoUnstakeParams.to,
            amount: DoUnstakeParams.amount,
            timestamp: timestamp,
          },
          { transaction }
        );
        const unstake = await Unstake.findOne({
          where: { id: DoUnstakeParams.id },
          transaction,
        });
        if (unstake) {
          unstake.state = 1;
          unstake.amount = BigInt(DoUnstakeParams.amount);
          unstake.unstakedtimestamp = BigInt(timestamp);
          await unstake.save();
        }
        await transaction.commit();
      } catch (err) {
        logger.error(err);
        await transaction.rollback();
      }
    } else {
      logger.log("Illegal Stake record find", DoUnstakeParams, tx);
    }
  } else {
    logger.error(`The tx ${tx.hash} already exist in DoUnstake records, skip`);
  }
};

const _startAfterSync = async (callback) => {
  try {
    let isSyncing = await web3.eth.isSyncing();
    if (isSyncing) {
      logger.info(
        "Eth block syncing, currnet block",
        await web3.eth.getBlock("latest")
      );
      setTimeout(() => {
        _startAfterSync(callback);
      }, 60000);
    } else {
      callback();
    }
  } catch (ex) {
    logger.error("Error: Get ETH syncing status failed", ex);
    setTimeout(() => {
      _startAfterSync(callback);
    }, 60000);
  }
};

let _restartTimeout = null;
const RESTART_TIME_INTERVAL = 2 * 60 * 1000;
let lastTime = Number(new Date());

export const start = async () => {
  readState();
  _startAfterSync(async () => {
    web3.eth
      .subscribe("newBlockHeaders")
      .on("connected", (subscriptionId) => {
        logger.info("New block header subscribed", { subscriptionId });
      })
      .on("data", (blockheader) => {
        logger.info(
          "New block:",
          blockheader.number,
          "Gas used:",
          blockheader.gasUsed / blockheader.gasLimit,
          "+",
          Number(new Date()) - lastTime,
          "ms"
        );
        lastTime = Number(new Date());
      })
      .on("error", (err) => {
        logger.error("Error: newBlockHeaders", JSON.stringify(err, null, "  "));
      });

    web3.eth
      .subscribe("logs", {
        fromBlock: currentBlock,
        address: await getStakeManngerAddress(),
        topics: [config.gxchain2.topics.Stake],
      })
      .on("connected", (subscriptionId) => {
        logger.log("Log subscribed from block:", currentBlock, {
          subscriptionId,
        });
      })
      .on("data", (data) => {
        dealWithTopic(data);
      })
      .on("changed", function (changed) {
        logger.warn("changed", JSON.stringify(changed, null, "  "));
      })
      .on("error", function (err) {
        logger.error("Error: logs", JSON.stringify(err, null, "  "));
      });

    web3.eth
      .subscribe("logs", {
        fromBlock: currentBlock,
        address: await getStakeManngerAddress(),
        topics: [config.gxchain2.topics.StartUnstake],
      })
      .on("connected", (subscriptionId) => {
        logger.log("Log subscribed from block:", currentBlock, {
          subscriptionId,
        });
      })
      .on("data", (data) => {
        dealWithTopic(data);
      })
      .on("changed", function (changed) {
        logger.warn("changed", JSON.stringify(changed, null, "  "));
      })
      .on("error", function (err) {
        logger.error("Error: logs", JSON.stringify(err, null, "  "));
      });

    web3.eth
      .subscribe("logs", {
        fromBlock: currentBlock,
        address: await getStakeManngerAddress(),
        topics: [config.gxchain2.topics.DoUnstake],
      })
      .on("connected", (subscriptionId) => {
        logger.log("Log subscribed from block:", currentBlock, {
          subscriptionId,
        });
      })
      .on("data", (data) => {
        dealWithTopic(data);
      })
      .on("changed", function (changed) {
        logger.warn("changed", JSON.stringify(changed, null, "  "));
      })
      .on("error", function (err) {
        logger.error("Error: logs", JSON.stringify(err, null, "  "));
      });
  });
};