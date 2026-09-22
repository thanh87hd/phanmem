# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC HỆ THỐNG (SAD)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-DOC-SAD`  
**Chuẩn mực thiết kế**: ISO/IEC/IEEE 42010:2011, Mô hình C4 (Context, Container, Component, Deployment), PMBOK Technical Baseline  
**Phiên bản**: 4.0.0  
**Tình trạng**: Ban hành chính thức  
**Tổ chức phát triển**: Ban Dự án Chuyển đổi số & Hiện đại hóa Kiểm toán Nội bộ  

---

## 1. TỔNG QUAN & MỤC TIÊU KIẾN TRÚC

### 1.1. Bối Cảnh & Mục Tiêu Hệ Thống
Hệ thống **Phần mềm Kiểm toán Nội bộ (KTNB 4.0)** là giải pháp phần mềm quản lý kiểm toán toàn diện (Audit Management System - AMS) và Quản trị Rủi ro Tuân thủ (GRC) được thiết kế chuyên biệt cho hệ thống Ngân hàng thương mại tại Việt Nam.

Mục tiêu kiến trúc cốt lõi:
1. **Tuân thủ pháp lý & chuẩn mực quốc tế**: Đáp ứng đầy đủ quy định tại **Thông tư 13/2018/TT-NHNN** (Hệ thống kiểm soát nội bộ và KTNB trong TCTD), chuẩn mực quốc tế **IIA GIAS 2024 (IPPF)**, khuôn khổ **COSO 2013 / COSO ERM 2017**, và các tiêu chuẩn giám sát an toàn vốn **Basel II / III / IV**.
2. **Hiệu năng & Tốc độ cao**: Ứng dụng **Fastify Engine** trên nền tảng **NestJS** kết hợp cơ sở dữ liệu **PostgreSQL 16+**, đáp ứng thông lượng hàng nghìn request/giây với độ trễ (latency) dưới 500ms đối với các tác vụ truy vấn báo cáo và dữ liệu phân tích lớn.
3. **Bảo mật & Tính toàn vẹn dữ liệu cấp Ngân hàng**: Đáp ứng tiêu chuẩn an toàn hệ thống thông tin **Cấp độ 3** theo **Thông tư 09/2020/TT-NHNN** và **Thông tư 18/2018/TT-NHNN**. Cơ chế kiểm soát truy cập kết hợp **RBAC** (15 vai trò) và **ABAC (CASL Framework)** phân quyền động theo từng cuộc kiểm toán.
4. **Vết kiểm toán bất biến (Immutable Audit Trail)**: Ghi vết 100% các thao tác thay đổi dữ liệu hồ sơ làm việc (Workpapers), phát hiện kiểm toán (Findings) và kế hoạch khắc phục (Recommendations) với định danh KTV, địa chỉ IP, dấu thời gian chuẩn và cơ chế bảo vệ chống chối bỏ.

---

## 2. MÔ HÌNH KIẾN TRÚC C4

### 2.1. C4 - Level 1: System Context Diagram (Ngữ Cảnh Hệ Thống)
Sơ đồ ngữ cảnh mô tả mối quan hệ giữa Hệ thống KTNB 4.0 với người dùng và các hệ thống vệ tinh trong hạ tầng công nghệ thông tin ngân hàng.

