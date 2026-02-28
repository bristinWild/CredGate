import { Test, TestingModule } from '@nestjs/testing';
import { DexService } from './dex.service';

describe('DexService', () => {
  let service: DexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DexService],
    }).compile();

    service = module.get<DexService>(DexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
