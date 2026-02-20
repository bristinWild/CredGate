import { Controller, Get, Param } from '@nestjs/common';
import { WalletProcessor } from 'src/wallet/wallet.processor';

@Controller('wallet')
export class WalletController {

    constructor(private readonly walletProcessor: WalletProcessor) { }

    @Get(':address')
    async analyze(@Param('address') address: string) {
        return await this.walletProcessor.process(address);
    }
}
