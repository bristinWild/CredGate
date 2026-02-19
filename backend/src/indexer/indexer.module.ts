import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Module({
  providers: [IndexerService]
})
export class IndexerModule {}
