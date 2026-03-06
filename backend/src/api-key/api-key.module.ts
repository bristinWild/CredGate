import { Module } from '@nestjs/common';
import { ApiKeyService } from 'src/api-key/api-key.service';
import { ApiKeyGuard } from 'src/api-key/api-key.gaurd';
import { ApiKeyController } from 'src/api-key/api-key.controller';

@Module({
    controllers: [ApiKeyController],
    providers: [ApiKeyService, ApiKeyGuard],
    exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule { }