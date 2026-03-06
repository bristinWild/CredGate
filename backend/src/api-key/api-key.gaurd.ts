import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly apiKeyService: ApiKeyService) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();


        if (req.path.startsWith('/api-keys')) {
            return true;
        }

        const key =
            req.headers['x-api-key'] as string | undefined;

        if (!key) {
            throw new UnauthorizedException('Missing x-api-key header');
        }

        const apiKey = this.apiKeyService.validate(key);
        if (!apiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        if (this.apiKeyService.isRateLimited(key)) {
            const { resetIn } = this.apiKeyService.getRateLimitStatus(key);
            res.setHeader('X-RateLimit-Limit', '100');
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));
            throw new HttpException(
                'Rate limit exceeded. Max 100 requests/minute.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        this.apiKeyService.recordUsage(key);

        (req as any).apiKey = apiKey;

        const { remaining, resetIn } = this.apiKeyService.getRateLimitStatus(key);
        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));

        return true;
    }
}