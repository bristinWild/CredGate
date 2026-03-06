import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    Body,
    Headers,
    UnauthorizedException,
    NotFoundException,
    HttpCode,
    HttpStatus,
    ConflictException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

interface CreateKeyDto {
    name: string;
}

interface RequestKeyDto {
    name: string;
    walletAddress: string;
}

@Controller('api-keys')
export class ApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService) { }

    private checkAdminKey(adminKey: string | undefined): void {
        const expected = process.env.ADMIN_KEY;
        if (!expected) {
            throw new UnauthorizedException(
                'ADMIN_KEY env var not set — key management is disabled',
            );
        }
        if (adminKey !== expected) {
            throw new UnauthorizedException('Invalid admin key');
        }
    }


    @Post('request')
    requestKey(@Body() body: RequestKeyDto) {
        if (!body?.walletAddress?.match(/^0x[0-9a-fA-F]{40}$/i)) {
            throw new UnauthorizedException('Invalid wallet address');
        }
        if (!body?.name?.trim()) {
            throw new UnauthorizedException('name is required');
        }


        const existing = this.apiKeyService.getByWallet(body.walletAddress.toLowerCase());
        if (existing) {
            throw new ConflictException(
                'A key already exists for this wallet. Contact support to rotate it.',
            );
        }

        const apiKey = this.apiKeyService.generateKey(
            body.name.trim(),
            body.walletAddress.toLowerCase(),
        );

        return {
            message: 'API key created. Store it securely — it will not be shown again.',
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key,
            createdAt: apiKey.createdAt,
        };
    }


    @Post()
    create(
        @Headers('x-admin-key') adminKey: string,
        @Body() body: CreateKeyDto,
    ) {
        this.checkAdminKey(adminKey);

        if (!body?.name?.trim()) {
            return { error: 'name is required' };
        }

        const apiKey = this.apiKeyService.generateKey(body.name.trim());

        return {
            message: 'API key created. Store the key securely — it will not be shown again.',
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key,
            createdAt: apiKey.createdAt,
        };
    }


    @Get()
    list(@Headers('x-admin-key') adminKey: string) {
        this.checkAdminKey(adminKey);
        return { keys: this.apiKeyService.list() };
    }


    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    revoke(
        @Headers('x-admin-key') adminKey: string,
        @Param('id') id: string,
    ) {
        this.checkAdminKey(adminKey);

        const revoked = this.apiKeyService.revoke(id);
        if (!revoked) {
            throw new NotFoundException(`No API key found with id: ${id}`);
        }

        return { message: `API key ${id} revoked successfully` };
    }
}