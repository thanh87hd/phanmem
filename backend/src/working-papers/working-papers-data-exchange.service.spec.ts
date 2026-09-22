import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { WorkingPapersDataExchangeService } from './working-papers-data-exchange.service';
import { WorkingPaper } from './entities/working-paper.entity';
import { AuditSampleBatch } from '../audit-findings/entities/audit-sample-batch.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditFindingPersonnel } from '../audit-findings/entities/audit-finding-personnel.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

describe('WorkingPapersDataExchangeService', () => {
  let service: WorkingPapersDataExchangeService;
  let wpRepo: any;
  let batchRepo: any;
  let sampleRepo: any;
  let findingRepo: any;
  let personnelRepo: any;
  let recRepo: any;
  let dataSource: any;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    wpRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    batchRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    sampleRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      create: jest.fn(),
      save: jest.fn(),
    };
    findingRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    personnelRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    recRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingPapersDataExchangeService,
        { provide: getRepositoryToken(WorkingPaper), useValue: wpRepo },
        { provide: getRepositoryToken(AuditSampleBatch), useValue: batchRepo },
        { provide: getRepositoryToken(AuditSample), useValue: sampleRepo },
        { provide: getRepositoryToken(AuditFinding), useValue: findingRepo },
        {
          provide: getRepositoryToken(AuditFindingPersonnel),
          useValue: personnelRepo,
        },
        { provide: getRepositoryToken(Recommendation), useValue: recRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WorkingPapersDataExchangeService>(
      WorkingPapersDataExchangeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCreditTemplate', () => {
    it('should generate an Excel credit template buffer', async () => {
      const buffer = await service.generateCreditTemplate();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });

  describe('generatePtdTemplate', () => {
    it('should generate an Excel PTD template buffer', async () => {
      const buffer = await service.generatePtdTemplate();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });

  describe('exportCreditWorkingPaper', () => {
    it('should throw BadRequestException if working paper does not exist', async () => {
      wpRepo.findOne.mockResolvedValue(null);
      await expect(service.exportCreditWorkingPaper(999)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should export credit working paper to Excel buffer', async () => {
      wpRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Kiểm toán Tín dụng CN Thăng Long',
        engagement: { name: 'Đoàn KT CN Thăng Long' },
      });
      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 1,
          sequenceNo: 1,
          sampleCode: 'SMP-001',
          testResult: 'FAIL',
          fieldValues: {
            tenCN: 'CN Thăng Long',
            maKH: 'KH10002',
            tenKH: 'Công ty CP May Mặc',
            duNoTyDong: 15.5,
            nhomNo: 2,
            ktv: 'Nguyễn Văn A',
            mucDichVay: 'Bổ sung Vốn lưu động',
            phanLoaiKH: 'KHDN',
            noiDungTruocGT: 'Thiếu hồ sơ tài sản đảm bảo định kỳ',
            dvkdGiaiTrinh: 'Đang chờ thẩm định giá lại',
            doanKTTraLoi: 'Chưa đủ cơ sở chấp thuận',
            nhomRuiRo: 'Tín dụng',
            danhMucRuiRo: 'Tài sản bảo đảm',
            ruiRoChiTiet: 'Định giá chưa chuẩn xác',
            nguyenNhanViPham: 'Chậm trễ quy trình định giá',
            phanLoaiNguyenNhan: 'Chủ quan',
            mucDoRuiRo: 'High',
            chatLuongKiemSoat: 'Weak',
            ruiRoConLai: 'High',
            kienNghi: 'Yêu cầu hoàn tất định giá lại trong 15 ngày',
            thoiHanThucHien: '2026-10-31',
          },
        },
      ]);

      const buffer = await service.exportCreditWorkingPaper(1);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });

  describe('exportPtdWorkingPaper', () => {
    it('should export empty PTD template when no samples exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const buffer = await service.exportPtdWorkingPaper(888);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });

    it('should export PTD working paper with sample rows to Excel buffer', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 2,
          sequenceNo: 1,
          sampleCode: 'PTD-001',
          testResult: 'PASS',
          fieldValues: {
            soChungTu: 'CT-999',
            ngayGiaoDich: '2026-08-01',
            soTien: 500000000,
            noiDungKiemTra: 'Kiểm tra duyệt chi chữ ký 2 cấp',
            ketQua: 'Đạt yêu cầu',
          },
        },
      ]);

      const buffer = await service.exportPtdWorkingPaper(2);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });
});
