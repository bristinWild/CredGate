import { Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { RiskService } from "./risk.service";
import { ScoreService } from "./score.service";

@Module({
    providers: [MetricsService, RiskService, ScoreService],
    exports: [MetricsService, RiskService, ScoreService],
})
export class ScoringModule { }