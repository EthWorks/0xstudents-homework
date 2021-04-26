# 0xstudents-homework
yarn build && yarn test


## AMM Contract
Automated Market Maker smart contract used to exchange tokens or provide liquidity. 
- Contract creator sets pair of tokens (X & Y) which will be exchanged in the **constructor**
- Contract creator **initializes pool** prioviding with two token amounts 
- Any address can **add liquidty** as long as ratio of X to Y is in ~1% range of current ratio
- Pool shareholder can **remove liquidity** by providing sum of tokens X and Y which it wants to withdraw (they will be withdrawn in a current ratio)
- Any address can **buy token X** if it provides sufficient Y amount
- Any address can **buy token Y** if it provides sufficient X amount
- Any address can check current **price estimation** and **liquidty estimation**

### API

`constructor(ERC20 _tokenX, ERC20 _tokenY)` 

`initializePool(uint _valueX, uint _valueY)`

`addLiquidity(uint _valueX, uint _valueY)`

`removeLiquidity(uint _share)`

`buyX(uint _valueY)`

`buyY(uint _valueX)`

`calculateValueX`

`calculateValueY`

`calculateAddLiquidityYhowMuchX`

`calculateAddLiquidityXhowMuchY`

## TODO
- [ ] Create LP token instead of share mechanism
- [ ] Handle edge cases, what happens when the pool is running dry
- [ ] Mechanism to delete a pool
- [ ] More tests
- [ ] Deployement on testnet
- [ ] Front-end to interact with the contract
- [ ] Arbitrage mechanisms
