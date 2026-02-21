import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletHistoryService } from 'src/blockchain/wallet-history.service';
import { AaveService } from 'src/blockchain/aave.service';
import { ProviderService } from 'src/blockchain/provider.service';
import { WalletProcessor } from './wallet.processor';
import { WalletController } from './wallet.controller';
import { ScoringModule } from 'src/scoring/scoring.module';

@Module({
  imports: [ScoringModule],
  providers: [WalletService, WalletProcessor, AaveService, ProviderService, WalletHistoryService],
  exports: [WalletService, WalletProcessor],
  controllers: [WalletController],
})
export class WalletModule { }
