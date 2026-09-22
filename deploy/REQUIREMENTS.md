# YÊU CẦU KỸ THUẬT HỆ THỐNG (SYSTEM REQUIREMENTS)
## Hệ Thống Kiểm Toán Nội Bộ LPBank Smart Audit 4.0

Tài liệu này xác định đầy đủ các tiêu chuẩn phần cứng, phần mềm, mạng và an ninh cần thiết trước khi triển khai hệ thống **LPBank Smart Audit 4.0** lên môi trường máy chủ **Ubuntu Linux Server**.

---

## 1. Yêu Cầu Phần Cứng (Hardware Requirements)

Tùy thuộc vào quy mô người dùng (KTV, Trưởng đoàn, Lãnh đạo Khối KTNB, Đơn vị được kiểm toán) và khối lượng dữ liệu giao dịch kiểm toán:

| Cấu Hình | Môi Trường Khảo Sát / Staging (≤ 15 người dùng) | Môi Trường Sản Xuất / Production (50 - 200+ người dùng) |
|---|---|---|
| **CPU** | 2 vCPU (Tần số ≥ 2.4 GHz) | **4 - 8 vCPU** (Tần số ≥ 2.8 GHz) |
| **RAM** | 4 GB RAM + 2 GB Swap file | **8 GB - 16 GB RAM** (Khuyến nghị 16 GB) |
| **Ổ Cứng (Disk)** | 30 GB SSD | **80 GB - 150 GB NVMe SSD** (Đọc/Ghi nhanh) |
| **IOPS Ổ cứng** | ≥ 3,000 IOPS | **≥ 10,000 IOPS** (Hỗ trợ phân tích dữ liệu & export Excel lớn) |
| **Băng Thông Mạng** | 50 Mbps | **≥ 100 Mbps** đối xứng (Static Public IP) |

> [!TIP]
> Do hệ thống xử lý các tập mẫu kiểm toán lớn (tới hàng trăm nghìn giao dịch), OCR văn bản và xuất báo cáo Word/Excel nhiều sheet, việc sử dụng ổ cứng NVMe và phân bổ ít nhất 4GB Swap sẽ đảm bảo hệ thống không bị crash do tràn bộ nhớ (Out-Of-Memory).

---

## 2. Yêu Cầu Hệ Điều Hành & Phần Mềm (Software Stack)

### 2.1. Hệ Điều Hành Hỗ Trợ
- **Ubuntu Server 24.04 LTS (Noble Numbat)** - *Khuyến nghị tối ưu*
- **Ubuntu Server 22.04 LTS (Jammy Jellyfish)** - *Khuyến nghị ổn định*
- **Ubuntu Server 20.04 LTS (Focal Fossa)** - *Hỗ trợ tối thiểu*
- Kiến trúc: `x86_64` (amd64)

### 2.2. Danh Mục Các Phần Mềm Cần Cài Đặt (Native Stack)

| Phần Mềm / Dịch Vụ | Phiên Bản Khuyến Nghị | Mục Đích Sử Dụng |
|---|---|---|
| **Node.js** | **v20.x LTS** (>= 20.18.0) | Nền tảng thực thi Backend NestJS & build Frontend React |
| **npm** | **v10.x** | Trình quản lý gói thư viện JavaScript |
| **PostgreSQL** | **v14.x, v15.x hoặc v16.x** | Cơ sở dữ liệu quan hệ lưu trữ dữ liệu nghiệp vụ KTNB |
| **Redis Server** | **v7.x** | Bộ nhớ đệm (Cache), xử lý hàng đợi BullMQ & Rate-Limiting |
| **Nginx** | **v1.18+** | Reverse Proxy, phục vụ file tĩnh SPA, cân bằng tải, SSL |
| **PM2** | **v5.x** | Quản lý tiến trình backend, tự khởi động lại khi crash |
| **Python 3** | **Python 3.10+ & pip** | Chạy OCR microservice (nếu không dùng Docker) |
| **Certbot (Tùy chọn)** | **v2.x** | Tự động cấp phát và gia hạn chứng chỉ SSL Let's Encrypt |

### 2.3. Danh Mục Phần Mềm (Docker Stack - Phương án Container)
Nếu lựa chọn triển khai qua Docker:
- **Docker Engine**: `>= 24.0`
- **Docker Compose**: `>= 2.20` (hoặc lệnh `docker compose` plugin)