```mermaid
C4Context
    title System Context Diagram - Phần mềm KTNB 4.0

    Person(auditor, "Kiểm Toán Viên (KTV)", "Thực hiện kiểm toán, lập hồ sơ làm việc, ghi nhận phát hiện 5C")
    Person(auditLead, "Trưởng Đoàn Kiểm Toán", "Lập kế hoạch chi tiết, phân công, soát xét hồ sơ, tạo Review Notes")
    Person(cae, "Trưởng Ban KTNB / CAE", "Phê duyệt Kế hoạch năm (AAP), ký duyệt Báo cáo KTNB")
    Person(auditee, "Đơn vị được Kiểm toán", "Xem phát hiện, giải trình, cập nhật tiến độ khắc phục kiến nghị")
    Person(auditComm, "Ban Kiểm soát / HĐQT", "Xem báo cáo tổng hợp, giám sát Heatmap rủi ro toàn hàng")

    System(ktnbSystem, "Hệ thống KTNB 4.0", "Nền tảng quản trị kiểm toán định hướng rủi ro (RBIA), quản lý hồ sơ điện tử, theo dõi kiến nghị")

    System_Ext(coreBanking, "Core Banking (T24 / Flexcube)", "Cung cấp dữ liệu giao dịch, tài khoản, khách hàng, số dư phục vụ CAATs")
    System_Ext(dwhSystem, "Enterprise DWH / Data Lake", "Cung cấp dữ liệu lịch sử và báo cáo phân tích rủi ro định lượng")
    System_Ext(keycloakSSO, "Keycloak / AD / LDAP", "Hệ thống Quản lý Định danh & Xác thực tập trung (SSO/IAM)")
    System_Ext(smtpServer, "Enterprise Mail Gateway", "Hệ thống gửi email thông báo, nhắc nợ kiến nghị quá hạn")

    Rel(auditor, ktnbSystem, "Thao tác hồ sơ làm việc, bằng chứng", "HTTPS/WSS")
    Rel(auditLead, ktnbSystem, "Soát xét, duyệt workpaper, phát hiện", "HTTPS")
    Rel(cae, ktnbSystem, "Phê duyệt kế hoạch, báo cáo", "HTTPS")
    Rel(auditee, ktnbSystem, "Giải trình, cập nhật khắc phục", "HTTPS (Auditee Portal)")
    Rel(auditComm, ktnbSystem, "Xem Dashboard & Báo cáo", "HTTPS (Audit Committee Portal)")

    Rel(ktnbSystem, keycloakSSO, "Xác thực người dùng, OIDC/OAuth2", "HTTPS")
    Rel(ktnbSystem, coreBanking, "Trích xuất mẫu giao dịch CAATs", "REST / Database Link / SFTP")
    Rel(ktnbSystem, dwhSystem, "Đồng bộ chỉ số rủi ro (KRI)", "ETL / Batch API")
    Rel(ktnbSystem, smtpServer, "Gửi email thông báo, cảnh báo SLA", "SMTP/TLS")
```

---

### 2.2. C4 - Level 2: Container Diagram (Kiến Trúc Các Container Ứng Dụng)

```mermaid
C4Container
    title Container Diagram - Kiến Trúc Tổng Thể KTNB 4.0

    Person(user, "Người Dùng Hệ Thống", "KTV, Trưởng đoàn, Lãnh đạo KTNB, Auditee")

    Container_Boundary(c1, "Hạ Tầng KTNB 4.0") {
        Container(spa, "Single Page App (Frontend)", "React 18, TypeScript, Tailwind CSS, Lucide Icons", "Giao diện người dùng đa vai trò với 72 trang chức năng, đồ họa Heatmap và biểu mẫu động")
        Container(proxy, "Reverse Proxy / Web Server", "Node.js / Nginx", "Cung cấp static bundle tĩnh, cân bằng tải và proxy API nội bộ")
        Container(backend, "API Application Core (Backend)", "NestJS 11, Fastify Engine, TypeScript", "Cung cấp 69 modules nghiệp vụ RESTful API, CASL authorization, validation, audit log interceptor")
        ContainerDb(database, "Relational Database", "PostgreSQL 16+", "Lưu trữ 112 bảng dữ liệu quan hệ, JSONB cho RCM động, Partitioning cho Audit Trail")
        ContainerDb(cache, "In-Memory Store / Cache", "Memory / Redis", "Lưu trữ phiên đăng nhập, cache quyền hạn CASL, rate-limiting counters")
        Container(storage, "Document / Evidence Storage", "Local Secure FS / MinIO / S3", "Lưu trữ tài liệu kiểm toán, file bằng chứng đã băm mã hóa SHA-256")
    }

    Rel(user, spa, "Tương tác giao diện", "HTTPS (Port 8088 / 443)")
    Rel(spa, proxy, "Yêu cầu tài nguyên tĩnh & API call", "HTTPS")
    Rel(proxy, backend, "Forward API call (/api/*)", "HTTP (Port 3001)")
    Rel(backend, database, "Đọc/Ghi dữ liệu TypeORM", "TCP / PostgreSQL Protocol (Port 5432)")
    Rel(backend, cache, "Cache quyền hạn, rate limit", "TCP (Port 6379)")
    Rel(backend, storage, "Lưu trữ & đọc file bằng chứng", "Local I/O / S3 API")
```

