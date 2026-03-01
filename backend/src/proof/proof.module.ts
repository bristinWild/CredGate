import { Module } from '@nestjs/common';
import { ProofController } from 'src/proof/proof.controller';
import { ProofService } from 'src/proof/proof.service';
import { RegistryWatcherService } from 'src/cron/registry-watcher.service';

@Module({
    providers: [ProofService,],
    controllers: [ProofController,],
    exports: [ProofService],
})
export class ProofModule { }
