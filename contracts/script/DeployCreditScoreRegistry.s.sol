// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CreditScoreRegistry.sol";

contract DeployCreditScoreRegistry is Script {

    function run() external {

        address scorer = vm.envOr("SCORER_ADDRESS", msg.sender);

        vm.startBroadcast(); 

        CreditScoreRegistry registry = new CreditScoreRegistry(scorer);

        vm.stopBroadcast();

        console.log("Deployed at:", address(registry));
    }
}