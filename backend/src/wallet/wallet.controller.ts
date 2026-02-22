import { Controller, Get, Param, Post } from '@nestjs/common';
import { CreditRegistryService } from 'src/blockchain/credit-registry.service';
import { WalletProcessor } from 'src/wallet/wallet.processor';

@Controller('wallet')
export class WalletController {

    constructor(private readonly walletProcessor: WalletProcessor,
        private readonly creditRegistryService: CreditRegistryService
    ) { }

    @Post("analyze/:address")
    async analyze(@Param("address") address: string) {
        return this.walletProcessor.startJob(address);
    }

    @Get("result/:address")
    async getResult(@Param("address") address: string) {
        return this.walletProcessor.getResult(address);
    }

    @Get("onchain/:address")
    async getOnChain(@Param("address") address: string) {
        return await this.creditRegistryService.getOnChainScore(address);
    }
}
