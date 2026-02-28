import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletProcessor } from './wallet.processor';
import { WalletController } from './wallet.controller';
import { ScoringModule } from 'src/scoring/scoring.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { CrossChainModule } from 'src/crosschain/crosschain.module';
import { DexModule } from 'src/dex/dex.module';


@Module({
  imports: [
    ScoringModule,
    BlockchainModule,
    CrossChainModule,
    DexModule,
  ],
  providers: [
    WalletService,
    WalletProcessor,
  ],
  exports: [
    WalletService,
    WalletProcessor,
  ],
  controllers: [WalletController],
})
export class WalletModule { }