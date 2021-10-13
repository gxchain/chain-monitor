staking-monitor APi
-----------------
### Unstake

获取投票人和其信息

```sh
curl 'http://127.0.0.1:3031/api/Unstake?to=0x70997970C51812dc3A010C7d01b50e0d17dc79C8&validator=0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199&offset=2&limit=2' | json_pp
```

参数信息:
```
 to  // 接收人地址
 validator // 验证者地址
 offset    // 查询起始
 limit     // 一次查询个数
```

返回信息：
```json
{
   "result" : [
      {
         "to" : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
         "txHash" : "0x4b2c2abdb8f4f69a858c9e39080c6c1592304026ac4eed7f759bb127b0910038",
         "id" : 2,
         "value" : 410,
         "createdAt" : "2021-10-12T10:02:00.000Z",
         "updatedAt" : "2021-10-12T10:02:00.000Z",
         "validator" : "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
         "timestamp" : 1634032886,
         "from" : "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
         "state" : 0,
         "unstakeShares" : 410,
         "unstakedtimestamp" : null,
         "amount" : null
      },
      {
         "createdAt" : "2021-10-12T08:32:29.000Z",
         "value" : 300,
         "updatedAt" : "2021-10-12T08:32:29.000Z",
         "timestamp" : 1634011004,
         "validator" : "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
         "txHash" : "0x5e25b289d3af5540ce3f645166ef726103936a0a7cfaf3099daaf64f0cf6f032",
         "to" : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
         "id" : 0,
         "state" : 1,
         "unstakeShares" : 300,
         "unstakedtimestamp" : 1634011339,
         "amount" : 300,
         "from" : "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      }
   ]
}
```
- result:所有记录的数组
- to :接受者地址
- txHash :发起StartUnstake的交易哈希
- id : unstake的id
- value: 期望取回的gxc数量
- validator:验证者地址
- timestamp:发起开始取回的时间戳
- from: 发起者
- state: 取回状态，1代表已取回，0代表未取回
- unstakeShares:销毁的shares数量 
- amount:实际取回的gxc数量，未取回时为null
- unstakedtimestamp:取回gxc的时间戳