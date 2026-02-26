// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/CreditAggregator.sol";

contract DeployCreditAggregator is Script {

    address constant USC =
        0x1c849378D3D054CE049A3adf9f93161a433A3ee0;

    function run() external {

        vm.startBroadcast();

        uint64[] memory supportedChains = new uint64[](1);
        supportedChains[0] = 1; 

        new CreditAggregator(USC, supportedChains);

        vm.stopBroadcast();
    }
}