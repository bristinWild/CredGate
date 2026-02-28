import { Module } from '@nestjs/common';
import { CrossChainService } from 'src/crosschain/crosschain.service';

@Module({
    providers: [CrossChainService],
    exports: [CrossChainService],
})
export class CrossChainModule { }
