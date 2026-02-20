import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ScoringService } from './scoring/scoring.service';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), WalletModule],
  controllers: [AppController],
  providers: [AppService, ScoringService],
})
export class AppModule { }
