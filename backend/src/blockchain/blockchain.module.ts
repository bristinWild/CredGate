import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { AaveService } from './aave.service';
import { WalletHistoryService } from './wallet-history.service';
import { CreditRegistryService } from './credit-registry.service';

@Module({
    providers: [
        ProviderService,
        AaveService,
        WalletHistoryService,
        CreditRegistryService,
    ],
    exports: [
        ProviderService,
        AaveService,
        WalletHistoryService,
        CreditRegistryService,
    ],
})
export class BlockchainModule { }