import {expect, use, util} from 'chai';
import {Contract, utils, BigNumber} from 'ethers';
import {loadFixture, deployContract, MockProvider, solidity} from 'ethereum-waffle';
import INTToken from '../build/INTToken.json'
import STBToken from '../build/STBToken.json'
import AMMContract from '../build/AMM.json'

use(solidity);

const INITIAL_X = utils.parseEther("100000")
const INITIAL_Y = utils.parseEther("500000")
const INITIAL_K = INITIAL_X.mul(INITIAL_Y)

const BOB_DEPOSIT_X = utils.parseEther("1.1")
const BOB_DEPOSIT_Y = utils.parseEther("5.5")

const NEGATOR = BigNumber.from("-1")

describe('AMMContract', () => {

    async function initializePoolFixture([alice, bob]:any, provider:any) {
        const tokenX = await deployContract(alice, INTToken, [utils.parseEther("1000000")]);
        const tokenY = await deployContract(alice, STBToken, [utils.parseEther("5000000")]);
        const contractAMM = await deployContract(alice, AMMContract, [tokenX.address, tokenY.address]);

        await tokenX.approve(contractAMM.address, INITIAL_X);
        await tokenY.approve(contractAMM.address, INITIAL_Y);

        await tokenX.transfer(bob.address,utils.parseEther("10"))
        await tokenY.transfer(bob.address,utils.parseEther("50"))
        await tokenX.connect(bob).approve(contractAMM.address, utils.parseEther("10"))
        await tokenY.connect(bob).approve(contractAMM.address, utils.parseEther("50"))

        await contractAMM.initializePool(INITIAL_X, INITIAL_Y);

        return{tokenX, tokenY, contractAMM, alice, bob};
    }
    

    describe('initializePool()', () => {

        it('shareOf is set correctly', async () => {
            const{alice, contractAMM} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.shareOf(alice.address))
            .to.be.equal(INITIAL_X.add(INITIAL_Y))
        })

        it('totalShares is set correctly', async () => {
            const{alice, contractAMM} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.totalShares())
            .to.be.equal(INITIAL_X.add(INITIAL_Y))
        })

        it('poolX is set correctly', async () => {
            const{contractAMM} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.poolX())
            .to.be.equal(INITIAL_X)
        })

        it('poolY is set correctly', async () => {
            const{contractAMM} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.poolY())
            .to.be.equal(INITIAL_Y)
        })

        it('k is set correctly', async () => {
            const{contractAMM} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.k())
            .to.be.equal(INITIAL_K)
        })

        it('Only owner can initialize pool', async() => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);

            await tokenX.connect(bob).approve(contractAMM.address, utils.parseEther('1'))
            await tokenY.connect(bob).approve(contractAMM.address, utils.parseEther('5'))

            await expect(contractAMM.connect(bob).initializePool(utils.parseEther('1'),utils.parseEther('5')))
            .to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('addLiquidity()', () => {
        it('transfers tokenX correctly', async () => {
            const{tokenX, contractAMM, bob} = await loadFixture(initializePoolFixture);
        
            await expect(() => contractAMM.connect(bob).addLiquidity(BOB_DEPOSIT_X, BOB_DEPOSIT_Y))
             .to.changeTokenBalances(tokenX,[bob, contractAMM],[BOB_DEPOSIT_X.mul(NEGATOR),BOB_DEPOSIT_X])     
        })

        it('transfers tokenY correctly', async () => {
            const{tokenY, contractAMM, bob} = await loadFixture(initializePoolFixture);
        
            await expect(() => contractAMM.connect(bob).addLiquidity(BOB_DEPOSIT_X, BOB_DEPOSIT_Y))
             .to.changeTokenBalances(tokenY,[bob, contractAMM],[BOB_DEPOSIT_Y.mul(NEGATOR),BOB_DEPOSIT_Y])     
        })

        it('emits AddLiquidity', async () => {
            const{contractAMM, bob} = await loadFixture(initializePoolFixture);

            await expect(contractAMM.connect(bob).addLiquidity(BOB_DEPOSIT_X, BOB_DEPOSIT_Y))
             .to.emit(contractAMM,'AddLiquidity')
             .withArgs(BOB_DEPOSIT_X,BOB_DEPOSIT_Y,bob.address)
        })

        it('emits UpdateShare', async () => {
            const{contractAMM, bob} = await loadFixture(initializePoolFixture);

            await expect(contractAMM.connect(bob).addLiquidity(BOB_DEPOSIT_X, BOB_DEPOSIT_Y))
             .to.emit(contractAMM,'UpdateShare')
             .withArgs(BOB_DEPOSIT_X.add(BOB_DEPOSIT_Y))
        })

        it('emits UpdatePoolParameters', async () => {
            const{contractAMM, bob} = await loadFixture(initializePoolFixture);

            const updatedX = INITIAL_X.add(BOB_DEPOSIT_X)
            const updatedY = INITIAL_Y.add(BOB_DEPOSIT_Y)
            const updatedK = updatedX.mul(updatedY)

            await expect(contractAMM.connect(bob).addLiquidity(BOB_DEPOSIT_X, BOB_DEPOSIT_Y))
             .to.emit(contractAMM,'UpdatePoolParameters')
             .withArgs(updatedX, updatedY, updatedK)
        })

        it('reverts when ratio is incorrect', async () => {
            const{contractAMM, bob} = await loadFixture(initializePoolFixture);

            const wrongDepositX = utils.parseEther("1")
            const wrongDeposity = utils.parseEther("1")

            await expect(contractAMM.connect(bob).addLiquidity(wrongDepositX, wrongDeposity))
             .to.be.revertedWith("Ratio of your deposits is not correct")
        })
    })

    describe('removeLiquidity()', () => {
        it('removes liquidity correctly', async () => {
            const{tokenX, contractAMM, alice} = await loadFixture(initializePoolFixture);
           
            await expect(() => contractAMM.removeLiquidity(utils.parseEther("300000")))
             .to.changeTokenBalance(tokenX, alice, utils.parseEther("50000"))
        })
        
        it('emits RemoveLiquidity', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
           
            await expect(contractAMM.removeLiquidity(utils.parseEther("300000")))
             .to.emit(contractAMM,'RemoveLiquidity')
             .withArgs(utils.parseEther("50000"),utils.parseEther("250000"), alice.address)
        })

        it('reverts when share is insuffiecient', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
           
            await expect(contractAMM.removeLiquidity(utils.parseEther("3000000")))
             .to.be.revertedWith("This address does not own that much share")
        })
    })

    describe('buyX()', () => {
        it('Buys x correctly', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
    
            await tokenY.connect(bob).approve(contractAMM.address, utils.parseEther('5'))
    
            let contractBalance = BigNumber.from("-989990100098999010")
            let bobBalance = BigNumber.from("989990100098999010")
    
            await expect (() => contractAMM.connect(bob).buyX(utils.parseEther('5')))
             .to.changeTokenBalances(tokenX, [contractAMM, bob],[contractBalance, bobBalance])
        })

        it('emits BuyX', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
    
            await tokenY.connect(bob).approve(contractAMM.address, utils.parseEther('5'))
    
            let bobBalance = BigNumber.from("989990100098999010")
    
            await expect (contractAMM.connect(bob).buyX(utils.parseEther('5')))
             .to.emit(contractAMM,"BuyX")
             .withArgs(bobBalance, utils.parseEther('5'), bob.address)
        })
    })

    describe('buyY()', () => {
        it('Buys y correctly', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
    
            await tokenX.connect(bob).approve(contractAMM.address, utils.parseEther('1'))
    
            let contractBalance = BigNumber.from("-4949950500494995050")
            let bobBalance = BigNumber.from("4949950500494995050")
    
            await expect (() => contractAMM.connect(bob).buyY(utils.parseEther('1')))
            .to.changeTokenBalances(tokenY, [contractAMM, bob],[contractBalance, bobBalance])
    
        })

        it('emits BuyY', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
    
            await tokenY.connect(bob).approve(contractAMM.address, utils.parseEther('5'))
    
            let bobBalance = BigNumber.from("4949950500494995050")
    
            await expect (contractAMM.connect(bob).buyY(utils.parseEther('1')))
             .to.emit(contractAMM,"BuyY")
             .withArgs(utils.parseEther('1'), bobBalance, bob.address)
        })
    })

    describe('additional calculations', () => {
        it('Calculates addLiquidityX correctly', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.calculateAddLiquidityYhowMuchX(utils.parseEther("5.5")))
             .to.equal(BigNumber.from("1100000000000000000"))
        })
    
        it('Calculates addLiquidityY correctly', async () => {
            const{tokenX, tokenY, contractAMM, alice, bob} = await loadFixture(initializePoolFixture);
            expect(await contractAMM.calculateAddLiquidityXhowMuchY(utils.parseEther("1.1")))
             .to.equal(BigNumber.from("5500000000000000000"))
        })
    })



    

    

    // const logi = async () => {
    //     let x = await contractAMM.x();
    //     let y = await contractAMM.y();
    //     let k = await contractAMM.k();

    //     console.log(`x = ${x.toString()}`)
    //     console.log(`y = ${y.toString()}`)
    //     console.log(`k = ${k.toString()}`)
    
    // }
});

