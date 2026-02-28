import { Test, TestingModule } from '@nestjs/testing';
import { CrosschainService } from './crosschain.service';

describe('CrosschainService', () => {
  let service: CrosschainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrosschainService],
    }).compile();

    service = module.get<CrosschainService>(CrosschainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
