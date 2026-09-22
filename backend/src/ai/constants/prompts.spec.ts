import {
  FINDING_ANALYSIS_SYSTEM_PROMPT,
  buildFindingAnalysisUserPrompt,
  WORKING_PAPER_SYSTEM_PROMPT,
  buildWorkingPaperUserPrompt,
  RCM_SYSTEM_PROMPT,
  buildRcmUserPrompt,
  SMART_EVIDENCE_SYSTEM_PROMPT,
  buildSmartEvidenceUserPrompt,
  KITA_CHAT_SYSTEM_PROMPT,
  buildKitaContextMessage,
  buildDuplicateFindingPrompt,
} from './prompts';

describe('AI Prompts Architecture & Optimization Tests', () => {
  describe('1. Finding Analysis Prompt (RCA 5-Whys)', () => {
    it('should define comprehensive system prompt with 5-Whys, IIA, and NHNN rules', () => {
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toBeDefined();
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('LPBank');
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('IIA');
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('5-Whys');
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('suggestedRiskLevel');
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('suggestedCategory');
      expect(FINDING_ANALYSIS_SYSTEM_PROMPT).toContain('/no_think');
    });

    it('should build user prompt containing description and expected JSON schema', () => {
      const desc = 'Giải ngân trước khi hoàn tất thủ tục thế chấp đất';
      const prompt = buildFindingAnalysisUserPrompt(desc);
      expect(prompt).toContain(desc);
      expect(prompt).toContain('suggestedRca');
      expect(prompt).toContain('suggestedRecommendation');
      expect(prompt).toContain('suggestedCriteria');
    });
  });

  describe('2. Working Paper Prompt (IIA Standard)', () => {
    it('should define working paper system prompt aligned with IIA 2024', () => {
      expect(WORKING_PAPER_SYSTEM_PROMPT).toBeDefined();
      expect(WORKING_PAPER_SYSTEM_PROMPT).toContain('IIA Standard 2024');
      expect(WORKING_PAPER_SYSTEM_PROMPT).toContain('objectives');
      expect(WORKING_PAPER_SYSTEM_PROMPT).toContain('referencePrefix');
      expect(WORKING_PAPER_SYSTEM_PROMPT).toContain('CREDIT');
      expect(WORKING_PAPER_SYSTEM_PROMPT).toContain('/no_think');
    });

    it('should build working paper user prompt with title and structured schema', () => {
      const title = 'Kiểm toán quy trình cấp tín dụng bán lẻ';
      const prompt = buildWorkingPaperUserPrompt(title);
      expect(prompt).toContain(title);
      expect(prompt).toContain('sampleSelection');
      expect(prompt).toContain('procedures');
      expect(prompt).toContain('domainLabel');
    });
  });

  describe('3. Risk & Control Matrix (RCM) Prompt', () => {
    it('should define RCM system prompt with COSO/Basel and control types', () => {
      expect(RCM_SYSTEM_PROMPT).toBeDefined();
      expect(RCM_SYSTEM_PROMPT).toContain('COSO');
      expect(RCM_SYSTEM_PROMPT).toContain('Preventive');
      expect(RCM_SYSTEM_PROMPT).toContain('Detective');
      expect(RCM_SYSTEM_PROMPT).toContain('controlAutomation');
      expect(RCM_SYSTEM_PROMPT).toContain('/no_think');
    });

    it('should build RCM user prompt requesting JSON array of controls', () => {
      const processName = 'Quy trình giải ngân vốn vay doanh nghiệp';
      const prompt = buildRcmUserPrompt(processName);
      expect(prompt).toContain(processName);
      expect(prompt).toContain('inherentRiskScore');
      expect(prompt).toContain('testProcedure');
    });
  });

  describe('4. Smart Evidence Verifier Prompt', () => {
    it('should enforce 4 pillars of audit evidence verification in system prompt', () => {
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toBeDefined();
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('Relevance');
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('Authenticity');
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('Completeness');
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('Timeliness');
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('estimatedProgress');
      expect(SMART_EVIDENCE_SYSTEM_PROMPT).toContain('/no_think');
    });

    it('should build evidence user prompt with file details and recommendation', () => {
      const fileName = 'Bien_ban_kiem_ke_quy_2026.pdf';
      const desc = 'Biên bản kiểm kê quỹ tiền mặt có chữ ký KSV';
      const rec = 'Đơn vị phải thực hiện kiểm kê kép và ký xác nhận';
      const prompt = buildSmartEvidenceUserPrompt(fileName, desc, rec);
      expect(prompt).toContain(fileName);
      expect(prompt).toContain(desc);
      expect(prompt).toContain(rec);
      expect(prompt).toContain('Verified | Rejected');
    });
  });

  describe('5. Kita Virtual Assistant Chat Prompt (Constitutional & Safety)', () => {
    it('should include anti-jailbreak, zero-hallucination, and ethical standards', () => {
      expect(KITA_CHAT_SYSTEM_PROMPT).toBeDefined();
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('LPBank');
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('Zero Hallucination');
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('<context>');
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('TỪ CHỐI');
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('BẢO VỆ DỮ LIỆU NHẠY CẢM');
      expect(KITA_CHAT_SYSTEM_PROMPT).toContain('/no_think');
    });

    it('should encapsulate context and user message in proper XML tags', () => {
      const context = 'Kế hoạch kiểm toán 2026 gồm 12 cuộc kiểm toán.';
      const message = 'Hãy cho tôi biết có bao nhiêu cuộc kiểm toán?';
      const formatted = buildKitaContextMessage(context, message);
      expect(formatted).toContain('<context>');
      expect(formatted).toContain(
        '=== DỮ LIỆU NGỮ CẢNH HỆ THỐNG SMART AUDIT 4.0 ===',
      );
      expect(formatted).toContain(context);
      expect(formatted).toContain('</context>');
      expect(formatted).toContain('<user_input>');
      expect(formatted).toContain(message);
      expect(formatted).toContain('</user_input>');
    });
  });

  describe('6. Duplicate Finding Prompt', () => {
    it('should include semantic duplicate criteria and JSON output format', () => {
      const existingList = '- [Tín dụng] Thiếu biên bản kiểm tra sử dụng vốn';
      const finding =
        'Chi nhánh không lập biên bản kiểm tra sau cho vay 30 ngày';
      const prompt = buildDuplicateFindingPrompt(existingList, finding);
      expect(prompt).toContain(existingList);
      expect(prompt).toContain(finding);
      expect(prompt).toContain('isDuplicate');
      expect(prompt).toContain('TRÙNG LẶP VỀ BẢN CHẤT NGHIỆP VỤ');
    });
  });
});
