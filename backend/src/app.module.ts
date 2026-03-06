import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ScoreService } from './scoring/score.service';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { DexService } from './dex/dex.service';
import { CrossChainModule } from './crosschain/crosschain.module';
import { DexModule } from './dex/dex.module';
import { CronModule } from './cron/cron.module';
import { ProofModule } from './proof/proof.module';
// import { ApiKeyService } from './api-key/api-key.service';
// import { ApiKeyController } from './api-key/api-key.controller';
import { ApiKeyModule } from './api-key/api-key.module';




@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), WalletModule, BlockchainModule, CrossChainModule, DexModule, CronModule, ProofModule, ApiKeyModule,],
  controllers: [AppController,],
  providers: [AppService, ScoreService, DexService,],
})
export class AppModule { }
