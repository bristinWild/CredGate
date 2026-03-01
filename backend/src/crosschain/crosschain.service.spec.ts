import { Test, TestingModule } from '@nestjs/testing';
import { CrossChainService } from './crosschain.service';

describe('CrosschainService', () => {
  let service: CrossChainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrossChainService],
    }).compile();

    service = module.get<CrossChainService>(CrossChainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
