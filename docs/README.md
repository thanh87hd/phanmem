# BỘ TÀI LIỆU QUẢN TRỊ DỰ ÁN & KỸ THUẬT HỆ THỐNG KTNB 4.0
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI CHO NGÂN HÀNG THƯƠNG MẠI

Bộ tài liệu này được biên soạn theo chuẩn mực quản trị dự án quốc tế **PMBOK® Guide**, kỹ nghệ phần mềm **IEEE 830 / ISO/IEC/IEEE 29148**, chuẩn mực kiểm toán nội bộ **IIA GIAS 2024**, và các quy định của Ngân hàng Nhà nước Việt Nam (**Thông tư 13/2018/TT-NHNN** và **Thông tư 09/2020/TT-NHNN**).

Toàn bộ tài liệu phản ánh chính xác 100% hiện trạng mã nguồn thực tế của hệ thống:
* **Backend**: NestJS 11 với Fastify Engine tốc độ cao (**69 Modules nghiệp vụ**).
* **Database**: PostgreSQL 16+ (**112 Bảng dữ liệu quan hệ**).
* **Frontend**: React 18 SPA với TypeScript & Tailwind CSS (**72 Màn hình chức năng**).

---

## MỤC LỤC BỘ TÀI LIỆU CHÍNH THỨC

```
docs/
├── README.md                                          <-- Bạn đang ở đây (Mục lục điều hướng)
│
├── [TẬP 1: BỘ TÀI LIỆU DOANH NGHIỆP CỐT LÕI (PMBOK & IEEE 830)]
│   ├── architecture/
│   │   ├── ARCHITECTURE_SPECIFICATION.md                      <-- [SAD] Đặc Tả Kiến Trúc Hệ Thống (C4 Model)
│   │   └── CODE_GRAPH_INTERNAL_AUDIT_COMPLIANCE_EVALUATION.md <-- [Code Graph] Đánh Giá Đáp Ứng Chuẩn Mực KTNB (IIA & TT 13)
│   ├── brd/
│   │   └── BUSINESS_REQUIREMENTS_DOCUMENT.md          <-- [BRD] Tài Liệu Yêu Cầu Nghiệp Vụ (TT 13 / IIA)
│   ├── prd/
│   │   └── PRODUCT_REQUIREMENTS_DOCUMENT.md           <-- [PRD] Tài Liệu Yêu Cầu Sản Phẩm (7 Epics / UX)
│   ├── srs/
│   │   └── SOFTWARE_REQUIREMENTS_SPECIFICATION.md     <-- [SRS] Đặc Tả Yêu Cầu Phần Mềm (IEEE 830 / 112 DB)
│   └── infosec/
│       └── INFORMATION_SECURITY_AND_COMPLIANCE.md     <-- [InfoSec] An Ninh Thông Tin & Tuân Thủ (TT 09)
│
├── [TẬP 2: CẨM NANG ĐẶC TẢ CHI TIẾT TỪNG MÀN HÌNH & TÍNH NĂNG (72 MÀN HÌNH)]
│   ├── screens/01_DASHBOARD_AND_EXECUTIVE_PORTALS.md     <-- Dashboard, Execution, BKS, Auditee, Findings Analytics
│   ├── screens/02_AUDIT_UNIVERSE_AND_RISK_ASSESSMENT.md  <-- Vũ trụ KT, Cơ cấu LPBank, Tiêu chí rủi ro, Đánh giá rủi ro, RCM
│   ├── screens/03_ANNUAL_AUDIT_PLAN_AND_RESOURCES.md     <-- Kế hoạch năm (AAP), Định biên Man-days, Lịch Gantt, Timesheet, CPE
│   ├── screens/04_AUDIT_ENGAGEMENTS_AND_FIELDWORK.md     <-- Vòng đời cuộc KT 4 Phase Gating, Workpapers, MUS, ToD/ToE, Review Notes
│   ├── screens/05_FINDINGS_REPORTS_AND_RECOMMENDATIONS.md<-- Phát hiện 5C, AI Defect Codes, Xuất Word/PDF, Khắc phục SLA
│   ├── screens/06_CONTINUOUS_MONITORING_AND_ANALYTICS.md <-- Giám sát liên tục CAMELS, Luật TCTD 2024, Lãi ảo, Benford, CAATs
│   └── screens/07_SYSTEM_ADMIN_AND_SECURITY.md           <-- Quản trị tham số, 15 Vai trò CASL, Audit Trail bất biến, SSO Keycloak
│
├── [TẬP 3: BỘ 7 QUYẾT ĐỊNH KIẾN TRÚC CÔNG NGHỆ (ADR)]
│   ├── adr/0001-nestjs-fastify-backend-runtime.md
│   ├── adr/0002-postgresql-as-primary-data-store.md
│   ├── adr/0003-react-spa-with-vite-frontend-architecture.md
│   ├── adr/0004-continuous-auditing-and-caats-engine.md
│   ├── adr/0005-risk-based-internal-audit-methodology.md
│   ├── adr/0006-workpaper-multi-tier-review-and-sign-off.md
│   └── adr/0007-rbac-casl-security-and-audit-trail.md
│
├── [TẬP 4: GÓI DỮ LIỆU & BIỂU MẪU MẪU (LPBANK DATA PACKAGES)]
│   ├── 01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx
│   ├── 02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx
│   └── 03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx
│
└── [TẬP 5: CẨM NANG PHƯƠNG PHÁP LUẬN & HỆ THỐNG MẪU BIỂU KIỂM TOÁN NỘI BỘ NGÂN HÀNG (IIA GIAS 2024 & TT 13)]
    ├── methodology/01_PHUONG_PHAP_LUAN_KIEM_TOAN_NOI_BO_NGAN_HANG.md   <-- [Methodology] Khung Quản trị 3 Tuyến, Chu trình RBIA 5 Pha, Toán Lấy mẫu MUS, CAATs & Benford
    └── methodology/02_HE_THONG_MAU_BIEU_HO_SO_KIEM_TOAN_CHUAN_HOA.md   <-- [Templates & RCM] Trọn bộ 16 Mẫu biểu KTNB (MB-01 -> MB-16) & 4 Ma trận RCM Chuyên ngành
```

