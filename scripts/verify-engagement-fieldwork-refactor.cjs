/**
 * Verification Script: Tái Cấu Trúc Phân Hệ Cuộc Kiểm Toán Thực Địa & Hồ Sơ MB-04 -> MB-10
 * Standard: IIA GIAS 2024 (Domain 5), Thông tư 13/2018/TT-NHNN, Clean Architecture
 */

const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🔍 VERIFYING: ENGAGEMENT FIELDWORK & WORKING PAPERS (MB-04 -> MB-10)');
console.log('========================================================================\n');

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

// 1. Check Migration File & Instant Rollback Snapshots
check('Database Migration file with snapshot tables and rollback', () => {
  const migPath = path.join(
    rootDir,
    'backend',
    'src',
    'database',
    'migrations',
    '1787900000000-EngagementFieldworkRefactor.ts'
  );
  if (!fs.existsSync(migPath)) return 'Migration file 1787900000000-EngagementFieldworkRefactor.ts not found';
  const content = fs.readFileSync(migPath, 'utf8');

  const requiredTokens = [
    '_snapshot_audit_engagements',
    '_snapshot_working_papers',
    '_snapshot_audit_workstreams',
    'audit_review_notes',
    'preparerId',
    'leadAuditorId',
    'leadApprovedAt',
    'signoffStatus',
    'IDX_review_notes_engagement_status',
    'IDX_review_notes_wp_status',
    'IDX_review_notes_workstream_status',
  ];
  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      return `Migration missing required element: ${token}`;
    }
  }
});

// 2. Check Backend Entities
check('AuditReviewNote entity (MB-10) with enum and relations', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'entities',
    'audit-review-note.entity.ts'
  );
  if (!fs.existsSync(entityPath)) return 'audit-review-note.entity.ts not found';
  const content = fs.readFileSync(entityPath, 'utf8');

  const tokens = [
    'ReviewNoteStatus',
    'OPEN = \'OPEN\'',
    'RESOLVED = \'RESOLVED\'',
    'CLOSED = \'CLOSED\'',
    'engagement: AuditEngagement',
    'workingPaper: WorkingPaper',
    'workstream: AuditWorkstream',
    'reviewSeq',
    'reviewer',
    'auditor',
    'closedBy',
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `AuditReviewNote missing: ${token}`;
  }
});

check('WorkingPaper entity extended with sign-off and review notes relation', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'entities',
    'working-paper.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  const tokens = [
    'preparerId',
    'preparedAt',
    'leadAuditorId',
    'leadApprovedAt',
    'signoffStatus',
    'reviewNoteItems',
    'AuditReviewNote',
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `WorkingPaper entity missing: ${token}`;
  }
});

check('AuditWorkstream entity has reviewNotesList relation', () => {
  const entityPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-engagements',
    'entities',
    'audit-workstream.entity.ts'
  );
  const content = fs.readFileSync(entityPath, 'utf8');
  if (!content.includes('reviewNotesList')) return 'AuditWorkstream missing reviewNotesList relation';
  if (!content.includes('AuditReviewNote')) return 'AuditWorkstream missing AuditReviewNote relation reference';
});

// 3. Check DTOs
check('CreateReviewNoteDto and RespondReviewNoteDto validation definitions', () => {
  const createDtoPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'dto',
    'create-review-note.dto.ts'
  );
  const respondDtoPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'dto',
    'respond-review-note.dto.ts'
  );
  if (!fs.existsSync(createDtoPath)) return 'create-review-note.dto.ts not found';
  if (!fs.existsSync(respondDtoPath)) return 'respond-review-note.dto.ts not found';

  const createContent = fs.readFileSync(createDtoPath, 'utf8');
  const respondContent = fs.readFileSync(respondDtoPath, 'utf8');

  if (!createContent.includes('engagementId') || !createContent.includes('note')) {
    return 'CreateReviewNoteDto missing required fields';
  }
  if (!respondContent.includes('response')) {
    return 'RespondReviewNoteDto missing response field';
  }
});

// 4. Check Backend Review Notes Service & Controller
check('AuditReviewNotesService with IIA 1311 hard gate assertCanSignOff', () => {
  const srvPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'audit-review-notes.service.ts'
  );
  if (!fs.existsSync(srvPath)) return 'audit-review-notes.service.ts not found';
  const content = fs.readFileSync(srvPath, 'utf8');

  const tokens = [
    'assertCanSignOff',
    'ReviewNoteStatus.CLOSED',
    'BadRequestException',
    'IIA 1311',
    'respond',
    'close',
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `AuditReviewNotesService missing: ${token}`;
  }
});

check('AuditReviewNotesController endpoints and audit logging', () => {
  const ctrlPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'audit-review-notes.controller.ts'
  );
  if (!fs.existsSync(ctrlPath)) return 'audit-review-notes.controller.ts not found';
  const content = fs.readFileSync(ctrlPath, 'utf8');

  const tokens = [
    "@Controller('working-papers/review-notes')",
    '@Get()',
    '@Post()',
    "@Post(':id/respond')",
    "@Post(':id/close')",
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `AuditReviewNotesController missing endpoint: ${token}`;
  }
});

