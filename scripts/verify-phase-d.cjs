/**
 * Verification Script for Phase D: Standardize DTOs & Eliminate `@Body() any`
 * Validates:
 * 1. Recommendations DTOs (Close, TeamLeadOpinion, Verify, UpdateProgress, SubmitRemediationPlan) exist and used in RecommendationsController
 * 2. QualityReviews DTOs (Transition, Create, Update, CreateAssessment) exist and used in QualityReviewsController
 * 3. WorkingPapers DTOs (Approve, Rework) exist and used in WorkingPapersController
 * 4. AuditFindings & AuditMinutes DTOs exist and used in controllers
 * 5. AuditFindingsController exposes POST :id/transition endpoint
 * 6. Zero untyped @Body() any in AuditMinutesController and QualityReviewsController
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔍 CHECKING PHASE D: STANDARDIZE DTOS & REMOVE @Body() any');
console.log('====================================================\n');

let failed = false;

function check(title, fn) {
  try {
    const res = fn();
    if (res === true || res === undefined) {
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}: ${res}`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${title}: ${err.message}`);
    failed = true;
  }
}

const rootDir = path.resolve(__dirname, '..');

// 1. Check Recommendations DTOs
check('Recommendations DTOs exist and applied in RecommendationsController', () => {
  const dtos = [
    'close-recommendation.dto.ts',
    'team-lead-opinion.dto.ts',
    'verify-recommendation.dto.ts',
    'update-progress.dto.ts',
    'submit-remediation-plan.dto.ts',
  ];
  for (const dto of dtos) {
    const p = path.join(rootDir, 'backend', 'src', 'recommendations', 'dto', dto);
    if (!fs.existsSync(p)) return `Missing ${dto}`;
  }
  const ctrl = fs.readFileSync(
    path.join(rootDir, 'backend', 'src', 'recommendations', 'recommendations.controller.ts'),
    'utf8'
  );
  if (!ctrl.includes('CloseRecommendationDto')) return 'RecommendationsController missing CloseRecommendationDto';
  if (!ctrl.includes('TeamLeadOpinionDto')) return 'RecommendationsController missing TeamLeadOpinionDto';
  if (!ctrl.includes('VerifyRecommendationDto')) return 'RecommendationsController missing VerifyRecommendationDto';
  if (!ctrl.includes('UpdateProgressDto')) return 'RecommendationsController missing UpdateProgressDto';
  if (!ctrl.includes('SubmitRemediationPlanDto')) return 'RecommendationsController missing SubmitRemediationPlanDto';
});

// 2. Check QualityReviews DTOs
check('QualityReviews DTOs exist and applied in QualityReviewsController', () => {
  const dtos = [
    'transition-quality-review.dto.ts',
    'create-quality-review.dto.ts',
    'update-quality-review.dto.ts',
    'create-quality-assessment.dto.ts',
  ];
  for (const dto of dtos) {
    const p = path.join(rootDir, 'backend', 'src', 'quality-reviews', 'dto', dto);
    if (!fs.existsSync(p)) return `Missing ${dto}`;
  }
  const ctrl = fs.readFileSync(
    path.join(rootDir, 'backend', 'src', 'quality-reviews', 'quality-reviews.controller.ts'),
    'utf8'
  );
  if (!ctrl.includes('TransitionQualityReviewDto')) return 'QualityReviewsController missing TransitionQualityReviewDto';
  if (!ctrl.includes('CreateQualityReviewDto')) return 'QualityReviewsController missing CreateQualityReviewDto';
  if (!ctrl.includes('UpdateQualityReviewDto')) return 'QualityReviewsController missing UpdateQualityReviewDto';
  if (!ctrl.includes('CreateQualityAssessmentDto')) return 'QualityReviewsController missing CreateQualityAssessmentDto';
  if (ctrl.includes('@Body() createDto: any') || ctrl.includes('@Body() dto: any') || ctrl.includes('@Body() updateDto: any')) {
    return 'QualityReviewsController still contains untyped @Body() any';
  }
});

// 3. Check WorkingPapers review DTOs
check('WorkingPapers review DTOs exist and applied in WorkingPapersController', () => {
  const p = path.join(rootDir, 'backend', 'src', 'working-papers', 'dto', 'review-working-paper.dto.ts');
  if (!fs.existsSync(p)) return 'Missing review-working-paper.dto.ts';
  const ctrl = fs.readFileSync(
    path.join(rootDir, 'backend', 'src', 'working-papers', 'working-papers.controller.ts'),
    'utf8'
  );
  if (!ctrl.includes('ApproveWorkingPaperDto')) return 'WorkingPapersController missing ApproveWorkingPaperDto';
  if (!ctrl.includes('ReworkWorkingPaperDto')) return 'WorkingPapersController missing ReworkWorkingPaperDto';
});

// 4. Check AuditMinutes & AuditFindings DTOs
check('AuditMinutes and AuditFindings DTOs exist and applied in controllers', () => {
  const minuteDtos = ['create-audit-minute.dto.ts', 'update-audit-minute.dto.ts'];
  for (const dto of minuteDtos) {
    const p = path.join(rootDir, 'backend', 'src', 'audit-findings', 'dto', dto);
    if (!fs.existsSync(p)) return `Missing ${dto}`;
  }
  const minCtrl = fs.readFileSync(
    path.join(rootDir, 'backend', 'src', 'audit-findings', 'audit-minutes.controller.ts'),
    'utf8'
  );
  if (!minCtrl.includes('CreateAuditMinuteDto')) return 'AuditMinutesController missing CreateAuditMinuteDto';
  if (!minCtrl.includes('UpdateAuditMinuteDto')) return 'AuditMinutesController missing UpdateAuditMinuteDto';
  if (minCtrl.includes('@Body() createDto: any') || minCtrl.includes('@Body() updateDto: any')) {
    return 'AuditMinutesController still contains untyped @Body() any';
  }

  const findCtrl = fs.readFileSync(
    path.join(rootDir, 'backend', 'src', 'audit-findings', 'audit-findings.controller.ts'),
    'utf8'
  );
  if (!findCtrl.includes('TransitionFindingStatusDto')) return 'AuditFindingsController missing TransitionFindingStatusDto';
  if (!findCtrl.includes("':id/transition'")) return 'AuditFindingsController missing :id/transition route';
});

console.log('\n----------------------------------------------------');
if (failed) {
  console.error('❌ PHASE D VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE D CHECKS PASSED (4/4)!');
  console.log('====================================================');
}
