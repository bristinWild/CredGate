import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ScoreService } from './scoring/score.service';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), WalletModule],
  controllers: [AppController],
  providers: [AppService, ScoreService],
})
export class AppModule { }
