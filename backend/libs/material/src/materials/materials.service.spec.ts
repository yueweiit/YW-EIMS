import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { MaterialsService } from './materials.service';

describe('MaterialsService', () => {
  let service: MaterialsService;

  const mockPrisma = {
    material: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    unit: {
      findFirst: jest.fn(),
    },
    materialCodeRule: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // findPage
  // ---------------------------------------------------------------------------
  describe('findPage', () => {
    it('should return paginated records with total and current page info', async () => {
      const records = [{ id: 1, materialName: 'Test' }];
      mockPrisma.material.findMany.mockResolvedValue(records);
      mockPrisma.material.count.mockResolvedValue(1);

      const result = await service.findPage({ current: 1, size: 10 });

      expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(mockPrisma.material.count).toHaveBeenCalled();
      expect(result).toEqual({ records, total: 1, current: 1, size: 10 });
    });

    it('should pass query filters to prisma when provided', async () => {
      mockPrisma.material.findMany.mockResolvedValue([]);
      mockPrisma.material.count.mockResolvedValue(0);

      await service.findPage({ current: 1, size: 20, materialName: 'bolt' });

      expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            materialName: { contains: 'bolt' },
          }),
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a material when found', async () => {
      const material = { id: 1, materialName: 'Bolt M8' };
      mockPrisma.material.findUnique.mockResolvedValue(material);

      const result = await service.findOne(1);

      expect(mockPrisma.material.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(material);
    });

    it('should throw NotFoundException when material does not exist', async () => {
      mockPrisma.material.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const baseDto = {
      code: 'MT001',
      unit: '个',
      applicant: '张三',
      materialName: '测试物料',
    };

    it('should compute codePrefix from leading letters of code and resolve explainContent', async () => {
      const mockRule = { codePrefix: 'MT', explainContent: '模具' };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.unit.findFirst.mockResolvedValue({
        unitCode: '01',
        unit: '个',
      });
      mockPrisma.material.create.mockResolvedValue({
        id: 1,
        ...baseDto,
        codePrefix: 'MT',
        explainContent: '模具',
        unitCode: '01',
      });

      const result = await service.create(baseDto);

      expect(mockPrisma.materialCodeRule.findUnique).toHaveBeenCalledWith({
        where: { codePrefix: 'MT' },
      });
      expect(mockPrisma.unit.findFirst).toHaveBeenCalledWith({
        where: { unit: '个' },
      });
      expect(mockPrisma.material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codePrefix: 'MT',
            explainContent: '模具',
            unitCode: '01',
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          codePrefix: 'MT',
          explainContent: '模具',
          unitCode: '01',
        }),
      );
    });

    it('should normalize lowercase code prefix to uppercase', async () => {
      const mockRule = {
        codePrefix: 'YL',
        explainContent: 'Materia prima原料',
      };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.unit.findFirst.mockResolvedValue({
        unitCode: '01',
        unit: 'kg',
      });
      mockPrisma.material.create.mockResolvedValue({
        id: 3,
        code: 'yl000001',
        codePrefix: 'YL',
        explainContent: 'Materia prima原料',
        unitCode: '01',
      });

      const result = await service.create({
        ...baseDto,
        code: 'yl000001',
        unit: 'kg',
      });

      expect(mockPrisma.materialCodeRule.findUnique).toHaveBeenCalledWith({
        where: { codePrefix: 'YL' },
      });
      expect(result.codePrefix).toBe('YL');
    });

    it('should default explainContent to 未定义前缀说明 when no matching rule exists', async () => {
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(null);
      mockPrisma.unit.findFirst.mockResolvedValue({
        unitCode: '01',
        unit: '个',
      });
      mockPrisma.material.create.mockResolvedValue({
        id: 2,
        codePrefix: 'XX',
        explainContent: '未定义前缀说明',
        unitCode: '01',
      });

      const dto = { ...baseDto, code: 'XX001' };
      const result = await service.create(dto);

      expect(mockPrisma.material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ explainContent: '未定义前缀说明' }),
        }),
      );
      expect(result.explainContent).toBe('未定义前缀说明');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should recompute derived fields when code changes', async () => {
      const existing = { id: 1, code: 'MT001', unit: '个', unitCode: '01' };
      mockPrisma.material.findUnique.mockResolvedValue(existing);
      const mockRule = { codePrefix: 'AB', explainContent: '新类别' };
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.unit.findFirst.mockResolvedValue(null);
      mockPrisma.material.update.mockResolvedValue({
        ...existing,
        code: 'AB001',
        codePrefix: 'AB',
        explainContent: '新类别',
      });

      const result = await service.update(1, { code: 'AB001' });

      expect(mockPrisma.materialCodeRule.findUnique).toHaveBeenCalledWith({
        where: { codePrefix: 'AB' },
      });
      expect(mockPrisma.material.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            codePrefix: 'AB',
            explainContent: '新类别',
          }),
        }),
      );
      expect(result.codePrefix).toBe('AB');
    });

    it('should recompute unitCode when unit changes', async () => {
      const existing = { id: 1, code: 'MT001', unit: '个', unitCode: '01' };
      mockPrisma.material.findUnique.mockResolvedValue(existing);
      mockPrisma.materialCodeRule.findUnique.mockResolvedValue(null);
      mockPrisma.unit.findFirst.mockResolvedValue({
        unitCode: '02',
        unit: '箱',
      });
      mockPrisma.material.update.mockResolvedValue({
        ...existing,
        unit: '箱',
        unitCode: '02',
      });

      const result = await service.update(1, { unit: '箱' });

      expect(mockPrisma.unit.findFirst).toHaveBeenCalledWith({
        where: { unit: '箱' },
      });
      expect(mockPrisma.material.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ unitCode: '02' }),
        }),
      );
      expect(result.unitCode).toBe('02');
    });
  });

  // ---------------------------------------------------------------------------
  // generateCode
  // ---------------------------------------------------------------------------
  describe('generateCode', () => {
    it('should return prefix with zero-padded 6-digit suffix starting from 001', async () => {
      mockPrisma.material.findFirst.mockResolvedValue(null);

      const result = await service.generateCode('MT');

      expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { codePrefix: 'MT' },
          orderBy: { code: 'desc' },
        }),
      );
      expect(result).toBe('MT000001');
    });

    it('should increment the numeric suffix when materials with the prefix exist', async () => {
      mockPrisma.material.findFirst.mockResolvedValue({ code: 'MT000005' });

      const result = await service.generateCode('MT');

      expect(result).toBe('MT000006');
    });

    it('should handle codes with larger numeric suffix correctly', async () => {
      mockPrisma.material.findFirst.mockResolvedValue({ code: 'MT000042' });

      const result = await service.generateCode('MT');

      expect(result).toBe('MT000043');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should call prisma.material.delete with the given id', async () => {
      mockPrisma.material.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.material.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);

      expect(mockPrisma.material.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.material.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeNull();
    });

    it('should throw NotFoundException when material does not exist', async () => {
      mockPrisma.material.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.material.delete).not.toHaveBeenCalled();
    });
  });
});
