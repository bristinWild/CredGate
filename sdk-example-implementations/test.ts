import { CredGateClient, CredGateError, ErrorCode } from "credgate-sdk";

const client = new CredGateClient({
    apiUrl: "http://localhost:3000",
    apiKey: "put your api key heree",
});

const TEST_WALLET = "0x8DC7aA7937e2f273D01198d223193B3A7ff4f574";

async function main() {
    console.log("🔍 Testing credgate-sdk...\n");

    //  Test 1: Analyze wallet 
    console.log("1. Analyzing wallet...");
    try {
        const result = await client.analyzeWallet(TEST_WALLET, {
            timeout: 120_000,
        });

        console.log(" Score:", result.score.creditScore);
        console.log("   Tier:", result.score.tier);
        console.log("   Max Loan: $" + result.score.loanProfile.maxLoanSizeUSD);
        console.log("   LTV:", result.score.loanProfile.recommendedLTV + "%");
        console.log("   Interest Tier:", result.score.loanProfile.interestTier);
        console.log("   Risk:", result.score.riskLevel, `(${result.score.riskScore})`);
        console.log("   Breakdown:", result.score.scoreBreakdown);
        console.log("   On-chain status:", result.onchain.status);
        if (result.proof) {
            console.log("   Proof status:", result.proof.status);
        }
    } catch (err) {
        if (err instanceof CredGateError && (err as CredGateError).code === ErrorCode.COOLDOWN_ACTIVE) {
            console.log("⏳ Wallet in cooldown —", (err as CredGateError).message);
        } else {
            console.error(" analyzeWallet failed:", err);
        }
    }

    console.log();

    // Test 2: Get cached score 
    console.log("2. Getting cached score...");
    const score = await client.getScore(TEST_WALLET);
    if (score) {
        console.log(" Cached score:", score.creditScore, "| Tier:", score.tier);
    } else {
        console.log(". No cached score found");
    }

    console.log();

    // Test 3: Eligibility check 
    console.log("3. Checking eligibility...");
    const eligible = await client.isEligible(TEST_WALLET);
    console.log(eligible ? "Eligible to borrow" : " Not eligible");

    console.log();

    // ── Test 4: Max loan
    console.log("4. Getting max loan...");
    const maxLoan = await client.getMaxLoan(TEST_WALLET);
    console.log(" Max loan: $" + maxLoan);

    console.log();

    // ── Test 5: Proof status 
    console.log("5. Getting proof status...");
    const proof = await client.getProofStatus(TEST_WALLET);
    console.log("Proof status:", proof.status);
    if (proof.blocksRemaining) console.log("   Blocks remaining:", proof.blocksRemaining);
    if (proof.txHash) console.log("   Tx hash:", proof.txHash);

    console.log();

    //  Test 6: On-chain status 
    console.log("6. Getting on-chain status...");
    const onchain = await client.getOnChainStatus(TEST_WALLET);
    console.log("On-chain status:", onchain.status);
    if (onchain.txHash) console.log("   Tx hash:", onchain.txHash);
    if (onchain.remainingSeconds) console.log("   Cooldown remaining:", onchain.remainingSeconds + "s");

    console.log();

    // Test 7: Poll proof until it completes
    console.log("7. Polling proof status until complete...");

    const PROOF_POLL_MS = 5000;

    const proofPoller = setInterval(async () => {
        const p = await client.getProofStatus(TEST_WALLET);

        const statusLabels: Record<string, string> = {
            not_found: "⏸  Not started yet",
            queued: "📋 Queued",
            checking_contract: "🔍 Checking contract",
            fetching_tx: "📡 Fetching Sepolia tx",
            waiting_attestation: `⏳ Waiting for CreditCoin attestation — ${p.blocksRemaining ?? "?"} blocks left (~${p.estimatedWaitSeconds ?? "?"}s)`,
            generating_proof: "⚙️  Generating Merkle proof",
            submitting: "📤 Submitting to CreditCoin USC",
            success: `✅ Proof verified on-chain! CreditCoin tx: ${p.txHash}`,
            failed: `❌ Proof failed: ${p.error}`,
        };

        console.log("   →", statusLabels[p.status] ?? p.status);

        if (p.status === "success" || p.status === "failed") {
            clearInterval(proofPoller);
        }
    }, PROOF_POLL_MS);
}

main().catch(console.error);