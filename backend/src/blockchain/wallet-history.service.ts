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

        const history = await this.getFullHistory(address);

        let walletAgeBlocks: number | null = null;

        if (history.firstTxBlock) {
            walletAgeBlocks = currentBlock - Number(history.firstTxBlock);
        }

        return {
            address,
            ethBalance: ethers.formatEther(balance),
            txCount,
            walletAgeBlocks,
        };
    }

    async getFullHistory(address: string) {
        const url = `https://api.etherscan.io/v2/api`;

        const response = await axios.get(url, {
            params: {
                chainid: 1,
                module: 'account',
                action: 'txlist',
                address,
                startblock: 0,
                endblock: 99999999,
                sort: 'asc',
                apikey: process.env.ETHERSCAN_API_KEY,
            },
        });

        console.log("Etherscan txlist response:", response.data);

        if (!response.data || response.data.status !== '1') {
            console.warn('Etherscan returned no tx data for', address);
            return {
                firstTxBlock: null,
                transactions: [],
            };
        }

        const txs = response.data.result;

        if (!txs || txs.length === 0) {
            return {
                firstTxBlock: null,
                transactions: [],
            };
        }

        return {
            firstTxBlock: Number(txs[0].blockNumber),
            transactions: txs,
        };
    }

    async getTokenTransfers(address: string) {
        const url = `https://api.etherscan.io/v2/api`;

        const response = await axios.get(url, {
            params: {
                module: 'account',
                action: 'tokentx',
                address,
                startblock: 0,
                endblock: 99999999,
                sort: 'asc',
                apikey: process.env.ETHERSCAN_API_KEY,
                chainid: 1,
            },
        });

        console.log("Etherscan tokentx response:", response.data);

        if (!response.data || response.data.status !== '1') {
            console.log("Etherscan returned no token tx data for", address);
            return [];
        }

        return response.data.result;
    }

    async getWalletAgeInBlocks(address: string) {
        const history = await this.getFullHistory(address);

        if (!history.firstTxBlock) return null;

        const provider = this.providerService.getProvider();
        const currentBlock = await provider.getBlockNumber();

        return currentBlock - Number(history.firstTxBlock);
    }
}