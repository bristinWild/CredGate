import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { AaveService } from './aave.service';
import { WalletHistoryService } from './wallet-history.service';
import { CreditRegistryService } from './credit-registry.service';
import { StablecoinTreasuryService } from 'src/blockchain/stablecoin-treasury/stablecoin-treasury.service'

@Module({
    providers: [
        ProviderService,
        AaveService,
        WalletHistoryService,
        CreditRegistryService,
        StablecoinTreasuryService,
    ],
    exports: [
        ProviderService,
        AaveService,
        WalletHistoryService,
        CreditRegistryService,
        StablecoinTreasuryService,
    ],
})
export class BlockchainModule { }