// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICreditAggregator {
    function getGlobalScore(address user) external view returns (uint256);
}

contract CreditVault is ERC4626, Ownable {

    ICreditAggregator public immutable aggregator;

    // 10% APR linear interest
    // 0.1 / 31536000 seconds * 1e18 = 3170979198
    uint256 public constant INTEREST_RATE_PER_SECOND = 3170979198;
    uint256 public constant SCALE = 1e18;

    struct Loan {
        uint256 principal;
        uint256 interestDebt;   
        uint256 lastAccrued;    
        bool active;
    }

    mapping(address => Loan) public loans;

    uint256 public totalBorrowed;
    uint256 public totalInterestAccrued;

    event Borrowed(address indexed user, uint256 amount, uint256 score, uint256 creditLine);
    event Repaid(address indexed user, uint256 principal, uint256 interest);

    constructor(IERC20 _usdc, address _aggregator)
        ERC4626(_usdc)
        ERC20("Credit Vault USDC", "cvUSDC")
        Ownable(msg.sender)
    {
        aggregator = ICreditAggregator(_aggregator);
    }

 
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this))
            + totalBorrowed
            + totalInterestAccrued;
    }

    
    function maxRedeem(address owner) public view override returns (uint256) {
        uint256 vaultCash = IERC20(asset()).balanceOf(address(this));
        // Convert available cash to shares
        uint256 maxSharesFromCash = previewDeposit(vaultCash);
        uint256 ownerShares = balanceOf(owner);
        return ownerShares < maxSharesFromCash ? ownerShares : maxSharesFromCash;
    }

  
   
    function getCreditLine(address user) public view returns (uint256) {
        uint256 score = aggregator.getGlobalScore(user);
        if (score >= 75) return 1000 * 1e6;
        if (score >= 60) return 500  * 1e6;
        if (score >= 45) return 200  * 1e6;
        return 0;
    }

    function availableToBorrow(address user) public view returns (uint256) {
        uint256 line = getCreditLine(user);
        if (line == 0) return 0;
        Loan storage loan = loans[user];
        if (!loan.active) return line;
        uint256 outstanding = loan.principal + _pendingInterest(loan);
        if (outstanding >= line) return 0;
        return line - outstanding;
    }

 
    function borrow(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(availableToBorrow(msg.sender) >= amount, "Exceeds credit line");
        require(
            IERC20(asset()).balanceOf(address(this)) >= amount,
            "Insufficient liquidity"
        );

        Loan storage loan = loans[msg.sender];

        if (loan.active) {
            loan.interestDebt += _pendingInterest(loan);
        }

        loan.principal   += amount;
        loan.lastAccrued  = block.timestamp;
        loan.active       = true;

        totalBorrowed += amount;

        emit Borrowed(
            msg.sender,
            amount,
            aggregator.getGlobalScore(msg.sender),
            getCreditLine(msg.sender)
        );

      
        SafeERC20.safeTransfer(IERC20(asset()), msg.sender, amount);
    }

 
    function repay(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active loan");

  
        uint256 interest  = loan.interestDebt + _pendingInterest(loan);
        loan.interestDebt = 0;
        loan.lastAccrued  = block.timestamp;

        uint256 totalOwed = loan.principal + interest;
        uint256 paying    = amount > totalOwed ? totalOwed : amount;

        uint256 interestPaid;
        uint256 principalPaid;

        if (paying >= interest) {
            interestPaid  = interest;
            principalPaid = paying - interest;
        } else {
            interestPaid  = paying;
            principalPaid = 0;
        }

        loan.principal -= principalPaid;
        totalBorrowed  -= principalPaid;

        // Interest flows back into vault, boosting totalAssets()
        // which makes existing cvUSDC shares worth more
        totalInterestAccrued = totalInterestAccrued > interestPaid
            ? totalInterestAccrued - interestPaid
            : 0;

        if (loan.principal == 0) {
            loan.active = false;
        }

        emit Repaid(msg.sender, principalPaid, interestPaid);

        SafeERC20.safeTransferFrom(IERC20(asset()), msg.sender, address(this), paying);
    }


    function getOutstanding(address user)
        external
        view
        returns (uint256 principal, uint256 interest, uint256 total)
    {
        Loan storage loan = loans[user];
        if (!loan.active) return (0, 0, 0);
        interest  = loan.interestDebt + _pendingInterest(loan);
        principal = loan.principal;
        total     = principal + interest;
    }


    function _pendingInterest(Loan storage loan)
        internal
        view
        returns (uint256)
    {
        if (!loan.active || loan.principal == 0) return 0;
        uint256 elapsed = block.timestamp - loan.lastAccrued;
        return (loan.principal * INTEREST_RATE_PER_SECOND * elapsed) / SCALE;
    }
}