import { Test, TestingModule } from '@nestjs/testing';
import { ExternalDatabaseService } from './external-database.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExternalDatabaseConnection } from './external-database.entity';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseType } from './external-database.dto';
import * as dns from 'node:dns/promises';
import { DataSource } from 'typeorm';

jest.mock('node:dns/promises');
jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([{ result: 'OK' }]),
      destroy: jest.fn().mockResolvedValue(undefined),
      isInitialized: true,
    })),
  };
});

describe('ExternalDatabaseService', () => {
  let service: ExternalDatabaseService;

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 'conn-1', ...dto })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (dns.lookup as jest.Mock).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalDatabaseService,
        {
          provide: getRepositoryToken(ExternalDatabaseConnection),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ExternalDatabaseService>(ExternalDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD', () => {
    it('should create database connection', async () => {
      const dto = {
        name: 'Core DB',
        type: DatabaseType.POSTGRES,
        host: 'db.example.com',
        port: 5432,
        database: 'core',
        username: 'user',
      };
      const result = await service.create(dto);
      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should findAll connections', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'conn-1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should findOne connection or throw HttpException', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'conn-1' });
      const result = await service.findOne('conn-1');
      expect(result.id).toBe('conn-1');

      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('conn-999')).rejects.toThrow(HttpException);
    });

    it('should update connection', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'conn-1', name: 'Old' });
      const result = await service.update('conn-1', { name: 'New' });
      expect(result.name).toBe('New');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should remove connection', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'conn-1' });
      await service.remove('conn-1');
      expect(mockRepo.remove).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return success when connection initializes successfully', async () => {
      const result = await service.testConnection({
        type: DatabaseType.POSTGRES,
        host: 'db.example.com',
        port: 5432,
        database: 'test_db',
        username: 'user',
        password: 'pwd',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Kết nối thành công');
    });

    it('should return failure when connection initialization fails', async () => {
      (DataSource as unknown as jest.Mock).mockImplementationOnce(() => ({
        initialize: jest
          .fn()
          .mockRejectedValue(new Error('Connection timed out')),
        destroy: jest.fn().mockResolvedValue(undefined),
        isInitialized: false,
      }));

      const result = await service.testConnection({
        type: DatabaseType.POSTGRES,
        host: 'db.example.com',
        port: 5432,
        database: 'test_db',
        username: 'user',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Kết nối thất bại');
    });
  });

  describe('queryExternalDb & querySavedDb', () => {
    it('should reject destructive non-SELECT queries', async () => {
      await expect(
        service.queryExternalDb({
          type: DatabaseType.POSTGRES,
          host: 'db.example.com',
          port: 5432,
          database: 'db',
          username: 'user',
          query: 'DROP TABLE users;',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should execute valid SELECT query', async () => {
      const rows = await service.queryExternalDb({
        type: DatabaseType.POSTGRES,
        host: 'db.example.com',
        port: 5432,
        database: 'db',
        username: 'user',
        query: 'SELECT * FROM customers;',
      });

      expect(rows).toEqual([{ result: 'OK' }]);
    });

    it('should execute query on saved connection', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'conn-1',
        type: DatabaseType.POSTGRES,
        host: 'db.example.com',
        port: 5432,
        database: 'db',
        username: 'user',
        password: 'pwd',
      });

      const rows = await service.querySavedDb('conn-1', 'SELECT 1;');
      expect(rows).toEqual([{ result: 'OK' }]);
    });
  });
});
