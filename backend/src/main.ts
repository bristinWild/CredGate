import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RegistryWatcherService } from 'src/cron/registry-watcher.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  // const watcher = app.get(RegistryWatcherService);
  // await watcher.runCatchUp();
}
bootstrap();
