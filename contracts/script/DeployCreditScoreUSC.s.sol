// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/CreditScoreUSC.sol";

contract DeployCreditScoreUSC is Script {
      function run() external {
        vm.startBroadcast();

        CreditScoreUSC usc = new CreditScoreUSC();

        vm.stopBroadcast();
    }
}