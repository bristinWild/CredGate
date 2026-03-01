import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ScoreService } from './scoring/score.service';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ProofService } from './proof/proof.service';
import { ProofController } from './proof/proof.controller';
import { DexService } from './dex/dex.service';
import { CrossChainModule } from './crosschain/crosschain.module';
import { DexModule } from './dex/dex.module';
import { CronModule } from './cron/cron.module';
import { ProofModule } from './proof/proof.module';




@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), WalletModule, BlockchainModule, CrossChainModule, DexModule, CronModule, ProofModule,],
  controllers: [AppController, ProofController],
  providers: [AppService, ScoreService, ProofService, DexService],
})
export class AppModule { }
