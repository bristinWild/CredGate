import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ScoreService } from './scoring/score.service';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ProofService } from './proof/proof.service';
import { ProofController } from './proof/proof.controller';



@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), WalletModule, BlockchainModule],
  controllers: [AppController, ProofController],
  providers: [AppService, ScoreService, ProofService],
})
export class AppModule { }
