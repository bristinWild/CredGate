import { Injectable } from "@nestjs/common";
import { ethers, keccak256, toUtf8Bytes, InterfaceAbi } from "ethers";
import artifact from "./abi/CreditScoreRegistry.json";

@Injectable()
export class CreditRegistryService {
    private contract: ethers.Contract;

    constructor() {
        if (!process.env.RPC_URL) {
            throw new Error("RPC_URL not defined");
        }

        if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY not defined");
        }

        if (!process.env.CREDIT_REGISTRY_ADDRESS) {
            throw new Error("CREDIT_REGISTRY_ADDRESS not defined");
        }

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

        const signer = new ethers.Wallet(
            process.env.PRIVATE_KEY,
            provider
        );

        const abi = artifact.abi;

        this.contract = new ethers.Contract(
            process.env.CREDIT_REGISTRY_ADDRESS,
            abi,
            signer
        );
    }

    async pushScoreOnChain(
        user: string,
        metrics: any,
        risk: any,
        score: number
    ) {
        const reportObject = {
            metrics: {
                totalBorrows: metrics.totalBorrows,
                totalRepays: metrics.totalRepays,
                totalLiquidations: metrics.totalLiquidations,
                repayRatio: metrics.repayRatio,
                liquidationRate: metrics.liquidationRate,
                borrowRepayCycles: metrics.borrowRepayCycles,
            },
            risk: {
                riskScore: risk.riskScore,
                riskLevel: risk.riskLevel,
            },
            creditScore: score,
        };

        const intelligenceJson = JSON.stringify(reportObject);
        const reportHash = keccak256(toUtf8Bytes(intelligenceJson));

        const tx = await this.contract.updateScore(
            user,
            score,
            risk.riskScore,
            reportHash
        );

        const receipt = await tx.wait();

        return {
            txHash: receipt?.hash ?? tx.hash,
            reportHash,
        };
    }

    async getOnChainScore(user: string) {
        const result = await this.contract.getScore(user);
        return {
            creditScore: Number(result.creditScore),
            riskScore: Number(result.riskScore),
            updatedAt: Number(result.updatedAt),
            reportHash: result.reportHash,
        };
    }
}