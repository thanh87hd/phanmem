# TÀI LIỆU KỸ THUẬT: CẤU TRÚC MÃ NGUỒN, CƠ SỞ DỮ LIỆU, LOCAL BUILD & HƯỚNG DẪN DEPLOY MÁY CHỦ
**Dự án:** LPBank Smart Audit 4.0 — Hệ Thống Quản Trị & Kiểm Toán Nội Bộ Doanh Nghiệp  
**Đối tượng sử dụng:** Đội ngũ Lập trình viên (Developers), Tech Leads, DevOps Engineers & Quản trị Hệ thống  
**Phiên bản tài liệu:** 4.0.0 (Cập nhật tháng 09/2026)  

---

## MỤC LỤC
1. [Cấu Trúc Mã Nguồn (Codebase Structure)](#1-cấu-trúc-mã-nguồn-codebase-structure)
2. [Cấu Trúc Cơ Sở Dữ Liệu (Database Architecture & Schemas)](#2-cấu-trúc-cơ-sở-dữ-liệu-database-architecture--schemas)
3. [Hướng Dẫn Cài Đặt, Build & Chạy Local](#3-hướng-dẫn-cài-đặt-build--chạy-local)
4. [Các Plugin, Thư Viện & Hệ Thống Tích Hợp](#4-các-plugin-thư-viện--hệ-thống-tích-hợp)
5. [Thông Tin Môi Trường & Hướng Dẫn Deploy Server Test / Production](#5-thông-tin-môi-trường--hướng-dẫn-deploy-server-test--production)
6. [Quy Trình Giám Sát, Bảo Trì & Xử Lý Sự Cố (Runbook)](#6-quy-trình-giám-sát-bảo-trì--xử-lý-sự-cố-runbook)

---

## 1. CẤU TRÚC MÃ NGUỒN (CODEBASE STRUCTURE)

Dự án được tổ chức theo mô hình **Monorepo / Multi-project** phân tách hoàn toàn giữa Backend API và Frontend SPA, kèm các công cụ DevOps, Test Scripts và Tài liệu kiến trúc.

### 1.1. Cây thư mục tổng thể dự án
```text
f:\Phan mem KTNB 4.0\
├── backend/                  # NestJS 11 Backend API Engine (Fastify Adapter)
│   ├── src/                  # Mã nguồn TypeScript backend (71 modules nghiệp vụ)
│   │   ├── auth/             # Xác thực JWT, 2FA/TOTP, LDAP, Azure MSAL
│   │   ├── casl/             # Phân quyền động RBAC & ABAC theo chuẩn CASL
│   │   ├── database/         # TypeORM Migrations, Seeders & Snapshot Tables
│   │   ├── audit-universe/   # Đối tượng kiểm toán & Universe Hierarchy
│   │   ├── risk-assessments/ # Chu trình đánh giá rủi ro RBIA & Risk Scoring
│   │   ├── audit-plans/      # Lập & phê duyệt Kế hoạch kiểm toán năm
│   │   ├── audit-engagements/# Thực địa đoàn kiểm toán & Quản lý nhân sự
│   │   ├── working-papers/   # Giấy tờ làm việc WP, Review Notes (MB-10)
│   │   ├── audit-findings/   # Phát hiện 5C, phân loại rủi ro Critical/High
│   │   ├── recommendations/  # Khắc phục kiến nghị, SLA & Theo dõi hậu kiểm
│   │   ├── audit-reports/    # Soạn thảo báo cáo KTNB & Xếp hạng KSNB
│   │   ├── continuous-monitoring/ # Giám sát liên tục & Phân tích CAATs
│   │   ├── general-tasks/    # Giao việc ngoài đoàn, tiến độ phòng ban
│   │   ├── kpi/              # Đánh giá hiệu quả BSC-KPI (MB02.HRM.2026)
│   │   ├── audit-committee/  # Cổng Ban Kiểm Soát (Audit Charter, 3LoD)
│   │   ├── collaboration/    # WebSocket Yjs server cho cộng tác thời gian thực
│   │   ├── data-source.ts    # TypeORM Data Source CLI config
│   │   └── main.ts           # Entry point khởi tạo Fastify HTTP Server (Port 3001)
│   ├── dist/                 # Biên dịch production artifacts của backend
│   ├── package.json          # Quản lý dependencies & npm scripts backend
│   └── tsconfig.json         # Cấu hình TypeScript compiler
│
├── frontend/                 # React 19 + Vite 8 SPA (Ant Design 6.6.5)
│   ├── src/                  # Mã nguồn TypeScript frontend
│   │   ├── components/       # Reusable UI components (Modals, Drawers, Charts)
│   │   ├── layout/           # MainLayout.tsx (Sidebar Menu, Navigation, RBAC Filter)
│   │   ├── pages/            # Màn hình chức năng & 3 Mega Hubs
│   │   │   ├── Dashboard.tsx               # Bàn làm việc & Điều hành cấp cao
│   │   │   ├── RiskAndPlanningHub.tsx      # Mega Hub 1: Rủi Ro & Kế Hoạch Năm
│   │   │   ├── FindingsAndReportsHub.tsx   # Mega Hub 2: Phát Hiện & Báo Cáo KT
│   │   │   ├── SystemSettingsHub.tsx       # Mega Hub 3: Quản Trị Hệ Thống
│   │   │   ├── AuditEngagements.tsx        # Cuộc Kiểm Toán Thực Địa
│   │   │   ├── GeneralTasks.tsx            # Việc ngoài đoàn & Tiến độ Phòng/KTV
│   │   │   ├── BscKpi.tsx                  # Đánh giá BSC-KPI & Nhân sự MB02
│   │   │   ├── AuditCommitteePortal.tsx    # Cổng Ban Kiểm Soát (IIA 1000)
│   │   │   └── ContinuousMonitoring.tsx    # Giám sát liên tục & CAATs
│   │   ├── services/         # Axios API Client cấu hình interceptors, token
│   │   ├── utils/            # Bảng tra cứu, Excel export, filters helper
│   │   ├── App.tsx           # Quản lý Routing tập trung & ProtectedRoute
│   │   └── main.tsx          # Entry point của React DOM
│   ├── dist/                 # Static Production Bundle sau khi `vite build`
│   ├── package.json          # Dependencies & npm scripts frontend
│   └── vite.config.ts        # Vite configuration & proxy dev server
│
├── deploy/                   # Cấu hình đóng gói & triển khai Production/Staging
│   ├── ubuntu/               # Script cài đặt tự động cho Ubuntu Server
│   │   ├── ecosystem.config.js # Cấu hình PM2 Cluster (instances, logs, mem limit)
│   │   ├── nginx-lpbank.conf   # Cấu hình Nginx Reverse Proxy, SSL, Gzip, Security Headers
│   │   ├── setup-server.sh     # Cài đặt tự động Node.js, Postgres, Redis, Nginx
│   │   ├── deploy.sh           # Script kéo code, build và restart PM2
│   │   └── backup-cron.sh      # Script tự động backup DB và files hàng ngày
│   └── .env.production.example # Template biến môi trường cho máy chủ Production
│
├── scripts/                  # Kịch bản kiểm thử tự động (Master Verification Suites)
│   ├── verify-all-phases.cjs # Master test suite chạy kiểm tra toàn bộ Phase A -> F
│   ├── verify-tasks-kpi-bks.cjs # Kiểm tra router, menu, tabs việc ngoài đoàn, KPI, BKS
│   ├── verify-rbia-planning-hub.cjs # Kiểm tra RBIA 4-step canonical contract
│   └── verify-engagement-fieldwork-refactor.cjs # Kiểm tra MB-04 -> MB-10 Review Notes
│
└── docs/                     # Tài liệu PRD, BRD, ADR Kiến trúc, C4 Diagrams
```

---

## 2. CẤU TRÚC CƠ SỞ DỮ LIỆU (DATABASE ARCHITECTURE & SCHEMAS)

Hệ thống sử dụng **PostgreSQL 16 Enterprise** với cơ chế quản lý Schema hoàn toàn bằng **TypeORM Migrations** (nghiêm cấm bật `synchronize: true` trên môi trường Test/Production để bảo toàn tính toàn vẹn dữ liệu).

### 2.1. Phân nhóm 125 bảng dữ liệu cốt lõi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HỆ THỐNG CƠ SỞ DỮ LIỆU KTNB 4.0                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. QUẢN TRỊ NGƯỜI DÙNG & PHÂN QUYỀN (RBAC / CASL)                          │
│     users, roles, permissions, departments, audit_trail, login_sessions      │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. ĐỐI TƯỢNG KIỂM TOÁN & ĐÁNH GIÁ RỦI RO (RBIA LINE 3)                     │
│     audit_universes, risk_criteria, risk_assessments, risk_assessment_scores│
│     risk_control_matrices (RCM), risk_profiles, risk_registers               │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. KẾ HOẠCH NĂM & NGUỒN LỰC KIỂM TOÁN                                      │
│     audit_plans, audit_plan_units, resource_demands, resource_capacities     │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. THỰC ĐỊA ĐOÀN KIỂM TOÁN & GIẤY TỜ LÀM VIỆC (MB-04 -> MB-10)             │
│     audit_engagements, audit_workstreams, working_papers, test_of_controls   │
│     audit_review_notes (Phiếu soát xét MB-10), evidence_files, audit_minutes│
├─────────────────────────────────────────────────────────────────────────────┤
│  5. PHÁT HIỆN KIỂM TOÁN, KIẾN NGHỊ & HẬU KIỂM                               │
│     audit_findings (5C: Condition, Criteria, Cause, Consequence, Correction)│
│     recommendations (1:N với Finding), remediation_trackers, audit_ratings   │
├─────────────────────────────────────────────────────────────────────────────┤
│  6. GIÁM SÁT LIÊN TỤC & PHÂN TÍCH CAATs                                     │
│     continuous_monitoring_rules, continuous_monitoring_alerts, ews_signals  │
├─────────────────────────────────────────────────────────────────────────────┤
│  7. GIAO VIỆC NGOÀI ĐOÀN, TIMESHEET & BSC-KPI (MB02.HRM.2026)               │
│     general_tasks, timesheets, kpi_evaluations, kpi_targets, cpe_trainings   │
├─────────────────────────────────────────────────────────────────────────────┤
│  8. CỔNG BAN KIỂM SOÁT & QUẢN TRỊ CHUNG                                     │
│     audit_charters, committee_reports, unified_file_assets, system_configs   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Các quan hệ cốt lõi giữa các thực thể (Entity Relationships)
1. **AuditUniverse (1) ── (N) RiskAssessment (1) ── (N) RiskAssessmentScore**:  
   Điểm rủi ro không lưu cứng dạng cột trên AuditUniverse mà được tính toán động thông qua các tiêu chí chấm điểm `RiskAssessmentScore`.
2. **AuditEngagement (1) ── (N) AuditWorkstream (1) ── (N) WorkingPaper**:  
   Mỗi cuộc kiểm toán chia thành các mảng nghiệp vụ (workstream), mỗi mảng có danh sách giấy tờ làm việc (working papers).
3. **WorkingPaper (1) ── (N) AuditReviewNote (MB-10)**:  
   Phiếu soát xét kiểm toán gắn liền với từng WP. Cổng kiểm soát chất lượng (Quality Gate) bắt buộc 100% review notes phải đóng (`Closed`) mới được ký duyệt phê duyệt WP.
4. **AuditFinding (1) ── (N) Recommendation**:  
   Một phát hiện kiểm toán có thể phát sinh nhiều kiến nghị khắc phục cụ thể theo từng đơn vị xử lý.

---

## 3. HƯỚNG DẪN CÀI ĐẶT, BUILD & CHẠY LOCAL

### 3.1. Yêu cầu phần mềm cài đặt trước (Prerequisites)
- **Node.js**: Phiên bản LTS `20.x` hoặc `22.x` (khuyến nghị `v20.18.x`).
- **NPM**: Phiên bản `10.x` đi kèm Node.js.
- **PostgreSQL**: Phiên bản `15.x` hoặc `16.x` (Port mặc định: `5432`).
- **Redis Server**: Phiên bản `7.x` (Port mặc định: `6379`).
- **Git Client**.

### 3.2. Cài đặt và cấu hình Backend Local

```bash
# 1. Truy cập thư mục backend
cd "f:/Phan mem KTNB 4.0/backend"

# 2. Cài đặt dependencies
npm install

# 3. Tạo file cấu hình môi trường .env từ mẫu
cp .env.example .env
```

Cấu hình file `backend/.env` cho môi trường máy trạm local:
```ini
# ===== Core Server =====
NODE_ENV=development
PORT=3001
BIND_HOST=127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ===== Database PostgreSQL =====
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=ktnb_db

# ===== Security =====
JWT_SECRET=super-secret-jwt-key-minimum-32-chars-long-123456789
JWT_EXPIRES_IN=8h

# ===== Redis Cache =====
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# ===== Storage & File =====
STORAGE_PATH=./uploads
ENABLE_DEMO_SEED=true
```

```bash
# 4. Khởi tạo cơ sở dữ liệu và chạy Migration
# Đảm bảo PostgreSQL đã tạo Database 'ktnb_db' rỗng trước khi chạy
npm run migration:run

# 5. Chạy backend ở chế độ Development (Watch mode)
npm run start:dev

# Hoặc chạy bản build độc lập:
npm run build
node dist/main.js
```
> Backend API sẽ sẵn sàng phục vụ tại: **`http://127.0.0.1:3001`**  
> Swagger Documentation (nếu bật): `http://127.0.0.1:3001/api/docs`

### 3.3. Cài đặt và cấu hình Frontend Local

```bash
# 1. Mở terminal mới, truy cập thư mục frontend
cd "f:/Phan mem KTNB 4.0/frontend"

# 2. Cài đặt dependencies
npm install

# 3. Khởi chạy Vite Dev Server
npm run dev
```
> Frontend giao diện sẽ sẵn sàng tại: **`http://127.0.0.1:5173`**  
> Mặc định Vite đã cấu hình proxy ngầm forward mọi request `/api/*` sang `http://127.0.0.1:3001`.

### 3.4. Chạy bộ kịch bản kiểm thử tự động (Verification Suites)
Trước khi commit mã nguồn hoặc bàn giao bản build, bắt buộc chạy các lệnh kiểm thử sau từ thư mục gốc dự án:

```bash
cd "f:/Phan mem KTNB 4.0"

# 1. Kiểm tra tích hợp router, sidebar, việc ngoài đoàn, BSC-KPI & Cổng BKS
node scripts/verify-tasks-kpi-bks.cjs

# 2. Kiểm tra toàn bộ 6 Phase kiến trúc nền tảng (Phase A -> F)
node scripts/verify-all-phases.cjs

# 3. Kiểm tra tính năng Lập kế hoạch theo rủi ro (RBIA Planning Hub)
node scripts/verify-rbia-planning-hub.cjs

# 4. Kiểm tra quy trình Thực địa, Soát xét Giấy tờ làm việc MB-04 -> MB-10
node scripts/verify-engagement-fieldwork-refactor.cjs

# 5. Kiểm tra build bundle tĩnh của Frontend
npm --prefix frontend run build

# 6. Kiểm tra TypeScript build của Backend
npm --prefix backend run build
```
*(Tiêu chuẩn đạt: Tất cả các scripts trên phản hồi **100% GREEN / EXIT CODE 0**).*

---

## 4. CÁC PLUGIN, THƯ VIỆN & HỆ THỐNG TÍCH HỢP

### 4.1. Thư viện & Plugin trên Frontend
| Thư viện / Plugin | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **`antd`** | `^6.6.5` | Bộ Design System & Component chuẩn doanh nghiệp của Ant Design |
| **`@ant-design/icons`** | `^6.3.4` | Hệ thống Icon SVG đồng bộ toàn bộ giao diện |
| **`react-router-dom`** | `^7.18.0` | Quản trị định tuyến phân tầng và bảo vệ route theo vai trò (RBAC) |
| **`@tanstack/react-query`**| `^5.101.4` | Quản trị server state, caching, background fetch và optimistic updates |
| **`recharts`** | `^3.8.1` | Vẽ biểu đồ Dashboard: Phân bổ rủi ro, tiến độ cuộc KT, Heatmap |
| **`@tiptap/*`** | `^3.29.2` | Rich-text editor hỗ trợ bảng biểu, checklist cho biên soạn Working Paper & Báo cáo KT |
| **`yjs` + `y-websocket`** | `^13.6.14` | Engine cộng tác trực tiếp đa người dùng theo thời gian thực (Realtime Collaborative Editing) |
| **`@casl/ability` + react** | `^7.0.0` | Kiểm tra quyền truy cập chi tiết tới cấp nút bấm / thao tác (Permission Action Matrix) |
| **`dayjs`** | `^1.11.20` | Xử lý thời gian, định dạng ngày tháng theo locale Tiếng Việt |
| **`i18next`** | `^26.3.1` | Hỗ trợ song ngữ Tiếng Việt / Tiếng Anh cho toàn bộ hệ thống |
| **`tailwindcss`** | `^4.3.0` | Tối ưu hóa utility class styling hiện đại |

### 4.2. Thư viện & Framework trên Backend
| Thư viện / Framework | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **`@nestjs/*`** | `^11.0.1` | Khung kiến trúc ứng dụng Modular Monolith cấp doanh nghiệp |
| **`@nestjs/platform-fastify`**| `^11.1.28` | Fastify adapter thay thế Express, tăng throughput xử lý I/O gấp 2-3 lần |
| **`typeorm`** | `^0.3.29` | ORM ánh xạ thực thể, quản lý kết nối, giao dịch DB và schema migrations |
| **`pg` / `mysql2` / `mssql`** | Latest | Trình điều khiển kết nối trực tiếp đa nguồn cơ sở dữ liệu |
| **`bullmq` + redis** | `^5.81.3` | Quản trị hàng đợi công việc nền (Background Jobs, Email, Xuất báo cáo dung lượng lớn) |
| **`@bull-board/fastify`** | `^8.6.0` | Bảng điều khiển giám sát hàng đợi BullMQ thời gian thực |
| **`exceljs`** | `^4.4.0` | Đọc, phân tích, sinh và kết xuất các biểu mẫu Excel phức tạp (MB02, MB04, RCM) |
| **`docx` / `docxtemplater`** | `^9.6.1` | Xuất tự động Báo cáo Kiểm toán và Biên bản kiểm toán theo mẫu chuẩn Word |
| **`otplib` + `qrcode`** | `^13.4.0` | Tạo mã OTP và xác thực đa yếu tố 2FA (Google Authenticator / Microsoft Authenticator) |
| **`ldapjs`** | `^3.0.7` | Kết nối xác thực tài khoản tập trung với Active Directory ngân hàng |
| **`@azure/msal-node`** | `^5.5.0` | Tích hợp xác thực Single Sign-On (SSO) với Microsoft Entra ID / Office 365 |

---

## 5. THÔNG TIN MÔI TRƯỜNG & HƯỚNG DẪN DEPLOY SERVER TEST / PRODUCTION

### 5.1. Bảng ma trận môi trường & Cổng dịch vụ (Port Matrix)
- **Domain máy chủ test/production:** `https://chinhta.io.vn`
- **Hệ điều hành:** Ubuntu Server 22.04 LTS (x86_64)
- **Thư mục cài đặt ứng dụng:** `/var/www/phanmem/`
- **Thư mục Frontend Static Dist:** `/var/www/phanmem/frontend/dist`
- **Thư mục Backend Node API:** `/var/www/phanmem/backend`

| Dịch vụ (Service) | Cổng lắng nghe (Port) | Phạm vi truy cập (Network Binding) | Cơ chế quản lý |
| :--- | :--- | :--- | :--- |
| **Nginx (HTTP -> HTTPS)** | `80/tcp`, `443/tcp` | Public Internet | `systemd` |
| **Backend Cluster API** | `3001/tcp` | Nội bộ (`127.0.0.1`) | `PM2 Cluster` (2 instances) |
| **Realtime Collab (Yjs)**| `1234/tcp` | Nội bộ (`127.0.0.1`) | `PM2 Fork` |
| **PostgreSQL Database** | `5432/tcp` | Nội bộ (`127.0.0.1`) | `systemd` |
| **Redis In-memory** | `6379/tcp` | Nội bộ (`127.0.0.1`) | `systemd` |

### 5.2. Tệp biến môi trường mẫu trên Server (`/var/www/phanmem/backend/.env`)
```ini
# ==============================================================================
# LPBANK SMART AUDIT 4.0 - PRODUCTION ENVIRONMENT
# ==============================================================================
NODE_ENV=production
PORT=3001
BIND_HOST=127.0.0.1

# Cấu hình Cơ sở dữ liệu PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=ktnb_user
DB_PASSWORD=SecurePassword_ChangeThisInProduction_2026!@#
DB_NAME=ktnb_db
TYPEORM_SYNC=false

# An ninh & JWT Token
JWT_SECRET=ktnb_super_secure_random_key_production_32chars_long_2026
JWT_EXPIRES_IN=8h
CORS_ORIGINS=https://chinhta.io.vn,http://localhost

# Redis Cache & Queue
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Dịch vụ phụ trợ & Quản lý file
STORAGE_PATH=/var/www/phanmem/storage/uploads
MAX_FILE_SIZE_BYTES=52428800
ENABLE_DEMO_SEED=false
```

### 5.3. Hướng dẫn Deploy chuẩn từng bước (Step-by-Step Deployment Runbook)

#### Bước 1: Build gói triển khai tại máy phát triển
```bash
# 1. Build backend
cd "f:/Phan mem KTNB 4.0/backend"
npm run build

# 2. Build frontend
cd "../frontend"
npm run build

# 3. Nén frontend dist thành gói deploy
tar -czf ../frontend-deploy.tar.gz -C dist .
cd ..
```

#### Bước 2: Tải gói lên máy chủ qua SSH/SCP
```bash
# Upload frontend bundle
scp -o StrictHostKeyChecking=no frontend-deploy.tar.gz root@chinhta.io.vn:/var/www/phanmem/

# Đồng bộ mã nguồn/dist backend (nếu có thay đổi backend)
rsync -avz --exclude 'node_modules' --exclude '.git' backend/dist backend/package.json root@chinhta.io.vn:/var/www/phanmem/backend/
```

#### Bước 3: Triển khai và khởi động dịch vụ trên Server
Kết nối SSH vào máy chủ: `ssh root@chinhta.io.vn` và thực thi:

```bash
# 1. Giải nén frontend vào thư mục phục vụ web của Nginx
mkdir -p /var/www/phanmem/frontend/dist
tar -xzf /var/www/phanmem/frontend-deploy.tar.gz -C /var/www/phanmem/frontend/dist
rm /var/www/phanmem/frontend-deploy.tar.gz

# 2. Di chuyển vào thư mục backend và chạy migration (nếu có migration mới)
cd /var/www/phanmem/backend
npm install --omit=dev
npm run migration:run

# 3. Khởi động lại ứng dụng qua PM2 mà không gián đoạn dịch vụ (Zero-Downtime Reload)
pm2 reload ecosystem.config.js --update-env

# 4. Kiểm tra cú pháp Nginx và reload cấu hình web server
nginx -t && systemctl reload nginx
```

#### Bước 4: Kiểm tra trạng thái sau Deploy (Smoke Test)
```bash
# Kiểm tra tiến trình PM2
pm2 status

# Kiểm tra phản hồi HTTP/2 200 OK từ Nginx
curl -Is https://chinhta.io.vn/audit-committee-portal | head -n 5
curl -Is https://chinhta.io.vn/general-tasks | head -n 5
curl -Is https://chinhta.io.vn/bsc-kpi | head -n 5

# Kiểm tra log nếu phát sinh lỗi
pm2 logs nestjs-backend --lines 50
tail -n 50 /var/log/nginx/error.log
```

---

## 6. QUY TRÌNH GIÁM SÁT, BẢO TRÌ & XỬ LÝ SỰ CỐ (RUNBOOK)

### 6.1. Quản lý tiến trình PM2
- Xem danh sách và tài nguyên CPU/RAM: `pm2 status`
- Xem log thời gian thực: `pm2 logs`
- Khởi động lại dịch vụ: `pm2 restart nestjs-backend`
- Dừng dịch vụ: `pm2 stop nestjs-backend`

### 6.2. Sao lưu dữ liệu tự động (Backup Strategy)
Cấu hình Cronjob chạy hàng ngày vào 01:00 AM (`crontab -e`):
```bash
0 1 * * * /var/www/phanmem/deploy/ubuntu/backup-cron.sh >> /var/log/backup.log 2>&1
```
Nội dung lệnh sao lưu DB:
```bash
pg_dump -U ktnb_user -h 127.0.0.1 -d ktnb_db -F c -b -v -f "/var/backups/ktnb/db_$(date +\%Y\%m\%d_\%H\%M\%S).dump"
```

### 6.3. Khôi phục dữ liệu khẩn cấp (Disaster Recovery)
```bash
pg_restore -U ktnb_user -h 127.0.0.1 -d ktnb_db -v -c "/var/backups/ktnb/db_backup_file.dump"
```

---

## 7. QUY TRÌNH CI/CD TỰ ĐỘNG (GITHUB ACTIONS ➔ VPS CHINHTA.IO.VN)

Hệ thống đã được trang bị sẵn pipeline tự động hóa hoàn chỉnh:
- **File cấu hình Workflow**: [`.github/workflows/deploy-vps.yml`](file:///f:/Phan%20mem%20KTNB%204.0/.github/workflows/deploy-vps.yml)
- **Tài liệu hướng dẫn chi tiết**: [`docs/deployment/CI_CD_PIPELINE_GUIDE.md`](file:///f:/Phan%20mem%20KTNB%204.0/docs/deployment/CI_CD_PIPELINE_GUIDE.md)

### Tóm tắt luồng hoạt động:
1. Lập trình viên push mã nguồn vào nhánh `main`.
2. GitHub Runner tự động chạy TypeCheck (`tsc --noEmit`), chạy Test Suites xác minh hệ thống (`verify-all-routed-and-menu.cjs`, `verify-tasks-kpi-bks.cjs`).
3. Runner tự động build NestJS Backend và Vite Frontend React 19.
4. Runner kết nối SSH an toàn tới VPS `chinhta.io.vn`, tự động tạo bản backup phòng sự cố, triển khai bản cập nhật, chạy TypeORM migration và reload PM2 với cơ chế Zero-Downtime.
5. Runner thực hiện Smoke Test HTTP 200 OK và gửi thông báo hoàn tất.

