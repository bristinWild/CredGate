// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.24;

// import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/utils/math/Math.sol";

// contract CredGateVault is ERC4626, AccessControl, ReentrancyGuard {

//     using Math for uint256;

//     bytes32 public constant LOAN_MANAGER_ROLE = keccak256("LOAN_MANAGER_ROLE");

  
//     // Liquidity Accounting
   

//     uint256 public totalLocked;
//     mapping(uint256 => uint256) public loanLockedAmount;

   
//     // Withdrawal Queue
   

//     struct WithdrawalRequest {
//         address owner;
//         uint256 shares;
//         uint256 assets;
//         bool fulfilled;
//     }

//     uint256 public nextRequestId;
//     mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
//     mapping(address => uint256[]) public userRequests;

    
//     // Events 
   

//     event LiquidityLocked(uint256 indexed loanId, uint256 amount);
//     event LiquidityUnlocked(uint256 indexed loanId, uint256 amount);
//     event WithdrawalRequested(uint256 indexed requestId, address indexed owner, uint256 shares, uint256 assets);
//     event WithdrawalFulfilled(uint256 indexed requestId);

//     constructor(
//         IERC20 asset_,
//         string memory name_,
//         string memory symbol_
//     )
//         ERC20(name_, symbol_)
//         ERC4626(asset_)
//     {
//         _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
//     }

    
//     // Liquidity Controls

//     function availableLiquidity() public view returns (uint256) {
//         return totalAssets() - totalLocked;
//     }

//     function lockLiquidity(uint256 loanId, uint256 amount)
//         external
//         onlyRole(LOAN_MANAGER_ROLE)
//         nonReentrant
//     {
//         require(amount <= availableLiquidity(), "Insufficient liquidity");

//         totalLocked += amount;
//         loanLockedAmount[loanId] += amount;

//         emit LiquidityLocked(loanId, amount);
//     }

//     function unlockLiquidity(uint256 loanId, uint256 amount)
//         external
//         onlyRole(LOAN_MANAGER_ROLE)
//         nonReentrant
//     {
//         require(loanLockedAmount[loanId] >= amount, "Invalid unlock amount");

//         totalLocked -= amount;
//         loanLockedAmount[loanId] -= amount;

//         emit LiquidityUnlocked(loanId, amount);
//     }

//     // Deposit Logic (Standard)
   

//     function deposit(uint256 assets, address receiver)
//         public
//         override
//         nonReentrant
//         returns (uint256)
//     {
//         return super.deposit(assets, receiver);
//     }

//     function mint(uint256 shares, address receiver)
//         public
//         override
//         nonReentrant
//         returns (uint256)
//     {
//         return super.mint(shares, receiver);
//     }

   
//     // Async Withdraw Logic 
    

//     function withdraw(uint256 assets, address receiver, address owner)
//         public
//         override
//         nonReentrant
//         returns (uint256)
//     {
//         uint256 shares = previewWithdraw(assets);

//         if (assets <= availableLiquidity()) {
//             return super.withdraw(assets, receiver, owner);
//         }

//         // Async path
//         _createWithdrawalRequest(owner, shares, assets);
//         return shares;
//     }

//     function redeem(uint256 shares, address receiver, address owner)
//         public
//         override
//         nonReentrant
//         returns (uint256)
//     {
//         uint256 assets = previewRedeem(shares);

//         if (assets <= availableLiquidity()) {
//             return super.redeem(shares, receiver, owner);
//         }

//         _createWithdrawalRequest(owner, shares, assets);
//         return assets;
//     }

//     function _createWithdrawalRequest(
//         address owner,
//         uint256 shares,
//         uint256 assets
//     ) internal {

//         require(balanceOf(owner) >= shares, "Insufficient shares");

//         _transfer(owner, address(this), shares);

//         uint256 requestId = nextRequestId++;

//         withdrawalRequests[requestId] = WithdrawalRequest({
//             owner: owner,
//             shares: shares,
//             assets: assets,
//             fulfilled: false
//         });

//         userRequests[owner].push(requestId);

//         emit WithdrawalRequested(requestId, owner, shares, assets);
//     }

//     function fulfillWithdrawal(uint256 requestId)
//         external
//         nonReentrant
//     {
//         WithdrawalRequest storage request = withdrawalRequests[requestId];

//         require(!request.fulfilled, "Already fulfilled");
//         require(request.assets <= availableLiquidity(), "Still locked");

//         request.fulfilled = true;

//         _burn(address(this), request.shares);
//         IERC20(asset()).transfer(request.owner, request.assets);

//         emit WithdrawalFulfilled(requestId);
//     }


//     function setLoanManager(address loanManager)
//         external
//         onlyRole(DEFAULT_ADMIN_ROLE)
//     {
//         _grantRole(LOAN_MANAGER_ROLE, loanManager);
//     }
// }