---

### 2.3. C4 - Level 3: Component Diagram (Các Phân Hệ Backend Nghiệp Vụ)
Backend NestJS bao gồm **69 modules nghiệp vụ** phân tách theo nguyên tắc Domain-Driven Design (DDD):

```mermaid
graph TB
    subgraph "Core Infrastructure & Cross-Cutting Concerns"
        AuthModule["AuthModule (JWT, Keycloak, 2FA)"]
        CaslModule["CaslModule (RBAC + ABAC Authorization)"]
        AuditTrailModule["AuditTrailModule (Immutable Logging)"]
        SystemMgmtModule["SystemManagementModule (Config, Health)"]
        MailModule["MailModule (Notification & SMTP)"]
    end

    subgraph "Audit Strategic & Planning Domain"
        AuditUniverseModule["AuditUniverseModule (Vũ trụ kiểm toán)"]
        DepartmentsModule["DepartmentsModule (Cơ cấu tổ chức LPBank)"]
        RiskCriteriaModule["RiskCriteriaModule (Thang đo rủi ro L x I)"]
        RiskAssessModule["RiskAssessmentsModule (Đánh giá rủi ro)"]
        AuditPlansModule["AuditPlansModule (Kế hoạch năm - AAP)"]
        ResourceCapacityModule["ResourceCapacityModule (Định biên Man-days)"]
    end

    subgraph "Audit Engagement & Execution Domain"
        EngagementModule["AuditEngagementsModule (Quản lý cuộc KT)"]
        AuditProgramsModule["AuditProgramsModule (Chương trình KT)"]
        RcmModule["RiskControlMatrixModule (Thư viện RCM)"]
        TestOfControlModule["TestOfControlModule (Thử nghiệm ToD & ToE)"]
        WorkingPapersModule["WorkingPapersModule (Hồ sơ làm việc điện tử)"]
        EvidencesModule["EvidencesModule (Bằng chứng băm SHA-256)"]
        QualityReviewsModule["QualityReviewsModule (Soát xét Review Notes)"]
    end

    subgraph "Findings, Reporting & Remediation Domain"
        FindingsModule["AuditFindingsModule (Phát hiện chuẩn 5C)"]
        AuditReportsModule["AuditReportsModule (Báo cáo KTNB tự động)"]
        RecommendationsModule["RecommendationsModule (Quản lý kiến nghị)"]
        AuditeePortalModule["AuditeePortalModule (Cổng đơn vị giải trình)"]
        AuditCommitteeModule["AuditCommitteeModule (Cổng Ban Kiểm soát)"]
    end

    subgraph "Analytics & Continuous Auditing Domain"
        ContinuousMonitoringModule["ContinuousMonitoringModule (CA/CM)"]
        DataIngestionModule["DataIngestionModule (Nạp dữ liệu Core)"]
        AnalyticsModule["AnalyticsModule (CAATs, Benford's Law)"]
        DashboardModule["DashboardModule (KPI, Risk Heatmap)"]
    end

    AuthModule --> CaslModule
    CaslModule -. Áp dụng quyền .-> EngagementModule
    CaslModule -. Áp dụng quyền .-> WorkingPapersModule
    CaslModule -. Áp dụng quyền .-> FindingsModule

    AuditUniverseModule --> RiskAssessModule --> AuditPlansModule --> EngagementModule
    EngagementModule --> RcmModule --> TestOfControlModule --> WorkingPapersModule
    WorkingPapersModule --> QualityReviewsModule
    WorkingPapersModule --> FindingsModule --> AuditReportsModule
    FindingsModule --> RecommendationsModule --> AuditeePortalModule

    WorkingPapersModule -. Ghi vết .-> AuditTrailModule
    FindingsModule -. Ghi vết .-> AuditTrailModule
    RecommendationsModule -. Ghi vết .-> AuditTrailModule
```

