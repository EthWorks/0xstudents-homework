// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract AMM is Ownable {

    ERC20 public tokenX; 
    ERC20 public tokenY;
    
    uint public k; 
    uint public poolX; 
    uint public poolY; 

    mapping (address=>uint) public shareOf;
    uint public totalShares;

    uint constant public RATIO_PRECISION = 2;
    uint constant public SHARE_PRECISION = 20;
   
    constructor(ERC20 _tokenX, ERC20 _tokenY) {
        tokenX = _tokenX;
        tokenY = _tokenY;
    }
    
    function initializePool(uint _valueX, uint _valueY) public onlyOwner{
        require(tokenX.allowance(msg.sender, address(this)) >= _valueX, "Allowance for tokenX is too low");
        require(tokenY.allowance(msg.sender, address(this)) >= _valueY, "Allowance for tokenY is too low");

        require(k == 0, "The pool has been initialized already");

        tokenX.transferFrom(msg.sender, address(this), _valueX);   
        tokenY.transferFrom(msg.sender, address(this), _valueY);

        shareOf[msg.sender] = _valueX + _valueY;
        totalShares = _valueX + _valueY;
        
        poolX = _valueX;
        poolY = _valueY;
        k = poolX * poolY;

        emit InitializePool(tokenX.symbol(), tokenY.symbol(), poolX, poolY, k, shareOf[msg.sender]);
    }

    function addLiquidity(uint _valueX, uint _valueY) public isPoolCreated { 
        require(tokenX.allowance(msg.sender, address(this)) >= _valueX,"Allowance for tokenX is too low");
        require(tokenY.allowance(msg.sender, address(this)) >= _valueY,"Allowance for tokenY is too low");

        require(checkRatio(_valueX, _valueY), "Ratio of your deposits is not correct");
        
        tokenX.transferFrom(msg.sender, address(this), _valueX);   
        tokenY.transferFrom(msg.sender, address(this), _valueY);
        emit AddLiquidity(_valueX, _valueY, msg.sender);

        uint addedShare = _valueX + _valueY;
        shareOf[msg.sender] += addedShare;
        totalShares += addedShare;
        emit UpdateShare(shareOf[msg.sender]);

        poolX = poolX + _valueX;
        poolY = poolY + _valueY;
        k = poolX * poolY;
        emit UpdatePoolParameters(poolX, poolY, k);
    }

    function removeLiquidity(uint _share) public isPoolCreated { 
        require(_share <= shareOf[msg.sender],"This address does not own that much share");
        
        uint sharesPercentage = percent(_share, totalShares, SHARE_PRECISION);
        
        uint valueX = poolX * sharesPercentage / 10**(SHARE_PRECISION); 
        uint valueY = poolY * sharesPercentage / 10**(SHARE_PRECISION); 

        tokenX.transfer(msg.sender, valueX);
        tokenY.transfer(msg.sender, valueY);
        emit RemoveLiquidity(valueX, valueY, msg.sender);

        uint removedShare = (totalShares * sharesPercentage ) / (10**(SHARE_PRECISION));
        shareOf[msg.sender] -= removedShare;
        totalShares -= removedShare;
        emit UpdateShare(shareOf[msg.sender]);

        poolX = poolX - valueX;
        poolY = poolY - valueY;
        k = poolX * poolY;
        emit UpdatePoolParameters(poolX, poolY, k);
    }

    function buyX(uint _valueY) public isPoolCreated {
        require(tokenY.allowance(msg.sender, address(this)) >= _valueY, "Allowance is too low");

        uint valueX = calculateValueX(_valueY);
        
        tokenX.transfer(msg.sender,valueX);
        tokenY.transferFrom(msg.sender, address(this), _valueY);
        emit BuyX(valueX, _valueY, msg.sender);        
        
        poolX = poolX - valueX;
        poolY = poolY + _valueY;
        k = poolX * poolY;
        emit UpdatePoolParameters(poolX, poolY, k);
    }
    
    function buyY(uint _valueX) public isPoolCreated { 
        require(tokenX.allowance(msg.sender, address(this)) >= _valueX, "Allowance is too low");
        
        uint valueY = calculateValueY(_valueX);

        tokenX.transferFrom(msg.sender, address(this), _valueX);
        tokenY.transfer(msg.sender,valueY);
        emit BuyY(_valueX, valueY, msg.sender);

        poolX = poolX + _valueX;
        poolY = poolY -  valueY;
        k = poolX * poolY;
        emit UpdatePoolParameters(poolX, poolY, k);
    }

    function checkPoolShare(address _caller) public view isPoolCreated returns (uint) {
        uint sharesPercentage = percent(shareOf[_caller], totalShares, SHARE_PRECISION); //change name percantegee of what
        
        return k * sharesPercentage / 10**(SHARE_PRECISION); 
    }

    function checkRatio(uint _x, uint _y) public view isPoolCreated returns (bool) {
        uint userRatio = percent(_y, _x, RATIO_PRECISION);
        uint stateRatio = percent(poolY, poolX, RATIO_PRECISION); 

        uint deltaRatio;
        if(userRatio >= stateRatio) {
            deltaRatio = userRatio - stateRatio;
        } else {
            deltaRatio = stateRatio - userRatio;
        }

        uint tolerancePercentage = 1;

        uint tolerancePercentageWithPrecision = tolerancePercentage * 10 **(RATIO_PRECISION-2);

        if(deltaRatio <= tolerancePercentageWithPrecision) {
            return true;
        } else {
            return false;
        }
        
    }

    function calculateAddLiquidityYhowMuchX(uint _valueY) public view returns (uint){ 
        uint stateRatio = percent(poolY, poolX, RATIO_PRECISION);

        return percent(_valueY, stateRatio, RATIO_PRECISION); 
    }

    function calculateAddLiquidityXhowMuchY(uint _valueX) public view returns (uint){ 
        uint stateRatio = percent(poolX, poolY, RATIO_PRECISION);

        return percent(_valueX, stateRatio, RATIO_PRECISION);
    }

    function calculateValueX(uint _valueY) public view isPoolCreated returns (uint){ 
        uint valueX = poolX - (k / (poolY + _valueY) ); 

        uint valueXafterFees = (valueX * 99) / 100; 

        return valueXafterFees;
    }

    function calculateValueY(uint _valueX) public view isPoolCreated returns (uint) { 
        uint valueY = poolY - ( k / ( poolX + _valueX) ); 

        uint valueYafterFees = (valueY * 99) / 100; 
        
        return valueYafterFees;
    }
    

    function getSymbolX() public view isPoolCreated returns (string memory) { 
        return tokenX.symbol();
    }

    function getSymbolY() public view isPoolCreated returns (string memory) { 
        return tokenY.symbol();
    }
    
    modifier isPoolCreated {
        require(k != 0, "Pool has not been created yet");
        _;
    }

    function percent(uint numerator, uint denominator, uint precision) private pure returns(uint) {
            uint _numerator  = numerator * 10 ** (precision);
  
            return  ( _numerator / denominator );
            // eg. (3,2,2) = (3*1000) / 2 = 3000 / 2 = 1500
    }

    event InitializePool(string getSymbolX, string getSymbolY, uint poolX, uint poolY, uint k, uint share);

    event AddLiquidity(uint valueX, uint valueY, address provider);
    event RemoveLiquidity(uint valueX, uint valueY, address provider);

    event BuyX(uint valueX, uint valueY, address buyer);
    event BuyY(uint valueX, uint valueY, address buyer);

    event UpdateShare(uint updatedShare);
    event UpdatePoolParameters(uint poolX, uint poolY, uint k);
}

