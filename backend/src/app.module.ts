import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainModule } from './blockchain/blockchain.module';
import { IndexerModule } from './indexer/indexer.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [BlockchainModule, IndexerModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
