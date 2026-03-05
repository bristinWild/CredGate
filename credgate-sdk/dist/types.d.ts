export type CreditTier = "ELITE" | "PRIME" | "PREFERRED" | "STANDARD" | "REJECT";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type StableLevel = "STRONG" | "MODERATE" | "WEAK";
export type ProofStatusValue = "not_found" | "queued" | "checking_contract" | "fetching_tx" | "waiting_attestation" | "generating_proof" | "submitting" | "success" | "failed";
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
export type OnChainStatusValue = "NOT_SUBMITTED" | "UPDATED" | "COOLDOWN_ACTIVE" | "FAILED";
export interface OnChainStatus {
    status: OnChainStatusValue;
    txHash?: string;
    reportHash?: string;
    remainingSeconds?: number;
}
export interface ScoreBreakdown {
    lending: number;
    stable: number;
    crossChain: number;
    dex: number;
    ageBonus: number;
    riskPenalty: number;
}
export interface LoanProfile {
    recommendedLTV: number;
    interestTier: string;
    maxLoanSizeUSD: number;
}
export interface ScoreResult {
    address: string;
    creditScore: number;
    tier: CreditTier;
    riskScore: number;
    riskLevel: RiskLevel;
    loanProfile: LoanProfile;
    scoreBreakdown: ScoreBreakdown;
    analyzedAt: number;
}
export interface AnalysisResult {
    score: ScoreResult;
    onchain: OnChainStatus;
    proof?: ProofStatus;
}
export interface CreditLineResult {
    creditLine: bigint;
    available: bigint;
    outstanding: {
        principal: bigint;
        interest: bigint;
        total: bigint;
    };
    utilizationPct: number;
}
export interface CredGateConfig {
    /** Your CredGate backend URL, e.g. https://api.credgate.xyz */
    apiUrl: string;
    /** Optional API key forwarded as x-api-key header */
    apiKey?: string;
    /** Poll interval in ms (default: 3000) */
    pollInterval?: number;
    /** Analysis timeout in ms (default: 120000) */
    timeout?: number;
}
export interface AnalyzeOptions {
    pollInterval?: number;
    timeout?: number;
    /** If true, also waits for CreditCoin ZK proof to reach success/failed */
    waitForProof?: boolean;
}
export declare enum ErrorCode {
    COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE",
    ANALYSIS_TIMEOUT = "ANALYSIS_TIMEOUT",
    WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
    PROOF_FAILED = "PROOF_FAILED",
    UNAUTHORIZED = "UNAUTHORIZED",
    NETWORK_ERROR = "NETWORK_ERROR",
    UNKNOWN = "UNKNOWN"
}
export declare class CredGateError extends Error {
    readonly code: ErrorCode;
    readonly meta?: Record<string, unknown> | undefined;
    constructor(code: ErrorCode, message: string, meta?: Record<string, unknown> | undefined);
}
//# sourceMappingURL=types.d.ts.map