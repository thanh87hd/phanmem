import { Injectable } from '@nestjs/common';

export interface IntentRule {
  intent: string;
  primaryKeywords: string[]; // weight 3
  secondaryKeywords: string[]; // weight 1
}

export const KITA_INTENT_RULES: IntentRule[] = [
  {
    intent: 'AUDIT_PLAN',
    primaryKeywords: [
      'kế hoạch',
      'cuộc kiểm toán',
      'engagement',
      'đoàn kiểm toán',
    ],
    secondaryKeywords: [
      'lịch',
      'phân công',
      'đoàn',
      'trưởng đoàn',
      'thành viên',
      'plan',
    ],
  },
  {
    intent: 'FINDING',
    primaryKeywords: ['phát hiện', 'finding', 'sai phạm', 'lỗ hổng', 'vi phạm'],
    secondaryKeywords: [
      'nghiêm trọng',
      'rủi ro phát hiện',
      'mẫu sai phạm',
      'loophole',
    ],
  },
  {
    intent: 'REGULATION_SPECIFIC_13',
    primaryKeywords: ['13/2018', 'thông tư 13'],
    secondaryKeywords: ['kiểm soát chéo', 'điều 14', 'điều 23'],
  },
  {
    intent: 'REGULATION_SPECIFIC_83',
    primaryKeywords: ['83/2025', 'thông tư 83'],
    secondaryKeywords: ['hạn mức tự động', 'điều 8'],
  },
  {
    intent: 'REGULATION',
    primaryKeywords: [
      'thông tư',
      'quy định',
      'tiêu chuẩn',
      'coso',
      'cobit',
      'iso',
      'basel',
    ],
    secondaryKeywords: ['pháp quy', 'luật', 'quy chế', 'văn bản', 'circular'],
  },
  {
    intent: 'CREDIT',
    primaryKeywords: [
      'tín dụng',
      'thẩm định',
      'giải ngân',
      'cho vay',
      'thế chấp',
      'tài sản bảo đảm',
    ],
    secondaryKeywords: [
      'phê duyệt',
      'hạn mức',
      'khoản vay',
      'nợ xấu',
      'credit',
    ],
  },
  {
    intent: 'IT_SYSTEM',
    primaryKeywords: [
      'core banking',
      'downtime',
      'bảo mật',
      'it',
      'log',
      'phân quyền',
    ],
    secondaryKeywords: ['hệ thống', 'lỗi', 'security', 'công nghệ'],
  },
  {
    intent: 'GENERAL_TASK',
    primaryKeywords: ['nhiệm vụ', 'công việc', 'task', 'giao việc', 'deadline'],
    secondaryKeywords: ['tiến độ', 'phân công', 'thực hiện'],
  },
  {
    intent: 'TIMESHEET',
    primaryKeywords: [
      'chấm công',
      'timesheet',
      'giờ làm',
      'man-hour',
      'giờ kiểm toán',
    ],
    secondaryKeywords: ['bảng công', 'nhật ký'],
  },
];

@Injectable()
export class IntentClassifierService {
  classifyIntent(message: string): { intent: string; score: number } {
    const lower = message.toLowerCase();
    let bestIntent = 'GENERAL';
    let maxScore = 0;

    for (const rule of KITA_INTENT_RULES) {
      let score = 0;
      for (const pk of rule.primaryKeywords) {
        if (lower.includes(pk.toLowerCase())) score += 3;
      }
      for (const sk of rule.secondaryKeywords) {
        if (lower.includes(sk.toLowerCase())) score += 1;
      }
      if (score > maxScore) {
        maxScore = score;
        bestIntent = rule.intent;
      }
    }

    return { intent: bestIntent, score: maxScore };
  }
}
