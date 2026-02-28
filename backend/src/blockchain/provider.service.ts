import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class ProviderService {
    private provider: ethers.JsonRpcProvider;

    constructor() {
        const rpcUrl = process.env.MAINNET_RPC_URL;

        if (!rpcUrl) {
            throw new Error('SEPOLIA_RPC_URL is not defined');
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    getProvider() {
        return this.provider;
    }
}