---

## 3. KIẾN TRÚC CƠ SỞ DỮ LIỆU & QUẢN TRỊ DỮ LIỆU

### 3.1. Phân Vùng Lược Đồ Dữ Liệu (Database Schema Partitioning)
Cơ sở dữ liệu **PostgreSQL 16+** (`ktnb_v4`) bao gồm **112 bảng quan hệ**, được phân chia theo 6 miền logic:

| Miền Dữ Liệu | Số lượng bảng | Bảng cốt lõi | Chiến lược lưu trữ |
|---|---|---|---|
| **Identity, Roles & Security** | 12 bảng | `users`, `roles`, `user_roles`, `permissions`, `casl_rules`, `password_history` | BCRYPT/Argon2id băm mật khẩu, Index trên `email` và `username`. |
| **Audit Universe & Governance** | 18 bảng | `audit_universe_entities`, `departments`, `business_units`, `risk_criteria`, `risk_assessments` | Cấu trúc phân cấp Tree-structure (Parent-Child) cho phòng ban và chi nhánh. |
| **Annual Planning & Resources** | 14 bảng | `annual_audit_plans`, `plan_items`, `resource_capacities`, `timesheets`, `audit_schedules` | Ràng buộc toàn vẹn khóa ngoại; lưu trữ tổng số Man-days phân bổ. |
| **Engagements & Fieldwork** | 32 bảng | `audit_engagements`, `engagement_members`, `audit_programs`, `rcm_templates`, `rcm_items`, `working_papers`, `evidences`, `review_notes` | Sử dụng kiểu dữ liệu `JSONB` cho nội dung hồ sơ kiểm toán động; Khóa bi quan/lạc quan (Locking mechanism). |
| **Findings & Remediation** | 20 bảng | `audit_findings`, `finding_causes`, `recommendations`, `action_plans`, `auditee_responses` | Xếp hạng phát hiện (Severity: Critical/High/Medium/Low); Liên kết 1-nhiều với kế hoạch khắc phục. |
| **Continuous Auditing & Logs** | 16 bảng | `audit_trails`, `system_logs`, `continuous_rules`, `anomaly_alerts`, `ingested_transactions` | Áp dụng **Table Partitioning theo Tháng (Monthly Partitioning)** đối với `audit_trails` để tối ưu hóa hiệu năng ghi và truy vấn lịch sử. |

### 3.2. Thiết Kế Cơ Chế Audit Trail Bất Biến (Immutable Logging Design)
Mọi thay đổi trên các thực thể quan trọng đều được chụp snapshot và lưu trữ:
```sql
CREATE TABLE audit_trails (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'SIGN_OFF'
    user_id INTEGER NOT NULL REFERENCES users(id),
    client_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    diff_hash VARCHAR(64) NOT NULL, -- SHA-256 băm chống can thiệp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);
```

---

## 4. KIẾN TRÚC AN NINH & BẢO MẬT HỆ THỐNG

