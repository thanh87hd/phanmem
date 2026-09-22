import * as fs from 'fs';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TemplateEngineService } from './template-engine.service';

jest.mock('fs');
jest.mock('pizzip', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({})),
  };
});
jest.mock('docxtemplater', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      render: jest.fn(),
      getZip: jest.fn(() => ({
        generate: jest.fn(() => Buffer.from('mock-rendered-docx')),
      })),
    })),
  };
});

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateEngineService],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('renderDocx', () => {
    it('should throw NotFoundException if template file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(service.renderDocx('non_existent.docx', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should render docx template and return buffer', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('binary-data');

      const buffer = await service.renderDocx('MB01A.docx', {
        title: 'Test Plan',
      });
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe('getStaticTemplate', () => {
    it('should throw NotFoundException if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(service.getStaticTemplate('BA01.docx')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return raw template file buffer', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        Buffer.from('static-template-bytes'),
      );

      const buffer = await service.getStaticTemplate('BA01.docx');
      expect(buffer.toString()).toBe('static-template-bytes');
    });
  });

  describe('template resolvers', () => {
    it('should resolve audit plan template correctly', () => {
      expect(service.getAuditPlanTemplate('DVKD', 'Unplanned')).toBe(
        'MB02A.docx',
      );
      expect(service.getAuditPlanTemplate('HoiSo', 'Planned')).toBe(
        'MB03A.docx',
      );
      expect(service.getAuditPlanTemplate('DVKD', 'Planned')).toBe(
        'MB01A.docx',
      );
    });

    it('should resolve audit report template correctly', () => {
      expect(service.getAuditReportTemplate('DVKD', 'Unplanned')).toBe(
        'MB02B.docx',
      );
      expect(service.getAuditReportTemplate('HeThong', 'Planned')).toBe(
        'MB03B.docx',
      );
      expect(service.getAuditReportTemplate('DVKD', 'Planned')).toBe(
        'MB01B.docx',
      );
    });

    it('should resolve summary report template correctly', () => {
      expect(service.getSummaryReportTemplate('ChuyenDe')).toBe('MB06B.docx');
      expect(service.getSummaryReportTemplate('DVKD')).toBe('MB06A.docx');
    });
  });
});
