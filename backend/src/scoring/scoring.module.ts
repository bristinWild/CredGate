import { Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { RiskService } from "./risk.service";
import { ScoreService } from "./score.service";
import { StableScoreService } from "./stable-score.service";

@Module({
    providers: [MetricsService, RiskService, ScoreService, StableScoreService],
    exports: [MetricsService, RiskService, ScoreService, StableScoreService],
})
export class ScoringModule { }