---

## 3. Yêu Cầu Cổng Mạng & Tường Lửa (Network & Firewall Ports)

Cần cấu hình tường lửa (UFW hoặc Security Group trên Cloud/Data Center):

### 3.1. Cổng Mạng Công Khai (Inbound - Public Internet / Intranet)
| Cổng (Port) | Giao Thức | Dịch Vụ | Mô Tả |
|---|---|---|---|
| **22** | TCP | SSH | Truy cập quản trị máy chủ từ xa (Nên giới hạn IP nếu có thể) |
| **80** | TCP | HTTP | Nginx - Chuyển hướng tự động sang HTTPS |
| **443** | TCP | HTTPS | Nginx - Cổng truy cập chính của người dùng vào hệ thống |

### 3.2. Cổng Mạng Nội Bộ (Internal Only - 127.0.0.1 / Localhost)
> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG MỞ CÁC CỔNG SAU RA PUBLIC INTERNET:**
- `3001` (hoặc `3000`): NestJS Backend Fastify API.
- `5432`: PostgreSQL Database.
- `6379`: Redis Server.
- `8000`: Python FastAPI OCR Service.

---

## 4. Danh Mục Biến Môi Trường Trọng Yếu (Environment Variables)

Hệ thống yêu cầu tệp cấu hình `.env` tại thư mục gốc backend (`/var/www/phanmem/backend/.env`).

| Biến Môi Trường | Giá Trị Mẫu | Bắt Buộc | Mô Tả & Lưu Ý An Ninh |
|---|---|---|---|
| `NODE_ENV` | `production` | **Có** | Kích hoạt tối ưu hiệu năng và kiểm tra an ninh |
| `PORT` | `3001` | **Có** | Cổng lắng nghe của ứng dụng Backend |
| `BIND_HOST` | `127.0.0.1` | **Có** | Khóa backend chỉ lắng nghe nội bộ, Nginx proxy vào |
| `DB_HOST` | `127.0.0.1` | **Có** | Địa chỉ máy chủ PostgreSQL |
| `DB_PORT` | `5432` | **Có** | Cổng kết nối PostgreSQL |
| `DB_USERNAME` | `ktnb_user` | **Có** | Tên tài khoản CSDL chuyên dụng (không dùng superuser postgres) |
| `DB_PASSWORD` | *(Mật khẩu an toàn)* | **Có** | **Bắt buộc ≥ 12 ký tự phức tạp** (Hệ thống sẽ từ chối khởi động nếu dùng mật khẩu mặc định) |
| `DB_NAME` | `ktnb_db` | **Có** | Tên cơ sở dữ liệu |
| `JWT_SECRET` | *(Chuỗi ngẫu nhiên)* | **Có** | **Bắt buộc ≥ 32 ký tự ngẫu nhiên** để mã hóa Token phiên đăng nhập |
| `JWT_EXPIRES_IN` | `8h` | Không | Thời hạn hiệu lực của phiên làm việc (VD: 8h, 12h, 1d) |
| `CORS_ORIGINS` | `https://chinhta.io.vn` | **Có** | Danh sách domain được phép gửi request (phân tách bởi dấu phẩy) |
| `REDIS_HOST` | `127.0.0.1` | Không | Địa chỉ máy chủ Redis (mặc định 127.0.0.1) |
| `REDIS_PORT` | `6379` | Không | Cổng kết nối Redis (mặc định 6379) |
| `OCR_SERVICE_URL`| `http://127.0.0.1:8000/extract` | Không | Địa chỉ dịch vụ OCR bóc tách văn bản |

---

## 5. Danh Mục Kiểm Tra Trước Khi Triển Khai (Pre-flight Checklist)

- [ ] Máy chủ đã được cập nhật hệ điều hành mới nhất (`sudo apt update && sudo apt upgrade -y`).
- [ ] Đã trỏ bản ghi DNS Domain (`A record`) về địa chỉ IP của máy chủ.
- [ ] Đã cấp quyền `sudo` cho người dùng quản trị.
- [ ] Đã chuẩn bị chuỗi mật khẩu mạnh cho `DB_PASSWORD` và `JWT_SECRET`.
- [ ] Dung lượng trống phân vùng `/` còn tối thiểu 20 GB.
