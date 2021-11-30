import { Model, DataTypes } from "sequelize";
import sequelize from "../db/db";
export class Unstake extends Model {}

export declare interface Unstake {
  txHash: string;
  id: number;
  from: string;
  validator: string;
  value: bigint;
  to: string;
  unstakeShares: bigint;
  timestamp: bigint;
  amount: bigint;
  state: number;
  unstakedtimestamp: bigint;
}

Unstake.init(
  {
    txHash: {
      type: DataTypes.STRING,
      primaryKey: true,
      comment: "Transaction hash",
    },
    id: {
      type: DataTypes.INTEGER,
      comment: "Unique unstake id",
    },
    from: {
      type: DataTypes.STRING,
      comment: "from address",
    },
    validator: {
      type: DataTypes.STRING,
      comment: "validator address",
    },
    value: {
      type: DataTypes.BIGINT({ length: 80, unsigned: true }),
      comment: "stake value",
    },
    to: {
      type: DataTypes.STRING,
      comment: "to address",
    },
    unstakeShares: {
      type: DataTypes.BIGINT({ length: 80, unsigned: true }),
      comment: "Number of unstake shares to be burned",
    },
    timestamp: {
      type: DataTypes.BIGINT,
      comment: "timestamp",
    },
    amount: {
      type: DataTypes.BIGINT({ length: 80, unsigned: true }),
      comment: "GXC amount",
    },
    state: {
      type: DataTypes.INTEGER,
      comment: "unstake state , 1 represent unstaked, 0 represent not",
    },
    unstakedtimestamp: {
      type: DataTypes.BIGINT,
    },
  },
  {
    sequelize,
    tableName: "unstake",
  }
);

export default Unstake;
