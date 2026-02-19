import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Injectable()
export class WalletService {
    private readonly provider: ethers.JsonRpcProvider;

    private readonly AAVE_POOL =
        '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

    private readonly iface = new ethers.Interface([
        'event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 referralCode)',
        'event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)',
        'event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)',
    ]);

    constructor(private readonly blockchainService: BlockchainService) {
        this.provider = this.blockchainService.getMainnetProvider();
    }

    async getWalletAnalytics(wallet: string) {
        const normalized = wallet.toLowerCase();

        const [age, generalActivity, aaveActivity] = await Promise.all([
            this.getWalletAge(normalized),
            this.getGeneralActivity(normalized),
            this.getAaveActivity(normalized),
        ]);

        return {
            wallet: normalized,
            age,
            generalActivity,
            aaveActivity,
        };
    }

    async getWalletAge(wallet: string) {
        const latestBlock = await this.provider.getBlockNumber();
        const txCount = await this.provider.getTransactionCount(wallet);

        if (txCount === 0) {
            return {
                firstTxTimestamp: null,
                walletAgeDays: 0,
            };
        }

        const searchWindow = 200_000;
        const fromBlock = Math.max(latestBlock - searchWindow, 0);

        for (let i = fromBlock; i <= latestBlock; i++) {
            const block = await this.provider.getBlock(i);
            if (!block) continue;

            for (const txHash of block.transactions) {
                const tx = await this.provider.getTransaction(txHash);
                if (!tx) continue;

                if (
                    tx.from?.toLowerCase() === wallet ||
                    tx.to?.toLowerCase() === wallet
                ) {
                    const firstTimestamp = block.timestamp;
                    const ageSeconds =
                        Date.now() / 1000 - firstTimestamp;

                    return {
                        firstTxTimestamp: firstTimestamp,
                        walletAgeDays: Math.floor(ageSeconds / 86400),
                    };
                }
            }
        }

        return {
            firstTxTimestamp: null,
            walletAgeDays: null,
        };
    }


    async getGeneralActivity(wallet: string) {
        const txCount = await this.provider.getTransactionCount(wallet);
        const balance = await this.provider.getBalance(wallet);

        return {
            txCount,
            balance: ethers.formatEther(balance),
        };
    }


    async getAaveActivity(wallet: string) {
        const latestBlock = await this.provider.getBlockNumber();
        const fromBlock = latestBlock - 200_000;

        const logs = await this.provider.getLogs({
            address: this.AAVE_POOL,
            fromBlock,
            toBlock: latestBlock,
        });

        let borrows = 0;
        let repays = 0;
        let liquidations = 0;

        for (const log of logs) {
            try {
                const parsed = this.iface.parseLog(log);
                if (!parsed) continue;

                const args = parsed.args;

                const involvesWallet = Object.values(args).some(
                    (value) =>
                        typeof value === 'string' &&
                        value.toLowerCase() === wallet,
                );

                if (!involvesWallet) continue;

                if (parsed.name === 'Borrow') borrows++;
                if (parsed.name === 'Repay') repays++;
                if (parsed.name === 'LiquidationCall') liquidations++;
            } catch {

            }
        }

        return {
            borrows,
            repays,
            liquidations,
            repaymentRatio: borrows > 0 ? repays / borrows : 0,
        };
    }
}
// need to add third party API instead of ethers