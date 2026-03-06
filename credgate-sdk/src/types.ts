
// Credit Tiers  (matches wallet.processor.ts buildLoanProfile)

export type CreditTier = "ELITE" | "PRIME" | "PREFERRED" | "STANDARD" | "REJECT";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type StableLevel = "STRONG" | "MODERATE" | "WEAK";


// Proof status  (matches proof.service.ts jobs Map)

export type ProofStatusValue =
    | "not_found"
    | "queued"
    | "checking_contract"
    | "fetching_tx"
    | "waiting_attestation"
    | "generating_proof"
    | "submitting"
    | "success"
    | "failed";

export interface ProofStatus {
    status: ProofStatusValue;
    jobId?: string;
    txHash?: string;
    error?: string;
    currentAttestedBlock?: number;
    targetBlock?: number;
    blocksRemaining?: number;
    estimatedWaitSeconds?: number;
}


// On-chain status  (matches credit-registry.service.ts)

export type OnChainStatusValue =
    | "NOT_SUBMITTED"
    | "UPDATED"
    | "COOLDOWN_ACTIVE"
    | "FAILED";

export interface OnChainStatus {
    status: OnChainStatusValue;
    txHash?: string;
    reportHash?: string;
    remainingSeconds?: number;
}


// Score breakdown  (matches score.service.ts breakdown object)

export interface ScoreBreakdown {
    lending: number;
    stable: number;
    crossChain: number;
    dex: number;
    ageBonus: number;
    riskPenalty: number;
}


// Loan profile  (matches wallet.processor.ts buildLoanProfile)
export interface LoanProfile {
    recommendedLTV: number;      // 0–70
    interestTier: string;        // "PRIME" | "PREFERRED" | "STANDARD" | "HIGH_RISK" | "REJECT"
    maxLoanSizeUSD: number;      // USD value
}


// Full score result  (normalized from /wallet/result/:address)
export interface ScoreResult {
    address: string;
    creditScore: number;         // 0–100
    tier: CreditTier;
    riskScore: number;
    riskLevel: RiskLevel;
    loanProfile: LoanProfile;
    scoreBreakdown: ScoreBreakdown;
    analyzedAt: number;          // unix ms
}

// Full analysis result returned by analyzeWallet()
export interface AnalysisResult {
    score: ScoreResult;
    onchain: OnChainStatus;
    proof?: ProofStatus;
}


// Credit line info  (from CreditVault.sol getCreditLine / availableToBorrow)
export interface CreditLineResult {
    creditLine: bigint;          // raw 6-decimal USDC
    available: bigint;
    outstanding: {
        principal: bigint;
        interest: bigint;
        total: bigint;
    };
    utilizationPct: number;
}


// SDK config
export interface CredGateConfig {
    apiUrl: string;

    apiKey?: string;

    pollInterval?: number;

    timeout?: number;
}

export interface AnalyzeOptions {
    pollInterval?: number;
    timeout?: number;

    waitForProof?: boolean;
}


// Error handling
export enum ErrorCode {
    COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE",
    ANALYSIS_TIMEOUT = "ANALYSIS_TIMEOUT",
    WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
    PROOF_FAILED = "PROOF_FAILED",
    UNAUTHORIZED = "UNAUTHORIZED",
    NETWORK_ERROR = "NETWORK_ERROR",
    UNKNOWN = "UNKNOWN",
}

export class CredGateError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly meta?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "CredGateError";
    }
}