### 4.1. Khung Phân Quyền Hỗn Hợp (Hybrid RBAC + ABAC)
1. **RBAC (Role-Based Access Control)**:
   * 15 vai trò định sẵn: `ADMIN`, `CAE` (Trưởng ban KTNB), `AUDIT_DIRECTOR` (Phó ban), `AUDIT_MANAGER` (Trưởng phòng), `AUDIT_LEAD` (Trưởng đoàn), `SENIOR_AUDITOR`, `AUDITOR`, `JUNIOR_AUDITOR`, `AUDITEE_LEAD`, `AUDITEE_USER`, `AUDIT_COMMITTEE` (BKS), `RISK_OFFICER`, `COMPLIANCE_OFFICER`, `QAIP_REVIEWER`, `GUEST`.
2. **ABAC (Attribute-Based Access Control với CASL)**:
   * Kiểm soát động theo ngữ cảnh cuộc kiểm toán: KTV chỉ được phép sửa Working Paper nếu:
     * Người dùng là thành viên (`isMember == true`) của Cuộc kiểm toán đó;
     * Trạng thái cuộc kiểm toán đang ở giai đoạn `IN_PROGRESS`;
     * Hồ sơ làm việc chưa bị khóa sổ (`isLocked == false`);
     * Quyền hành động: `can('update', 'WorkingPaper', { assigneeId: user.id, isLocked: false })`.

### 4.2. Khóa Sổ Kiểm Toán (Audit Sign-off Freeze)
* Sau khi Báo cáo Kiểm toán chính thức được ký phát hành, toàn bộ hồ sơ làm việc thuộc cuộc kiểm toán chuyển sang trạng thái `FROZEN/LOCKED`.
* Mọi hành động chỉnh sửa hồ sơ sau ngày phát hành bị chặn ở tầng Controller/Service, ngoại trừ quy trình mở khóa đặc biệt (Reopen Request) phải được Ban Kiểm soát phê duyệt và ghi vết độc lập.

---

## 5. KIẾN TRÚC TRIỂN KHAI & TỐI ƯU HẬU CẦN (DEPLOYMENT & HA)

```mermaid
graph LR
    subgraph "External Access / DMZ"
        LB["F5 / Nginx Load Balancer (SSL Termination TLS 1.3)"]
    end

    subgraph "Application Tier (Bank Private Subnet)"
        ProxyServer["Node.js / Nginx Static Proxy (Port 8088)"]
        AppNode1["KTNB Backend Instance 1 (Fastify / Port 3001)"]
        AppNode2["KTNB Backend Instance 2 (Fastify / Port 3002)"]
    end

    subgraph "Data & Storage Tier (Restricted Subnet)"
        PGPrimary[("PostgreSQL 16+ Primary")]
        PGStandby[("PostgreSQL 16+ Standby (Streaming Replication)")]
        FileStore[("Encrypted File Storage (MinIO / NAS)")]
        RedisCluster[("Redis In-Memory Cache")]
    end

    LB --> ProxyServer
    ProxyServer --> AppNode1
    ProxyServer --> AppNode2
    AppNode1 --> PGPrimary
    AppNode2 --> PGPrimary
    PGPrimary -. Streaming Rep .-> PGStandby
    AppNode1 --> RedisCluster
    AppNode2 --> RedisCluster
    AppNode1 --> FileStore
    AppNode2 --> FileStore
```

* **Cân bằng tải & Sẵn sàng cao**:
  * PM2 Cluster Mode quản lý các process Node.js Fastify, tự động restart khi phát hiện lỗi không mong muốn (zero-downtime reload).
  * PostgreSQL thiết lập mô hình Streaming Replication (Primary - Standby) đảm bảo RPO $\le$ 15 phút và RTO $\le$ 2 giờ.
* **Tối ưu hóa tài nguyên**:
  * Động cơ HTTP Fastify giúp giảm 60% mức tiêu thụ bộ nhớ RAM so với kiến trúc Express truyền thống, tăng thông lượng xử lý các file báo cáo lớn gấp 2.5 lần.
