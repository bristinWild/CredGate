// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CreditAggregator {

    struct ChainReport {
        uint256 creditScore;
        uint256 riskScore;
        uint256 stableScore;
        uint256 scoringVersion;
        bytes32 reportHash;
        uint256 updatedAt;
        bool exists;
    }

    address public usc;
    address public admin;

    mapping(address => mapping(uint64 => ChainReport)) public reports;
    mapping(address => uint256) public globalScore;
    mapping(address => uint256) public activeChainCount;

    uint64[] public supportedChains;
    mapping(uint64 => bool) public isSupportedChain;

    modifier onlyUSC() {
        require(msg.sender == usc, "Not USC");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usc, uint64[] memory _chains) {
        usc = _usc;
        admin = msg.sender;

        for (uint256 i = 0; i < _chains.length; i++) {
            supportedChains.push(_chains[i]);
            isSupportedChain[_chains[i]] = true;
        }
    }

    event ChainReportStored(
        address indexed user,
        uint64 indexed chainKey,
        uint256 creditScore
    );

    event GlobalScoreUpdated(
        address indexed user,
        uint256 globalScore
    );

    function setUSC(address _usc) external onlyAdmin {
        usc = _usc;
    }

    function addSupportedChain(uint64 chainKey) external onlyAdmin {
        require(!isSupportedChain[chainKey], "Already supported");
        supportedChains.push(chainKey);
        isSupportedChain[chainKey] = true;
    }

    function updateChainReport(
        address user,
        uint64 chainKey,
        uint256 creditScore,
        uint256 riskScore,
        uint256 stableScore,
        uint256 scoringVersion,
        bytes32 reportHash
    ) external onlyUSC {

        require(isSupportedChain[chainKey], "Unsupported chain");

        ChainReport storage existing = reports[user][chainKey];

        if (!existing.exists) {
            activeChainCount[user]++;
        }

        reports[user][chainKey] = ChainReport({
            creditScore: creditScore,
            riskScore: riskScore,
            stableScore: stableScore,
            scoringVersion: scoringVersion,
            reportHash: reportHash,
            updatedAt: block.timestamp,
            exists: true
        });

        emit ChainReportStored(user, chainKey, creditScore);

        _recomputeGlobal(user);
    }

    function _recomputeGlobal(address user) internal {

        uint256 sum = 0;
        uint256 count = activeChainCount[user];

        require(count > 0, "No reports");

        for (uint256 i = 0; i < supportedChains.length; i++) {
            uint64 chainKey = supportedChains[i];
            ChainReport storage r = reports[user][chainKey];
            if (r.exists) {
                sum += r.creditScore;
            }
        }

        uint256 avg = sum / count;
        globalScore[user] = avg;

        emit GlobalScoreUpdated(user, avg);
    }

    function getGlobalScore(address user)
        external
        view
        returns (uint256)
    {
        return globalScore[user];
    }

    function getSupportedChains()
        external
        view
        returns (uint64[] memory)
    {
        return supportedChains;
    }
}