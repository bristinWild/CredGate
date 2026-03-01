import { Module } from '@nestjs/common';
import { RegistryWatcherService } from 'src/cron/registry-watcher.service';
import { ProofModule } from 'src/proof/proof.module';

@Module({
    imports: [ProofModule],
    providers: [RegistryWatcherService],
    exports: [RegistryWatcherService],
})
export class CronModule { }
