import { Test, TestingModule } from '@nestjs/testing';
import { IntentClassifierService } from './intent-classifier.service';

describe('IntentClassifierService', () => {
  let service: IntentClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentClassifierService],
    }).compile();

    service = module.get<IntentClassifierService>(IntentClassifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyIntent', () => {
    it('should classify AUDIT_PLAN intent', () => {
      const result = service.classifyIntent(
        'Xem kế hoạch cuộc kiểm toán năm 2026',
      );
      expect(result.intent).toBe('AUDIT_PLAN');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify FINDING intent', () => {
      const result = service.classifyIntent(
        'Tìm các sai phạm và lỗ hổng nghiêm trọng',
      );
      expect(result.intent).toBe('FINDING');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify REGULATION_SPECIFIC_13 intent', () => {
      const result = service.classifyIntent(
        'Quy định kiểm soát chéo theo thông tư 13/2018',
      );
      expect(result.intent).toBe('REGULATION_SPECIFIC_13');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify REGULATION_SPECIFIC_83 intent', () => {
      const result = service.classifyIntent(
        'Hạn mức tự động theo thông tư 83/2025 điều 8',
      );
      expect(result.intent).toBe('REGULATION_SPECIFIC_83');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify CREDIT intent', () => {
      const result = service.classifyIntent(
        'Kiểm tra quy trình thẩm định giải ngân tín dụng cho vay',
      );
      expect(result.intent).toBe('CREDIT');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify IT_SYSTEM intent', () => {
      const result = service.classifyIntent(
        'Hệ thống core banking gặp downtime lỗi bảo mật IT',
      );
      expect(result.intent).toBe('IT_SYSTEM');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify TIMESHEET intent', () => {
      const result = service.classifyIntent(
        'Cập nhật bảng chấm công timesheet man-hour',
      );
      expect(result.intent).toBe('TIMESHEET');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should classify GENERAL_TASK intent', () => {
      const result = service.classifyIntent(
        'Kiểm tra tiến độ giao việc task deadline',
      );
      expect(result.intent).toBe('GENERAL_TASK');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should fallback to GENERAL when no keywords match', () => {
      const result = service.classifyIntent(
        'xin chào buổi sáng hôm nay thời tiết đẹp',
      );
      expect(result.intent).toBe('GENERAL');
      expect(result.score).toBe(0);
    });
  });
});
