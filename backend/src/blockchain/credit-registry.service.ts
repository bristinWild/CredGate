import { Injectable } from "@nestjs/common";
import { ethers, keccak256, toUtf8Bytes, InterfaceAbi } from "ethers";
import artifact from "./abi/CreditScoreRegistry.json";

export type OnChainResult =
    | {
        status: "UPDATED";
        txHash: string;
        reportHash: string;
    }
    | {
        status: "COOLDOWN_ACTIVE";
        remainingSeconds: number;
    };

@Injectable()
export class CreditRegistryService {
    private contract: ethers.Contract;

    constructor() {

        console.log("RPC URL:", process.env.RPC_URL);
        if (!process.env.RPC_URL) {
            throw new Error("RPC_URL not defined");
        }

        if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY not defined");
        }

        if (!process.env.CREDIT_REGISTRY_ADDRESS) {
            throw new Error("CREDIT_REGISTRY_ADDRESS not defined");
        }

        const provider = new ethers.JsonRpcProvider(
            process.env.RPC_URL,
            undefined,
            {
                staticNetwork: true,
            }
        );

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
    ): Promise<OnChainResult> {

        try {

            const current = await this.contract.scores(user);
            const cooldown = await this.contract.updateCooldown();

            const lastUpdated = Number(current.updatedAt);
            const cooldownSeconds = Number(cooldown);

            const now = Math.floor(Date.now() / 1000);


            if (lastUpdated !== 0 && now < lastUpdated + cooldownSeconds) {
                const remaining = (lastUpdated + cooldownSeconds) - now;

                return {
                    status: "COOLDOWN_ACTIVE",
                    remainingSeconds: remaining,
                };
            }

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

            return {
                status: "UPDATED",
                txHash: tx.hash,
                reportHash
            };

        } catch (error: any) {

            console.error("❌ On-chain update failed:", error);

            throw new Error(
                "Blockchain update failed. Please try again later."
            );
        }
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