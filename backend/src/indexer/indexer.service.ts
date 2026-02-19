import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Injectable()
export class IndexerService implements OnModuleInit {

    private mainnetProvider: ethers.JsonRpcProvider;

    constructor(private blockchainService: BlockchainService) { }

    async onModuleInit() {
        this.mainnetProvider = this.blockchainService.getMainnetProvider();
        const sepoliaProvider = this.blockchainService.getSepoliaProvider();

        const mainnet = await this.mainnetProvider.getNetwork();
        const sepolia = await sepoliaProvider.getNetwork();

        console.log('Mainnet connected:', mainnet.chainId);
        console.log('Sepolia connected:', sepolia.chainId);

    }



}
