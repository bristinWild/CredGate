import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
//import { RegistryWatcherService } from 'src/cron/registry-watcher.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-admin-key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  });
  await app.listen(port);
  // const watcher = app.get(RegistryWatcherService);
  // await watcher.runCatchUp();

  console.log(`CredGate API running on port ${port}`);
  console.log(`API key auth: enabled (all routes require x-api-key)`);
  console.log(`Key management: POST/GET/DELETE /api-keys (requires x-admin-key)`);
}
bootstrap();
