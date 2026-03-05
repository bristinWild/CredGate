import {
    CredGateConfig,
    CredGateError,
    ErrorCode,
    AnalysisResult,
    AnalyzeOptions,
    ScoreResult,
    ProofStatus,
    OnChainStatus,
    CreditTier,
} from "./types";

// ── helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function deriveTier(score: number): CreditTier {
    if (score >= 95) return "ELITE";
    if (score >= 80) return "PRIME";
    if (score >= 65) return "PREFERRED";
    if (score >= 50) return "STANDARD";
    return "REJECT";
}

// ── CredGateClient ────────────────────────────────────────────────────────────
export class CredGateClient {
    private readonly apiUrl: string;
    private readonly apiKey?: string;
    private readonly defaultPollInterval: number;
    private readonly defaultTimeout: number;

    constructor(config: CredGateConfig) {
        this.apiUrl = config.apiUrl.replace(/\/$/, "");
        this.apiKey = config.apiKey;
        this.defaultPollInterval = config.pollInterval ?? 3000;
        this.defaultTimeout = config.timeout ?? 120_000;
    }

    // ── Internal fetch ────────────────────────────────────────────────────────
    private async _fetch<T>(path: string, options?: RequestInit): Promise<T> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
        };

        let res: Response;
        try {
            res = await fetch(`${this.apiUrl}${path}`, {
                ...options,
                headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) },
            });
        } catch (err: unknown) {
            throw new CredGateError(
                ErrorCode.NETWORK_ERROR,
                `Network request failed: ${(err as Error).message}`,
            );
        }

        if (res.status === 401 || res.status === 403) {
            throw new CredGateError(ErrorCode.UNAUTHORIZED, "Invalid or missing API key");
        }
        if (res.status === 404) {
            throw new CredGateError(ErrorCode.WALLET_NOT_FOUND, "Wallet not found");
        }
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new CredGateError(ErrorCode.UNKNOWN, `Request failed (${res.status}): ${body}`);
        }

        return res.json() as Promise<T>;
    }

    // ── Normalize /wallet/result/:address response ────────────────────────────
    // Backend returns: { status: "DONE", result: { address, intelligence, onchain, meta, ... } }
    private _normalizeResult(raw: Record<string, unknown>): {
        score: ScoreResult;
        onchain: OnChainStatus;
    } {
        // result is nested under `result` key when status === "DONE"
        const result = (raw.result ?? raw) as Record<string, unknown>;
        const intel = (result.intelligence ?? {}) as Record<string, unknown>;
        const loanProfile = (intel.loanProfile ?? {}) as Record<string, unknown>;
        const breakdown = (intel.scoreBreakdown ?? {}) as Record<string, unknown>;
        const risk = (intel.risk ?? {}) as Record<string, unknown>;
        const meta = (result.meta ?? {}) as Record<string, unknown>;
        const onchainRaw = (result.onchain ?? {}) as Record<string, unknown>;

        const creditScore = (intel.creditScore as number) ?? 0;

        const score: ScoreResult = {
            address: result.address as string,
            creditScore,
            tier: deriveTier(creditScore),
            riskScore: (risk.riskScore as number) ?? 0,
            riskLevel: (risk.riskLevel as ScoreResult["riskLevel"]) ?? "LOW",
            loanProfile: {
                recommendedLTV: (loanProfile.recommendedLTV as number) ?? 0,
                interestTier: (loanProfile.interestTier as string) ?? "REJECT",
                maxLoanSizeUSD: (loanProfile.maxLoanSizeUSD as number) ?? 0,
            },
            scoreBreakdown: {
                lending: (breakdown.lending as number) ?? 0,
                stable: (breakdown.stable as number) ?? 0,
                crossChain: (breakdown.crossChain as number) ?? 0,
                dex: (breakdown.dex as number) ?? 0,
                ageBonus: (breakdown.ageBonus as number) ?? 0,
                riskPenalty: (breakdown.riskPenalty as number) ?? 0,
            },
            analyzedAt: (meta.analyzedAt as number) ?? Date.now(),
        };

        const onchain: OnChainStatus = {
            status: (onchainRaw.status as OnChainStatus["status"]) ?? "NOT_SUBMITTED",
            txHash: onchainRaw.txHash as string | undefined,
            reportHash: onchainRaw.reportHash as string | undefined,
            remainingSeconds: onchainRaw.remainingSeconds as number | undefined,
        };

        return { score, onchain };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Trigger a full wallet analysis and poll until score is ready.
     *
     * Flow: POST /wallet/analyze/:address
     *       → poll GET /wallet/result/:address until status === "DONE"
     *       → GET /proof/status/address/:address
     *
     * @example
     * const result = await client.analyzeWallet("0xabc...");
     * console.log(result.score.creditScore);        // 87
     * console.log(result.score.tier);               // "PRIME"
     * console.log(result.score.loanProfile.maxLoanSizeUSD); // 25000
     */
    async analyzeWallet(address: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
        const pollInterval = options.pollInterval ?? this.defaultPollInterval;
        const timeout = options.timeout ?? this.defaultTimeout;
        const deadline = Date.now() + timeout;

        // 1. Trigger analysis
        await this._fetch(`/wallet/analyze/${address}`, { method: "POST" });

        // 2. Poll for DONE
        let raw: Record<string, unknown> | null = null;

        while (Date.now() < deadline) {
            try {
                const res = await this._fetch<Record<string, unknown>>(`/wallet/result/${address}`);
                // Backend returns { status: "DONE" | "PROCESSING" | "FAILED" | "NOT_FOUND", result: ... }
                if (res.status === "DONE" && res.result) {
                    raw = res;
                    break;
                }
                if (res.status === "FAILED") {
                    throw new CredGateError(ErrorCode.UNKNOWN, "Wallet analysis job failed on server");
                }
            } catch (err) {
                if (err instanceof CredGateError && err.code !== ErrorCode.WALLET_NOT_FOUND) throw err;
            }
            await sleep(pollInterval);
        }

        if (!raw) {
            throw new CredGateError(
                ErrorCode.ANALYSIS_TIMEOUT,
                `Analysis timed out after ${timeout / 1000}s for ${address}`,
            );
        }

        const { score, onchain } = this._normalizeResult(raw);

        // 3. Handle cooldown
        if (onchain.status === "COOLDOWN_ACTIVE") {
            throw new CredGateError(
                ErrorCode.COOLDOWN_ACTIVE,
                `Wallet is in cooldown. Retry in ${onchain.remainingSeconds ?? "?"}s`,
                { remainingSeconds: onchain.remainingSeconds },
            );
        }

        // 4. Optionally wait for ZK proof
        let proof: ProofStatus | undefined;
        if (options.waitForProof) {
            proof = await this.waitForProof(address, { timeout: Math.max(0, deadline - Date.now()) });
        } else {
            proof = await this.getProofStatus(address).catch(() => undefined);
        }

        return { score, onchain, proof };
    }

    /**
     * Get cached score without triggering new analysis.
     * Returns null if wallet was never analyzed.
     *
     * @example
     * const score = await client.getScore("0xabc...");
     * if (!score) await client.analyzeWallet("0xabc...");
     */
    async getScore(address: string): Promise<ScoreResult | null> {
        try {
            const res = await this._fetch<Record<string, unknown>>(`/wallet/result/${address}`);
            if (!res || res.status !== "DONE" || !res.result) return null;
            return this._normalizeResult(res).score;
        } catch (err) {
            if (err instanceof CredGateError && err.code === ErrorCode.WALLET_NOT_FOUND) return null;
            throw err;
        }
    }

    /**
     * Get current CreditCoin ZK proof status.
     *
     * Proof lifecycle:
     *   not_found → queued → checking_contract → fetching_tx
     *   → waiting_attestation → generating_proof → submitting
     *   → success | failed
     *
     * @example
     * const proof = await client.getProofStatus("0xabc...");
     * console.log(proof.status); // "waiting_attestation"
     * console.log(proof.blocksRemaining); // 42
     */
    async getProofStatus(address: string): Promise<ProofStatus> {
        return this._fetch<ProofStatus>(`/proof/status/address/${address}`);
    }

    /**
     * Poll proof status until success or failure.
     * Throws CredGateError with code PROOF_FAILED on failure.
     *
     * @example
     * const proof = await client.waitForProof("0xabc...");
     * console.log(proof.txHash); // CreditCoin tx hash
     */
    async waitForProof(
        address: string,
        options: { timeout?: number; pollInterval?: number } = {},
    ): Promise<ProofStatus> {
        const pollInterval = options.pollInterval ?? this.defaultPollInterval;
        const timeout = options.timeout ?? this.defaultTimeout;
        const deadline = Date.now() + timeout;

        while (Date.now() < deadline) {
            const proof = await this.getProofStatus(address);

            if (proof.status === "success") return proof;

            if (proof.status === "failed") {
                throw new CredGateError(
                    ErrorCode.PROOF_FAILED,
                    `CreditCoin proof failed: ${proof.error ?? "unknown"}`,
                    { txHash: proof.txHash },
                );
            }

            await sleep(pollInterval);
        }

        throw new CredGateError(
            ErrorCode.ANALYSIS_TIMEOUT,
            `Proof timed out after ${timeout / 1000}s`,
        );
    }

    /**
     * Get on-chain credit registry status from Sepolia.
     */
    async getOnChainStatus(address: string): Promise<OnChainStatus> {
        const raw = await this._fetch<Record<string, unknown>>(`/wallet/onchain/${address}`);
        return {
            status: (raw.status as OnChainStatus["status"]) ?? "NOT_SUBMITTED",
            txHash: raw.txHash as string | undefined,
            reportHash: raw.reportHash as string | undefined,
            remainingSeconds: raw.remainingSeconds as number | undefined,
        };
    }

    /**
     * Quick eligibility check — returns false if tier is REJECT or maxLoanSizeUSD is 0.
     *
     * @example
     * if (!(await client.isEligible(userAddress))) {
     *   return res.status(403).json({ error: "Not eligible for loan" });
     * }
     */
    async isEligible(address: string): Promise<boolean> {
        const score = await this.getScore(address);
        if (!score) return false;
        return score.tier !== "REJECT" && score.loanProfile.maxLoanSizeUSD > 0;
    }

    /**
     * Get max loan amount in USD for a wallet.
     * Returns 0 if wallet hasn't been analyzed or is ineligible.
     *
     * @example
     * const max = await client.getMaxLoan(userAddress);
     * if (requestedAmount > max) throw new Error("Exceeds credit line");
     */
    async getMaxLoan(address: string): Promise<number> {
        const score = await this.getScore(address);
        return score?.loanProfile.maxLoanSizeUSD ?? 0;
    }
}
