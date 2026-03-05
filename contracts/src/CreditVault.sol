// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICreditAggregator {
    function getGlobalScore(address user) external view returns (uint256);
}

contract CreditVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    ICreditAggregator public immutable aggregator;

    // 10% APR
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

    event Borrowed(address indexed user, uint256 amount, uint256 score, uint256 creditLine);
    event Repaid(address indexed user, uint256 principalPaid, uint256 interestPaid);

    constructor(IERC20 _asset, address _aggregator)
        ERC4626(_asset)
        ERC20("CredGate Vault USD", "cvUSDC")
        Ownable(msg.sender)
    {
        aggregator = ICreditAggregator(_aggregator);
    }



    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalBorrowed;
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        uint256 vaultCash = IERC20(asset()).balanceOf(address(this));
        uint256 maxSharesFromCash = previewDeposit(vaultCash);
        uint256 ownerShares = balanceOf(owner);

        return ownerShares < maxSharesFromCash
            ? ownerShares
            : maxSharesFromCash;
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

        require(amount > 0, "invalid amount");

        uint256 available = availableToBorrow(msg.sender);
        require(amount <= available, "exceeds credit line");

        uint256 liquidity = IERC20(asset()).balanceOf(address(this));
        require(liquidity >= amount, "insufficient vault liquidity");

        Loan storage loan = loans[msg.sender];

        if (loan.active) {
            loan.interestDebt += _pendingInterest(loan);
        }

        loan.principal += amount;
        loan.lastAccrued = block.timestamp;
        loan.active = true;

        totalBorrowed += amount;

        emit Borrowed(
            msg.sender,
            amount,
            aggregator.getGlobalScore(msg.sender),
            getCreditLine(msg.sender)
        );

        IERC20(asset()).safeTransfer(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                            REPAY
    //////////////////////////////////////////////////////////////*/

    function repay(uint256 amount) external {

        require(amount > 0, "invalid amount");

        Loan storage loan = loans[msg.sender];
        require(loan.active, "no active loan");

        uint256 interest = loan.interestDebt + _pendingInterest(loan);

        loan.interestDebt = 0;
        loan.lastAccrued = block.timestamp;

        uint256 totalOwed = loan.principal + interest;

        uint256 paying = amount > totalOwed ? totalOwed : amount;

        uint256 interestPaid;
        uint256 principalPaid;

        if (paying >= interest) {
            interestPaid = interest;
            principalPaid = paying - interest;
        } else {
            interestPaid = paying;
            principalPaid = 0;
        }

        loan.principal -= principalPaid;
        totalBorrowed -= principalPaid;

        if (loan.principal == 0) {
            loan.active = false;
        }

        emit Repaid(msg.sender, principalPaid, interestPaid);

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), paying);
    }

  

    function getOutstanding(address user)
        external
        view
        returns (uint256 principal, uint256 interest, uint256 total)
    {
        Loan storage loan = loans[user];

        if (!loan.active) return (0, 0, 0);

        interest = loan.interestDebt + _pendingInterest(loan);
        principal = loan.principal;
        total = principal + interest;
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

