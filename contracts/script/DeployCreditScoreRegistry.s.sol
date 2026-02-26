// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/CreditScoreRegistry.sol";

contract DeployCreditScoreRegistry is Script {
    function run() external {
        vm.startBroadcast();

        address scorer = msg.sender;

        new CreditScoreRegistry(scorer);

        vm.stopBroadcast();
    }
}