import { Injectable } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ethers } from 'ethers';
import axios from 'axios';

@Injectable()
export class WalletHistoryService {
    constructor(private providerService: ProviderService) { }

    async getBasicWalletData(address: string) {
        const provider = this.providerService.getProvider();

        const [balance, txCount, currentBlock] = await Promise.all([
            provider.getBalance(address),
            provider.getTransactionCount(address),
            provider.getBlockNumber(),
        ]);

        return {
            address,
            ethBalance: ethers.formatEther(balance),
            txCount,
            currentBlock,
        };
    }

    async getWalletAgeInBlocks(address: string) {
        const provider = this.providerService.getProvider();
        const currentBlock = await provider.getBlockNumber();

        // Check last 5M blocks
        const scanStart = currentBlock - 5_000_000;

        for (let i = scanStart; i <= currentBlock; i += 50_000) {
            const txCount = await provider.getTransactionCount(address, i);
            if (txCount > 0) {
                return currentBlock - i;
            }
        }

        return null;
    }

    async getFullHistory(address: string) {
        const url = `https://api.etherscan.io/api`;

        const response = await axios.get(url, {
            params: {
                module: 'account',
                action: 'txlist',
                address,
                startblock: 0,
                endblock: 99999999,
                sort: 'asc',
                apikey: process.env.ETHERSCAN_API_KEY,
            },
        });

        const txs = response.data.result;

        if (!txs || txs.length === 0) {
            return {
                firstTxBlock: null,
                transactions: [],
            };
        }

        return {
            firstTxBlock: txs[0].blockNumber,
            transactions: txs,
        };
    }
}