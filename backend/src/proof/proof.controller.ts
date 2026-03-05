import { Controller } from '@nestjs/common';
import { Post, Body, Get, Param } from '@nestjs/common';
import { ProofService } from './proof.service';



@Controller('proof')
export class ProofController {
    constructor(private readonly proofService: ProofService) { }

    @Post('verify')
    async verify(@Body() body: { transactionHash: string }) {
        return this.proofService.processTransaction(body.transactionHash);
    }


    @Get('status/address/:address')
    getStatusByAddress(@Param('address') address: string) {
        const jobId = this.proofService.getJobIdByAddress(address);
        if (!jobId) {
            return { status: 'not_found' };
        }
        const job = this.proofService.getJobStatus(jobId);
        return { jobId, ...job };
    }

    @Get('status/:jobId')
    getStatus(@Param('jobId') jobId: string) {
        return this.proofService.getJobStatus(jobId);
    }
}
