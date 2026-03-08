"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredGateClient = void 0;
const types_1 = require("./types");
// ── helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function deriveTier(score) {
    if (score >= 95)
        return "ELITE";
    if (score >= 80)
        return "PRIME";
    if (score >= 65)
        return "PREFERRED";
    if (score >= 50)
        return "STANDARD";
    return "REJECT";
}
// ── CredGateClient ────────────────────────────────────────────────────────────
class CredGateClient {
    constructor(config) {
        this.apiUrl = config.apiUrl.replace(/\/$/, "");
        this.apiKey = config.apiKey;
        this.defaultPollInterval = config.pollInterval ?? 3000;
        this.defaultTimeout = config.timeout ?? 120000;
    }
    // ── Internal fetch ────────────────────────────────────────────────────────
    async _fetch(path, options) {
        const headers = {
            "Content-Type": "application/json",
            ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
        };
        let res;
        try {
            res = await fetch(`${this.apiUrl}${path}`, {
                ...options,
                headers: { ...headers, ...(options?.headers ?? {}) },
            });
        }
        catch (err) {
            throw new types_1.CredGateError(types_1.ErrorCode.NETWORK_ERROR, `Network request failed: ${err.message}`);
        }
        if (res.status === 401 || res.status === 403) {
            throw new types_1.CredGateError(types_1.ErrorCode.UNAUTHORIZED, "Invalid or missing API key");
        }
        if (res.status === 404) {
            throw new types_1.CredGateError(types_1.ErrorCode.WALLET_NOT_FOUND, "Wallet not found");
        }
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new types_1.CredGateError(types_1.ErrorCode.UNKNOWN, `Request failed (${res.status}): ${body}`);
        }
        return res.json();
    }
    // ── Normalize /wallet/result/:address response ────────────────────────────
    // Backend returns: { status: "DONE", result: { address, intelligence, onchain, meta, ... } }
    _normalizeResult(raw) {
        // result is nested under `result` key when status === "DONE"
        const result = (raw.result ?? raw);
        const intel = (result.intelligence ?? {});
        const loanProfile = (intel.loanProfile ?? {});
        const breakdown = (intel.scoreBreakdown ?? {});
        const risk = (intel.risk ?? {});
        const meta = (result.meta ?? {});
        const onchainRaw = (result.onchain ?? {});
        const creditScore = intel.creditScore ?? 0;
        const score = {
            address: result.address,
            creditScore,
            tier: deriveTier(creditScore),
            riskScore: risk.riskScore ?? 0,
            riskLevel: risk.riskLevel ?? "LOW",
            loanProfile: {
                recommendedLTV: loanProfile.recommendedLTV ?? 0,
                interestTier: loanProfile.interestTier ?? "REJECT",
                maxLoanSizeUSD: loanProfile.maxLoanSizeUSD ?? 0,
            },
            scoreBreakdown: {
                lending: breakdown.lending ?? 0,
                stable: breakdown.stable ?? 0,
                crossChain: breakdown.crossChain ?? 0,
                dex: breakdown.dex ?? 0,
                ageBonus: breakdown.ageBonus ?? 0,
                riskPenalty: breakdown.riskPenalty ?? 0,
            },
            analyzedAt: meta.analyzedAt ?? Date.now(),
        };
        const onchain = {
            status: onchainRaw.status ?? "NOT_SUBMITTED",
            txHash: onchainRaw.txHash,
            reportHash: onchainRaw.reportHash,
            remainingSeconds: onchainRaw.remainingSeconds,
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
    async analyzeWallet(address, options = {}) {
        const pollInterval = options.pollInterval ?? this.defaultPollInterval;
        const timeout = options.timeout ?? this.defaultTimeout;
        const deadline = Date.now() + timeout;
        // 1. Trigger analysis
        await this._fetch(`/wallet/analyze/${address}`, { method: "POST" });
        // 2. Poll for DONE
        let raw = null;
        while (Date.now() < deadline) {
            try {
                const res = await this._fetch(`/wallet/result/${address}`);
                // Backend returns { status: "DONE" | "PROCESSING" | "FAILED" | "NOT_FOUND", result: ... }
                if (res.status === "DONE" && res.result) {
                    raw = res;
                    break;
                }
                if (res.status === "FAILED") {
                    throw new types_1.CredGateError(types_1.ErrorCode.UNKNOWN, "Wallet analysis job failed on server");
                }
            }
            catch (err) {
                if (err instanceof types_1.CredGateError && err.code !== types_1.ErrorCode.WALLET_NOT_FOUND)
                    throw err;
            }
            await sleep(pollInterval);
        }
        if (!raw) {
            throw new types_1.CredGateError(types_1.ErrorCode.ANALYSIS_TIMEOUT, `Analysis timed out after ${timeout / 1000}s for ${address}`);
        }
        const { score, onchain } = this._normalizeResult(raw);
        // 3. Handle cooldown
        if (onchain.status === "COOLDOWN_ACTIVE") {
            throw new types_1.CredGateError(types_1.ErrorCode.COOLDOWN_ACTIVE, `Wallet is in cooldown. Retry in ${onchain.remainingSeconds ?? "?"}s`, { remainingSeconds: onchain.remainingSeconds });
        }
        // 4. Optionally wait for ZK proof
        let proof;
        if (options.waitForProof) {
            proof = await this.waitForProof(address, { timeout: Math.max(0, deadline - Date.now()) });
        }
        else {
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
    async getScore(address) {
        try {
            const res = await this._fetch(`/wallet/result/${address}`);
            if (!res || res.status !== "DONE" || !res.result)
                return null;
            return this._normalizeResult(res).score;
        }
        catch (err) {
            if (err instanceof types_1.CredGateError && err.code === types_1.ErrorCode.WALLET_NOT_FOUND)
                return null;
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
    async getProofStatus(address) {
        return this._fetch(`/proof/status/address/${address}`);
    }
    /**
     * Poll proof status until success or failure.
     * Throws CredGateError with code PROOF_FAILED on failure.
     *
     * @example
     * const proof = await client.waitForProof("0xabc...");
     * console.log(proof.txHash); // CreditCoin tx hash
     */
    async waitForProof(address, options = {}) {
        const pollInterval = options.pollInterval ?? this.defaultPollInterval;
        const timeout = options.timeout ?? this.defaultTimeout;
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const proof = await this.getProofStatus(address);
            if (proof.status === "success")
                return proof;
            if (proof.status === "failed") {
                throw new types_1.CredGateError(types_1.ErrorCode.PROOF_FAILED, `CreditCoin proof failed: ${proof.error ?? "unknown"}`, { txHash: proof.txHash });
            }
            await sleep(pollInterval);
        }
        throw new types_1.CredGateError(types_1.ErrorCode.ANALYSIS_TIMEOUT, `Proof timed out after ${timeout / 1000}s`);
    }
    /**
     * Get on-chain credit registry status from Sepolia.
     */
    async getOnChainStatus(address) {
        const raw = await this._fetch(`/wallet/onchain/${address}`);
        return {
            status: raw.status ?? "NOT_SUBMITTED",
            txHash: raw.txHash,
            reportHash: raw.reportHash,
            remainingSeconds: raw.remainingSeconds,
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
    async isEligible(address) {
        const score = await this.getScore(address);
        if (!score)
            return false;
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
    async getMaxLoan(address) {
        const score = await this.getScore(address);
        return score?.loanProfile.maxLoanSizeUSD ?? 0;
    }
}
exports.CredGateClient = CredGateClient;
//# sourceMappingURL=client.js.map