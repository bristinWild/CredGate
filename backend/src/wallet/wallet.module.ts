import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletProcessor } from './wallet.processor';
import { WalletController } from './wallet.controller';
import { ScoringModule } from 'src/scoring/scoring.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { WalletHistoryService } from 'src/blockchain/wallet-history.service';


@Module({
  imports: [
    ScoringModule,
    BlockchainModule,
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