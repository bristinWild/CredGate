import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
    mainnetProvider: ethers.JsonRpcProvider;
    testnetProvider: ethers.JsonRpcProvider;

    constructor() {
        this.mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC);
        this.testnetProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    }

    getMainnetProvider(): ethers.JsonRpcProvider {
        return this.mainnetProvider;
    }

    getSepoliaProvider(): ethers.JsonRpcProvider {
        return this.testnetProvider;
    }

}
