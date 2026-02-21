import { Controller, Get, Param } from '@nestjs/common';
import { CreditRegistryService } from 'src/blockchain/credit-registry.service';
import { WalletProcessor } from 'src/wallet/wallet.processor';

@Controller('wallet')
export class WalletController {

    constructor(private readonly walletProcessor: WalletProcessor,
        private readonly creditRegistryService: CreditRegistryService
    ) { }

    @Get(':address')
    async analyze(@Param('address') address: string) {
        return await this.walletProcessor.process(address);
    }

    @Get("onchain/:address")
    async getOnChain(@Param("address") address: string) {
        return await this.creditRegistryService.getOnChainScore(address);
    }
}
