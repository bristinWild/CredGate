import { Module } from '@nestjs/common';
import { DexService } from 'src/dex/dex.service';

@Module({
    providers: [DexService],
    exports: [DexService],
})
export class DexModule { }
