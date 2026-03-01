// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CreditScoreRegistry {

    struct CreditData {
        uint256 creditScore;
        uint256 riskScore;
        uint256 stableScore;
        uint256 scoringVersion;
        uint256 updatedAt;
        bytes32 reportHash;
    }

    mapping(address => CreditData) public scores;

    address public scorer;
    uint256 public updateCooldown = 5 minutes;

    event ScoreUpdated(
        address indexed user,
        uint256 creditScore,
        uint256 riskScore,
        uint256 stableScore,
        uint256 scoringVersion,
        uint256 timestamp,
        bytes32 reportHash
    );

    modifier onlyScorer() {
        require(msg.sender == scorer, "Not authorized");
        _;
    }

    constructor(address _scorer) {
        scorer = _scorer;
    }

    function updateScore(
        address user,
        uint256 creditScore,
        uint256 riskScore,
        uint256 stableScore,
        uint256 scoringVersion,
        bytes32 reportHash
    ) external onlyScorer {

        CreditData storage existing = scores[user];

        require(
            block.timestamp >= existing.updatedAt + updateCooldown,
            "Update cooldown active"
        );

        scores[user] = CreditData({
            creditScore: creditScore,
            riskScore: riskScore,
            stableScore: stableScore,
            scoringVersion: scoringVersion,
            updatedAt: block.timestamp,
            reportHash: reportHash
        });

        emit ScoreUpdated(
            user,
            creditScore,
            riskScore,
            stableScore,
            scoringVersion,
            block.timestamp,
            reportHash
        );
    }

    function getScore(address user)
        external
        view
        returns (CreditData memory)
    {
        return scores[user];
    }

    function setScorer(address _scorer) external onlyScorer {
        scorer = _scorer;
    }

    function setCooldown(uint256 _seconds) external onlyScorer {
        updateCooldown = _seconds;
    }
}