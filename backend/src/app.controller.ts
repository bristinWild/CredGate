import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RegistryWatcherService } from 'src/cron/registry-watcher.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly registryWatcherService: RegistryWatcherService
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('worker/stats')
  getWorkerStats() {
    return this.registryWatcherService.getStats();
  }
}
