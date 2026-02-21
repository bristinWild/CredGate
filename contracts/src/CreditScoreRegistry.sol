// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CreditScoreRegistry {

    struct CreditData {
        uint256 creditScore;
        uint256 riskScore;
        uint256 updatedAt;      
        bytes32 reportHash;    
    }

    mapping(address => CreditData) public scores;

    address public scorer; 

    uint256 public updateCooldown = 1 days;

    event ScoreUpdated(
        address indexed user,
        uint256 creditScore,
        uint256 riskScore,
        uint256 timestamp
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
            updatedAt: block.timestamp,
            reportHash: reportHash
        });

        emit ScoreUpdated(
            user,
            creditScore,
            riskScore,
            block.timestamp
        );
    }

    function getScore(address user) external view returns (CreditData memory) {
        return scores[user];
    }   
}