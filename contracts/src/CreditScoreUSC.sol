// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./lib/EvmV1Decoder.sol";

interface INativeQueryVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }

    // no event emission
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    // state-changing, emits TransactionVerified event
    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

interface ICreditAggregator {
    function updateChainReport(
        address user,
        uint64 chainKey,
        uint256 creditScore,
        uint256 riskScore,
        uint256 stableScore,
        uint256 scoringVersion,
        bytes32 reportHash
    ) external;
}

library NativeQueryVerifierLib {
    address constant PRECOMPILE_ADDRESS =
        0x0000000000000000000000000000000000000FD2;

    function getVerifier() internal pure returns (INativeQueryVerifier) {
        return INativeQueryVerifier(PRECOMPILE_ADDRESS);
    }
}

contract CreditScoreUSC {

    INativeQueryVerifier public immutable VERIFIER;

    ICreditAggregator public aggregator;
    address public admin;

    mapping(bytes32 => bool) public processedQueries;
    mapping(uint64 => address) public authorizedSourceContracts;

    bytes32 public constant SCORE_EVENT_SIG =
        keccak256(
            "ScoreUpdated(address,uint256,uint256,uint256,uint256,uint256,bytes32)"
        );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        VERIFIER = NativeQueryVerifierLib.getVerifier();
        admin = msg.sender;
    }

    function setAggregator(address _aggregator) external onlyAdmin {
        aggregator = ICreditAggregator(_aggregator);
    }

    function registerSourceContract(
        uint64 chainKey,
        address sourceContract
    ) external onlyAdmin {
        authorizedSourceContracts[chainKey] = sourceContract;
    }

    function submitScoreFromQuery(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots
    ) external returns (bool) {

        require(address(aggregator) != address(0), "Aggregator not set");

        // Calculate transaction index from merkle proof siblings
        uint256 transactionIndex = _calculateTransactionIndex(siblings);

        // Calculate txKey
        bytes32 txKey = keccak256(
            abi.encodePacked(chainKey, blockHeight, transactionIndex)
        );

        require(!processedQueries[txKey], "Query already processed");

        // Build proof structs
        INativeQueryVerifier.MerkleProof memory merkleProof =
            INativeQueryVerifier.MerkleProof({
                root: merkleRoot,
                siblings: siblings
            });

        INativeQueryVerifier.ContinuityProof memory continuityProof =
            INativeQueryVerifier.ContinuityProof({
                lowerEndpointDigest: lowerEndpointDigest,
                roots: continuityRoots
            });

        // Verify proof via precompile
    //   bool verified = true;

bool verified = VERIFIER.verify(
    chainKey,
    blockHeight,
    encodedTransaction,
    merkleProof,
    continuityProof
);
require(verified, "Proof verification failed");

        // Mark as processed
        processedQueries[txKey] = true;

        // Extract score event from encoded transaction
            (
            address user,
            uint256 creditScore,
            uint256 riskScore,
            uint256 stableScore,
            uint256 scoringVersion,
            bytes32 reportHash,
            address emitter,
            bool receiptSuccess
        ) = _extractScoreEvent(encodedTransaction);
        require(receiptSuccess, "Source tx failed");

        // Validate emitter is authorized source contract
        require(
            emitter == authorizedSourceContracts[chainKey],
            "Unauthorized source"
        );

        // Update aggregator
        aggregator.updateChainReport(
            user,
            chainKey,
            creditScore,
            riskScore,
            stableScore,
            scoringVersion,
            reportHash
        );

        return true;
    }

    function _calculateTransactionIndex(
        INativeQueryVerifier.MerkleProofEntry[] calldata proof
    ) internal pure returns (uint256 index) {
        for (uint256 i = 0; i < proof.length; i++) {
            if (proof[i].isLeft) {
                index |= 1 << i;
            }
        }
    }

    function mockSubmitScore(
        address user,
        uint64 chainKey,
        uint256 creditScore,
        uint256 riskScore,
        uint256 stableScore,
        uint256 scoringVersion,
        bytes32 reportHash
    ) external onlyAdmin {
        require(address(aggregator) != address(0), "Aggregator not set");

        aggregator.updateChainReport(
            user,
            chainKey,
            creditScore,
            riskScore,
            stableScore,
            scoringVersion,
            reportHash
        );
    }

    function _extractScoreEvent(bytes memory encodedTransaction)
        internal
        view
        returns (
            address user,
            uint256 creditScore,
            uint256 riskScore,
            uint256 stableScore,
            uint256 scoringVersion,
            bytes32 reportHash,
            address emitter,
            bool receiptSuccess
        )
    {
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        require(
            EvmV1Decoder.isValidTransactionType(txType),
            "Unsupported tx type"
        );

        EvmV1Decoder.ReceiptFields memory receipt =
            EvmV1Decoder.decodeReceiptFields(encodedTransaction);

        receiptSuccess = (receipt.receiptStatus == 1);

        EvmV1Decoder.LogEntry[] memory logs =
            EvmV1Decoder.getLogsByEventSignature(
                receipt,
                SCORE_EVENT_SIG
            );

        require(logs.length > 0, "ScoreUpdated not found");

        EvmV1Decoder.LogEntry memory logEntry = logs[0];

        emitter = logEntry.address_;

        require(logEntry.topics.length > 1, "Invalid topics");
        user = address(uint160(uint256(logEntry.topics[1])));

        (
            creditScore,
            riskScore,
            stableScore,
            scoringVersion,
            ,
            reportHash
        ) = abi.decode(
            logEntry.data,
            (uint256, uint256, uint256, uint256, uint256, bytes32)
        );
    }
}