---

## BẢNG TRA CỨU ĐIỀU HƯỚNG TỪNG MÀN HÌNH VÀ PHÂN HỆ NGHIỆP VỤ

| Phân Hệ | Danh Sách Màn Hình Chi Tiết | Tài Liệu Đặc Tả Chi Tiết |
|---|---|---|
| **Điều Hành & Báo Cáo Cấp Cao** | `Dashboard.tsx`, `ExecutionDashboard.tsx`, `AuditCommitteePortal.tsx`, `AuditeePortal.tsx`, `FindingsAnalytics.tsx`, `SummaryReports.tsx` | [01_DASHBOARD_AND_EXECUTIVE_PORTALS.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/01_DASHBOARD_AND_EXECUTIVE_PORTALS.md) |
| **Vũ Trụ Kiểm Toán & Đánh Giá Rủi Ro** | `AuditUniverse.tsx`, `Departments.tsx`, `RiskCriteria.tsx`, `RiskAssessment.tsx`, `RiskRegister.tsx`, `RiskControlMatrix.tsx`, `ScenarioRiskMap.tsx` | [02_AUDIT_UNIVERSE_AND_RISK_ASSESSMENT.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/02_AUDIT_UNIVERSE_AND_RISK_ASSESSMENT.md) |
| **Kế Hoạch Năm & Nguồn Lực Kiểm Toán** | `AuditPlan.tsx`, `ResourceCapacityView.tsx`, `ResourceCalendar.tsx`, `Personnel.tsx`, `Timesheet.tsx`, `TrainingCPE.tsx`, `AuditExpenses.tsx` | [03_ANNUAL_AUDIT_PLAN_AND_RESOURCES.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/03_ANNUAL_AUDIT_PLAN_AND_RESOURCES.md) |
| **Thực Địa Cuộc KT & Hồ Sơ Điện Tử** | `AuditEngagements.tsx` (4 Phase Gating), `AuditPrograms.tsx`, `WorkingPapers.tsx` (Credit Grid), `MasterSamplingTab.tsx`, `DetailedSamplingGrid.tsx`, `TestOfControl.tsx`, `QualityControl.tsx`, `AuditMinutesPage.tsx` | [04_AUDIT_ENGAGEMENTS_AND_FIELDWORK.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/04_AUDIT_ENGAGEMENTS_AND_FIELDWORK.md) |
| **Phát Hiện 5C, Báo Cáo & Kiến Nghị** | `AuditFindings.tsx` (AI Defect codes), `FindingKnowledgeBase.tsx`, `DefectCodeList.tsx`, `AuditReports.tsx` (Xuất Word/PDF), `Recommendations.tsx` (SLA), `AuditRatingView.tsx` | [05_FINDINGS_REPORTS_AND_RECOMMENDATIONS.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/05_FINDINGS_REPORTS_AND_RECOMMENDATIONS.md) |
| **Kiểm Toán Liên Tục & Phân Tích Dữ Liệu** | `ContinuousMonitoring.tsx` (CAMELS TT 14/2025, Đảo nợ, Lãi ảo, Nhảy nhóm nợ), `DataAnalytics.tsx` (Benford), `ExternalDatabaseConnections.tsx`, `ThematicAnalysis.tsx` | [06_CONTINUOUS_MONITORING_AND_ANALYTICS.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/06_CONTINUOUS_MONITORING_AND_ANALYTICS.md) |
| **Quản Trị Hệ Thống & An Toàn Bảo Mật** | `SystemManagement.tsx`, `RolesPage.tsx` (15 Vai trò CASL), `AuditTrail.tsx` (SHA-256 bất biến), `IntegrationSettings.tsx` (SSO Keycloak/LDAP), `InfrastructureMonitor.tsx` | [07_SYSTEM_ADMIN_AND_SECURITY.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/screens/07_SYSTEM_ADMIN_AND_SECURITY.md) |
| **Phương Pháp Luận KTNB Ngân Hàng** | Chu trình RBIA 5 Pha, Khung 3 Tuyến, Công thức lấy mẫu MUS, Benford's Law, Kịch bản SQL CAATs | [01_PHUONG_PHAP_LUAN_KIEM_TOAN_NOI_BO_NGAN_HANG.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/methodology/01_PHUONG_PHAP_LUAN_KIEM_TOAN_NOI_BO_NGAN_HANG.md) |
| **Hệ Thống Mẫu Biểu & Thư Viện RCM** | 16 Mẫu biểu chuẩn hóa MB-01 -> MB-16, 4 Bộ RCM Ngân hàng (Tín dụng, Nguồn vốn, Kho quỹ, An ninh CNTT) | [02_HE_THONG_MAU_BIEU_HO_SO_KIEM_TOAN_CHUAN_HOA.md](file:///f:/Phan%20mem%20KTNB%204.0/docs/methodology/02_HE_THONG_MAU_BIEU_HO_SO_KIEM_TOAN_CHUAN_HOA.md) |
