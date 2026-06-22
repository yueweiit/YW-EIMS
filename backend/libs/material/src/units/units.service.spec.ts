import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { UnitsService } from './units.service';

describe('UnitsService', () => {
  let service: UnitsService;

  const mockPrisma = {
    unit: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    material: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // findPage
  // ---------------------------------------------------------------------------
  describe('findPage', () => {
    it('should return paginated records with total', async () => {
      const records = [{ unitCode: '01', unit: '个' }];
      mockPrisma.unit.findMany.mockResolvedValue(records);
      mockPrisma.unit.count.mockResolvedValue(1);

      const result = await service.findPage({ current: 1, size: 10 });

      expect(mockPrisma.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(mockPrisma.unit.count).toHaveBeenCalled();
      expect(result).toEqual({ records, total: 1, current: 1, size: 10 });
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a unit when found', async () => {
      const unit = { unitCode: '01', unit: '个' };
      mockPrisma.unit.findUnique.mockResolvedValue(unit);

      const result = await service.findOne('01');

      expect(mockPrisma.unit.findUnique).toHaveBeenCalledWith({
        where: { unitCode: '01' },
      });
      expect(result).toEqual(unit);
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create a unit and return it', async () => {
      const dto = { unitCode: '03', unit: '箱' };
      const created = { unitCode: '03', unit: '箱' };
      mockPrisma.unit.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.unit.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should update a unit and return it', async () => {
      const existing = { unitCode: '01', unit: '个' };
      mockPrisma.unit.findUnique.mockResolvedValue(existing);
      mockPrisma.unit.update.mockResolvedValue({ ...existing, unit: '只' });

      const result = await service.update('01', { unit: '只' });

      expect(mockPrisma.unit.update).toHaveBeenCalledWith({
        where: { unitCode: '01' },
        data: { unit: '只' },
      });
      expect(result.unit).toBe('只');
    });

    it('should throw BadRequestException when dto.unitCode differs from param', async () => {
      await expect(service.update('01', { unitCode: '02' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow updating unit name to the same value', async () => {
      const existing = { unitCode: '01', unit: '个' };
      mockPrisma.unit.findUnique.mockResolvedValue(existing);
      mockPrisma.unit.update.mockResolvedValue(existing);

      const result = await service.update('01', { unit: '个' });

      expect(result).toEqual(existing);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should delete the unit when no materials reference it', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        unitCode: '01',
        unit: '个',
      });
      mockPrisma.material.count.mockResolvedValue(0);
      mockPrisma.unit.delete.mockResolvedValue({ unitCode: '01', unit: '个' });

      const result = await service.remove('01');

      expect(mockPrisma.unit.findUnique).toHaveBeenCalledWith({
        where: { unitCode: '01' },
      });
      expect(mockPrisma.material.count).toHaveBeenCalledWith({
        where: { unitCode: '01' },
      });
      expect(mockPrisma.unit.delete).toHaveBeenCalledWith({
        where: { unitCode: '01' },
      });
      expect(result).toBeNull();
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.remove('99')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.material.count).not.toHaveBeenCalled();
      expect(mockPrisma.unit.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when materials reference the unit', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        unitCode: '01',
        unit: '个',
      });
      mockPrisma.material.count.mockResolvedValue(5);

      await expect(service.remove('01')).rejects.toThrow(ConflictException);

      expect(mockPrisma.unit.delete).not.toHaveBeenCalled();
    });
  });
});
