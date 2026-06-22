import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { MaterialCodeRulesService } from './code-rules.service';

describe('MaterialCodeRulesService', () => {
  let service: MaterialCodeRulesService;

  const mockPrisma = {
    $transaction: jest.fn(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
    ),
    materialCodeRule: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    material: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialCodeRulesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MaterialCodeRulesService>(MaterialCodeRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // findPage
  // ---------------------------------------------------------------------------
  describe('findPage', () => {
    it('should return paginated code rules', async () => {
      const records = [{ codePrefix: 'MT', explainContent: '模具' }];
      mockPrisma.materialCodeRule.findMany.mockResolvedValue(records);
      mockPrisma.materialCodeRule.count.mockResolvedValue(1);

      const result = await service.findPage({ current: 1, size: 10 });

      expect(mockPrisma.materialCodeRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(mockPrisma.materialCodeRule.count).toHaveBeenCalled();
      expect(result).toEqual({ records, total: 1, current: 1, size: 10 });
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a rule when found', async () => {
      const rule = { codePrefix: 'MT', explainContent: '模具' };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(rule);

      const result = await service.findOne('MT');

      expect(mockPrisma.materialCodeRule.findUnique).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
      });
      expect(result).toEqual(rule);
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('XX')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create a code rule and return it', async () => {
      const dto = { codePrefix: 'AB', explainContent: '新类别' };
      mockPrisma.materialCodeRule.create.mockResolvedValue(dto);

      const result = await service.create(dto);

      expect(mockPrisma.materialCodeRule.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(result).toEqual(dto);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should update the code rule and cascade explainContent to matching materials', async () => {
      const existing = { codePrefix: 'MT', explainContent: '模具' };
      const dto = { explainContent: '模具/夹具' };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(existing);
      mockPrisma.materialCodeRule.update.mockResolvedValue({
        ...existing,
        ...dto,
      });
      mockPrisma.material.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.update('MT', dto);

      expect(mockPrisma.materialCodeRule.update).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
        data: dto,
      });
      expect(mockPrisma.material.updateMany).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
        data: { explainContent: '模具/夹具' },
      });
      expect(result.explainContent).toBe('模具/夹具');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should delete the code rule and set matching materials explainContent to null', async () => {
      const existing = { codePrefix: 'MT', explainContent: '模具' };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(existing);
      mockPrisma.materialCodeRule.delete.mockResolvedValue(existing);
      mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.remove('MT');

      expect(mockPrisma.material.updateMany).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
        data: { explainContent: null },
      });
      expect(mockPrisma.materialCodeRule.delete).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
      });
      expect(result).toBeNull();
    });
  });
});