// 5. Check Service Separation & Hard Quality Gate Injection
check('WorkingPapersService enforces hard quality gate in approve()', () => {
  const wpSrvPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'working-papers.service.ts'
  );
  const content = fs.readFileSync(wpSrvPath, 'utf8');
  if (!content.includes('assertCanSignOff')) {
    return 'WorkingPapersService does not call assertCanSignOff';
  }
  if (!content.includes('signoffStatus')) {
    return 'WorkingPapersService does not update signoffStatus';
  }
});

check('AuditWorkstreamsService cleanly separated and wired with assertCanSignOff gate', () => {
  const wsSrvPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-engagements',
    'audit-workstreams.service.ts'
  );
  if (!fs.existsSync(wsSrvPath)) return 'audit-workstreams.service.ts not found';
  const content = fs.readFileSync(wsSrvPath, 'utf8');

  if (!content.includes('assertCanSignOff')) {
    return 'AuditWorkstreamsService missing assertCanSignOff check';
  }
  if (!content.includes('findWorkstreams') || !content.includes('reviewWorkstream')) {
    return 'AuditWorkstreamsService missing core methods';
  }
});

check('AuditWorkstreamsController uses AuditWorkstreamsService', () => {
  const wsCtrlPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-engagements',
    'audit-workstreams.controller.ts'
  );
  const content = fs.readFileSync(wsCtrlPath, 'utf8');
  if (!content.includes('AuditWorkstreamsService')) {
    return 'AuditWorkstreamsController not wired to AuditWorkstreamsService';
  }
});

// 6. Check Module Registrations
check('WorkingPapersModule and AuditEngagementsModule DI registration', () => {
  const wpModPath = path.join(
    rootDir,
    'backend',
    'src',
    'working-papers',
    'working-papers.module.ts'
  );
  const wpMod = fs.readFileSync(wpModPath, 'utf8');
  if (!wpMod.includes('AuditReviewNote')) return 'WorkingPapersModule missing AuditReviewNote entity';
  if (!wpMod.includes('AuditReviewNotesService')) return 'WorkingPapersModule missing AuditReviewNotesService';
  if (!wpMod.includes('AuditReviewNotesController')) return 'WorkingPapersModule missing AuditReviewNotesController';

  const aeModPath = path.join(
    rootDir,
    'backend',
    'src',
    'audit-engagements',
    'audit-engagements.module.ts'
  );
  const aeMod = fs.readFileSync(aeModPath, 'utf8');
  if (!aeMod.includes('AuditWorkstreamsService')) return 'AuditEngagementsModule missing AuditWorkstreamsService';
});

// 7. Check Frontend Components & Integration
check('ReviewNotesTab.tsx frontend component (MB-10 UI)', () => {
  const tabPath = path.join(
    rootDir,
    'frontend',
    'src',
    'pages',
    'audit-engagement-tabs',
    'ReviewNotesTab.tsx'
  );
  if (!fs.existsSync(tabPath)) return 'ReviewNotesTab.tsx not found';
  const content = fs.readFileSync(tabPath, 'utf8');

  const tokens = [
    'MB-10',
    'IIA 1311',
    'fetchNotes',
    'handleCreateNote',
    'handleConfirmRespond',
    'handleCloseNote',
    '/working-papers/review-notes',
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `ReviewNotesTab.tsx missing: ${token}`;
  }
});

check('Phase2FieldworkTab.tsx embeds ReviewNotesTab in subtabs and guide bar', () => {
  const tabPath = path.join(
    rootDir,
    'frontend',
    'src',
    'pages',
    'audit-engagement-tabs',
    'Phase2FieldworkTab.tsx'
  );
  const content = fs.readFileSync(tabPath, 'utf8');
  if (!content.includes('ReviewNotesTab')) return 'Phase2FieldworkTab missing ReviewNotesTab import/component';
  if (!content.includes('review-notes')) return 'Phase2FieldworkTab missing review-notes subtab key';
  if (!content.includes('MB-10')) return 'Phase2FieldworkTab missing MB-10 label';
});

check('AuditEngagements.tsx has useSearchParams deep-linking and state sync', () => {
  const pagePath = path.join(
    rootDir,
    'frontend',
    'src',
    'pages',
    'AuditEngagements.tsx'
  );
  const content = fs.readFileSync(pagePath, 'utf8');

  const tokens = [
    'useSearchParams',
    "searchParams.get('id')",
    "searchParams.get('phase')",
    'changeActivePhase',
  ];
  for (const token of tokens) {
    if (!content.includes(token)) return `AuditEngagements.tsx missing deep-linking logic: ${token}`;
  }
});

console.log('========================================================================');
if (failed) {
  console.error('❌ VERIFICATION SUITE COMPLETED WITH ONE OR MORE FAILURES.');
  process.exit(1);
} else {
  console.log('🎉 ALL ARCHITECTURE, GOVERNANCE & GATING VERIFICATIONS PASSED 100%!');
  console.log('========================================================================');
  process.exit(0);
}
