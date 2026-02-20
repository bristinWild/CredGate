import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import { ProviderService } from "./provider.service";

const AAVE_V3_POOL_MAINNET =
    "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

@Injectable()
export class AaveService {
    private contract: ethers.Contract;

    constructor(private readonly providerService: ProviderService) {
        const provider = this.providerService.getProvider();

        this.contract = new ethers.Contract(
            AAVE_V3_POOL_MAINNET,
            [
                "event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)",
                "event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)",
                "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)",
            ],
            provider
        );
    }

    async getUserBorrows(address: string, fromBlock: number) {
        const provider = this.providerService.getProvider();
        const currentBlock = await provider.getBlockNumber();

        const BORROW_TOPIC = ethers.id(
            "Borrow(address,address,address,uint256,uint8,uint256,uint16)"
        );

        const paddedAddress = ethers.zeroPadValue(address, 32);

        const logs = await provider.getLogs({
            address: this.contract.target as string,
            fromBlock,
            toBlock: currentBlock,
            topics: [
                BORROW_TOPIC,
                null,
                paddedAddress,
            ],
        });

        console.log("Borrow logs fetched:", logs.length);

        return logs
            .map((log) => {
                const parsed = this.contract.interface.parseLog(log);
                if (!parsed) return null;

                return {
                    type: "BORROW",
                    reserve: parsed.args.reserve,
                    user: parsed.args.user,
                    onBehalfOf: parsed.args.onBehalfOf,
                    amount: parsed.args.amount.toString(),
                    interestRateMode: Number(parsed.args.interestRateMode),
                    borrowRate: parsed.args.borrowRate?.toString() ?? null,
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                };
            })
            .filter((event) => event !== null);
    }

    async getUserRepays(address: string, fromBlock: number) {
        const provider = this.providerService.getProvider();
        const currentBlock = await provider.getBlockNumber();

        const REPAY_TOPIC = ethers.id(
            "Repay(address,address,address,uint256,bool)"
        );

        const paddedAddress = ethers.zeroPadValue(address, 32);

        const logs = await provider.getLogs({
            address: this.contract.target as string,
            fromBlock,
            toBlock: currentBlock,
            topics: [
                REPAY_TOPIC,
                null,
                paddedAddress,
            ],
        });

        console.log("Repay logs fetched:", logs.length);

        return logs
            .map((log) => {
                const parsed = this.contract.interface.parseLog(log);
                if (!parsed) return null;

                return {
                    type: "REPAY",
                    reserve: parsed.args.reserve,
                    user: parsed.args.user,
                    repayer: parsed.args.repayer,
                    amount: parsed.args.amount.toString(),
                    useATokens: parsed.args.useATokens,
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                };
            })
            .filter((event) => event !== null);
    }

    async getUserLiquidations(address: string, fromBlock: number) {
        const provider = this.providerService.getProvider();
        const currentBlock = await provider.getBlockNumber();

        const LIQUIDATION_TOPIC = ethers.id(
            "LiquidationCall(address,address,address,uint256,uint256,address,bool)"
        );

        const paddedAddress = ethers.zeroPadValue(address, 32);

        const logs = await provider.getLogs({
            address: this.contract.target as string,
            fromBlock,
            toBlock: currentBlock,
            topics: [
                LIQUIDATION_TOPIC,
                null,
                null,
                paddedAddress,
            ],
        });

        console.log("Liquidation logs fetched:", logs.length);

        return logs
            .map((log) => {
                const parsed = this.contract.interface.parseLog(log);
                if (!parsed) return null;

                return {
                    type: "LIQUIDATION",
                    collateralAsset: parsed.args.collateralAsset,
                    debtAsset: parsed.args.debtAsset,
                    user: parsed.args.user,
                    debtToCover: parsed.args.debtToCover.toString(),
                    liquidatedCollateralAmount:
                        parsed.args.liquidatedCollateralAmount.toString(),
                    liquidator: parsed.args.liquidator,
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                };
            })
            .filter((event) => event !== null);
    }

    async getUserAaveActivity(address: string, fromBlock: number) {
        const borrows = await this.getUserBorrows(address, fromBlock);
        const repays = await this.getUserRepays(address, fromBlock);
        const liquidations = await this.getUserLiquidations(
            address,
            fromBlock
        );

        return {
            borrows,
            repays,
            liquidations,
        };
    }
}