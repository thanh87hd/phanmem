import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { MonitorService } from './monitor.service';
import * as si from 'systeminformation';

jest.mock('systeminformation', () => ({
  currentLoad: jest.fn().mockResolvedValue({ currentLoad: 25.5 }),
  mem: jest.fn().mockResolvedValue({
    total: 16 * 1024 ** 3,
    active: 8 * 1024 ** 3,
  }),
  fsSize: jest.fn().mockResolvedValue([
    {
      mount: 'C:',
      size: 512 * 1024 ** 3,
      used: 256 * 1024 ** 3,
      use: 50,
    },
  ]),
}));

describe('MonitorService', () => {
  let service: MonitorService;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitorService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<MonitorService>(MonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServerStats', () => {
    it('should return parsed system metrics', async () => {
      const stats = await service.getServerStats();
      expect(stats.cpuLoad).toBe(25.5);
      expect(stats.ramTotal).toBe(16);
      expect(stats.ramUsed).toBe(8);
      expect(stats.ramPercent).toBe(50);
      expect(stats.diskTotal).toBe(512);
      expect(stats.diskUsed).toBe(256);
      expect(stats.diskPercent).toBe(50);
      expect(stats.uptime).toBeDefined();
    });

    it('should handle errors gracefully and return empty object', async () => {
      (si.currentLoad as jest.Mock).mockRejectedValueOnce(
        new Error('System info failure'),
      );
      const stats = await service.getServerStats();
      expect(stats).toEqual({});
    });
  });

  describe('getDatabaseStats', () => {
    it('should return active connections and slow queries', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ active_connections: '12' }])
        .mockResolvedValueOnce([
          {
            query: 'SELECT 1',
            calls: 5,
            total_exec_time: 200,
            mean_exec_time: 40,
          },
        ]);

      const stats = await service.getDatabaseStats();
      expect(stats.activeConnections).toBe(12);
      expect(stats.slowQueries).toHaveLength(1);
    });

    it('should fallback to mock slow queries if pg_stat_statements fails', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ active_connections: '5' }])
        .mockRejectedValueOnce(
          new Error('relation pg_stat_statements does not exist'),
        );

      const stats = await service.getDatabaseStats();
      expect(stats.activeConnections).toBe(5);
      expect(stats.slowQueries.length).toBeGreaterThan(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue metrics', async () => {
      const queues = await service.getQueueStats();
      expect(queues.reportsQueue).toBeDefined();
      expect(queues.workingPapersQueue).toBeDefined();
    });
  });
});
