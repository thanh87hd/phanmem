# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LPBANK SMART AUDIT 4.0 (ALL-IN-ONE)
### GIẢI PHÁP ĐÓNG GÓI CÀI ĐẶT TỰ ĐỘNG CHO MÁY CHỦ AIR-GAPPED (OFFLINE) & ONLINE
**Ngân hàng TMCP Lộc Phát Việt Nam (LPBank) - Ban Kiểm soát & Khối Kiểm toán Nội bộ**

---

## 1. TỔNG QUAN HỆ THỐNG & GÓI CÀI ĐẶT
Hệ thống **LPBank Smart Audit 4.0** là nền tảng số hóa toàn diện quy trình kiểm toán nội bộ ngân hàng, tích hợp trí tuệ nhân tạo (AI/LLM Local), OCR tài liệu và cộng tác biên tập thời gian thực.

Gói cài đặt **All-in-One Offline** (`lpbank-ktnb-allinone-offline.tar.gz` - dung lượng nén ~542 MB, giải nén ~922 MB) được thiết kế theo chuẩn **Air-Gapped**, đóng gói sẵn toàn bộ các thành phần nhị phân, thư viện hệ điều hành, runtime, CSDL và mô hình AI để vận hành độc lập **không cần Internet**.

### 1.1. Cấu trúc thư mục gói All-in-One
```text
lpbank-ktnb-allinone-offline/
├── 1_os_packages/
│   └── debs/                    # Trọn bộ 30+ gói .deb (Postgres, Redis, Nginx, Python, Certbot...)
├── 2_runtimes/
│   ├── nodejs/                  # Node.js 20.18.0 LTS (Linux x64 binary)
│   ├── pm2/                     # PM2 Enterprise Process Manager (.tgz)
│   └── ollama/                  # Ollama binary + Thư viện CPU Runner (llama-server, ggml)
├── 3_ai_and_plugins/
│   ├── ai_service/              # Mã nguồn Python FastAPI OCR Service (Port 8000)
│   ├── python_wheels/           # Các gói wheel offline (fastapi, uvicorn, pydantic, pdf...)
│   └── ollama_models/           # Mô hình AI Local Qwen2.5 0.5B đã lượng tử hóa
├── 4_application/
│   └── phanmem/
│       ├── backend/             # Mã nguồn NestJS đã build (dist, node_modules production, .env)
│       ├── frontend/            # Bản build React Vite SPA (HTML5, Tailwind, JS bundle)
│       └── uploads/             # Thư mục lưu trữ tệp đính kèm và tài liệu kiểm toán
├── 5_database/
│   └── ktnb_db_full.sql         # Bản sao lưu toàn vẹn CSDL PostgreSQL 16 (61 User, 1408 Branch)
├── 6_configs/
│   ├── nginx-phanmem.conf       # Cấu hình Nginx Reverse Proxy tối ưu hóa HTTP/2, WebSocket
│   └── ecosystem.config.js      # Cấu hình điều phối tiến trình PM2
├── setup-allinone-offline.sh    # Script cài đặt tự động 1-Click (8 bước tự động hóa)
├── setup-ssl-certbot.sh         # Script chuyên dụng cấp mới / gia hạn SSL Let's Encrypt
├── verify-offline.sh            # Bộ công cụ kiểm thử sức khỏe hệ thống 7 tầng
└── README_HUONG_DAN_CAI_DAT.md   # Hướng dẫn chi tiết triển khai & quản trị
```

---

## 2. YÊU CẦU MÁY CHỦ (HARDWARE & OS REQUIREMENTS)

### 2.1. Hệ điều hành được hỗ trợ
- **Ubuntu:** 24.04 LTS (Noble Numbat) hoặc 22.04 LTS (Jammy Jellyfish) - Khuyên dùng.
- **Debian:** Debian 12 (Bookworm).
- **Kiến trúc CPU:** x86_64 (amd64).

### 2.2. Cấu hình phần cứng
| Tiêu chí | Cấu hình tối thiểu (Dev/Staging) | Cấu hình khuyến nghị (Production) |
| :--- | :--- | :--- |
| **CPU** | 1 vCPU Core | 2 - 4 vCPU Cores |
| **RAM** | 1 GB vật lý *(Script tự tạo 2GB Swap bảo vệ)* | 4 GB - 8 GB RAM |
| **Ổ cứng (Disk)**| 20 GB SSD trống | 50 GB - 100 GB NVMe SSD |
| **Quyền hạn** | `root` hoặc tài khoản có quyền `sudo` | `root` |
| **Kết nối mạng**| Hoàn toàn ngắt mạng (Air-Gapped) | Nội bộ mạng LAN Ngân hàng / Internet |

---

## 3. QUY TRÌNH TRIỂN KHAI 3 BƯỚC SIÊU TỐC

### Bước 1: Chép gói cài đặt lên máy chủ mới
Chép tệp `lpbank-ktnb-allinone-offline.tar.gz` vào thư mục `/root` của máy chủ qua USB an toàn hoặc qua giao thức SSH/SCP:
```bash
# Lệnh chép từ máy tính cá nhân lên máy chủ (thay đổi IP tương ứng):
scp C:\Users\ducth\lpbank-ktnb-allinone-offline.tar.gz root@<IP_MÁY_CHỦ>:/root/
```

### Bước 2: Giải nén gói cài đặt
Đăng nhập SSH vào máy chủ và giải nén:
```bash
cd /root
tar -xzf lpbank-ktnb-allinone-offline.tar.gz
cd lpbank-ktnb-allinone-offline
```

### Bước 3: Chạy script cài đặt tự động 1-Click
Thực thi lệnh cài đặt với quyền quản trị viên cao nhất:
```bash
sudo bash setup-allinone-offline.sh
```
*Thời gian triển khai:* Khoảng **2 - 3 phút**. Script sẽ tuần tự thực thi 8 bước tự động hóa khép kín:
1. **Thiết lập 2GB Swap Memory** bảo đảm an toàn bộ nhớ máy chủ, chống tràn RAM (OOM Crash).
2. **Cài đặt các gói hệ thống (.deb):** Nginx, PostgreSQL, Redis, Python3, Certbot mà không cần kết nối mạng.
3. **Cài đặt Node.js 20 LTS & PM2:** Cấu hình biến môi trường và liên kết hệ thống toàn cục.
4. **Cài đặt môi trường ảo Python & AI OCR:** Thiết lập venv và cài đặt các thư viện xử lý tài liệu từ kho bánh xe (wheel) offline.
5. **Cài đặt Ollama Local LLM:** Nạp nhị phân, thư viện CPU Runner và mô hình `Qwen2.5 0.5B`.
6. **Khôi phục CSDL PostgreSQL:** Tạo tài khoản `ktnb`, phân quyền CSDL `ktnb_db` và phục hồi toàn bộ dữ liệu cấu trúc + nghiệp vụ chuẩn.
7. **Triển khai Web Nginx & SSL:** Cấu hình Reverse Proxy, nạp chứng chỉ SSL Let's Encrypt (nếu có Internet) hoặc kích hoạt SSL tự ký nội bộ (nếu ngắt mạng).
8. **Khởi động PM2 Service:** Kích hoạt đồng thời NestJS API, WebSocket Collaboration và Python OCR Service.

---

## 4. KIỂM THỬ SỨC KHỎE HỆ THỐNG TOÀN DIỆN (7 TẦNG)

Ngay sau khi cài đặt xong, chạy script kiểm tra tích hợp sẵn:
```bash
bash verify-offline.sh
```
Bộ kiểm thử sẽ kiểm tra tự động và in kết quả trực quan trên màn hình:
- **Tầng 1 (Systemd Services):** Kiểm tra trạng thái `active` của `nginx`, `postgresql`, `redis-server`, `ollama`.
- **Tầng 2 (PM2 Cluster):** Kiểm tra trạng thái `online` của `nestjs-backend` (Port 3000), `ktnb-collab` (Port 1234), `ai-ocr-service` (Port 8000).
- **Tầng 3 (Database Integrity):** Xác thực kết nối CSDL, kiểm đếm 61 tài khoản nhân viên, 1.408 phòng ban/chi nhánh và phản hồi `PONG` từ Redis Cache.
- **Tầng 4 (API Authentication):** Tự động gửi request đăng nhập bằng tài khoản Quản trị viên (`admin`), xác thực token JWT sinh ra.
- **Tầng 5 (Python OCR Service):** Kiểm tra endpoint `/health` của dịch vụ trích xuất tài liệu.
- **Tầng 6 (Ollama Local LLM):** Kiểm tra cổng 11434 và xác nhận model `qwen2.5:0.5b` đã sẵn sàng phục vụ.
- **Tầng 7 (Web Server & HTTPS):** Kiểm tra mã phản hồi HTTP/2 200 OK của giao diện Frontend trên Nginx.

---

## 5. CÁC ĐIỂM NGHẼN KỸ THUẬT & BẢN VÁ ĐÃ HOÀN THIỆN TRONG BỘ CÀI

Trong quá trình thử nghiệm thực tế, toàn bộ các lỗi tiềm ẩn đã được khắc phục hoàn toàn trong mã nguồn:

| Vấn đề kỹ thuật | Nguyên nhân gốc rễ | Giải pháp đã tích hợp trong bộ cài |
| :--- | :--- | :--- |
| **1. Ollama thiếu CPU Runner** | Ollama v0.32+ yêu cầu `llama-server` và các thư viện `libggml-cpu-*.so` nằm tại `/usr/local/lib/ollama/`. Nếu thiếu sẽ báo lỗi `llama runner not found`. | Đã đóng gói sẵn 31MB CPU Runner vào thư mục `2_runtimes/ollama/lib/ollama/` và tự động phân quyền `chmod -R 755`. |
| **2. Tràn RAM trên VPS nhỏ** | Chạy đồng thời 6 phân hệ trên VPS 1GB RAM làm kích hoạt Linux OOM Killer tắt tiến trình. | Tự động kiểm tra và khởi tạo 2GB Swap Memory tại Bước 1 của script cài đặt. |
| **3. Tranh chấp cổng & Lặp Cron Job** | Cấu hình `instances: "max"` và `cluster mode` trong PM2 gây lỗi `EADDRINUSE: 3000` và làm chạy trùng các tác vụ ngầm `@Cron()`. | Đổi `nestjs-backend` sang `instances: 1`, `exec_mode: "fork"`, tiết kiệm ~80MB RAM và bảo đảm Cron job chạy đơn nhất. |
| **4. Lỗi Node 20 ESM Require** | Thư viện `@scure/base` sử dụng chuẩn ES Module, khi Node 20 require dạng CommonJS sẽ ném ngoại lệ `ERR_REQUIRE_ESM`. | Đã thêm cờ `node_args: "--experimental-require-module"` vào `ecosystem.config.js`. |
| **5. PM2 hiểu sai Uvicorn** | PM2 mặc định dùng Node.js để chạy script binary của Python Uvicorn. | Cấu hình rõ `interpreter: "none"` cho ứng dụng `ai-ocr-service`. |
| **6. Trình duyệt chặn SSL tự ký (HSTS)** | Trình duyệt ép HTTPS nghiêm ngặt đối với các domain `.io.vn`, chặn SSL tự ký nội bộ. | Đóng gói sẵn 5 gói deb Certbot; tự động nhận diện Internet để cấp Let's Encrypt thật, kèm script 1-Click `setup-ssl-certbot.sh`. |

---

## 6. QUẢN LÝ CHỨNG CHỈ SSL (CERTBOT LET'S ENCRYPT)

Hệ thống hỗ trợ 2 chế độ SSL linh hoạt:
- **Chế độ Ngoại tuyến (Air-Gapped):** Hệ thống tự động tạo cặp chứng chỉ RSA 2048-bit tự ký đặt tại `/etc/letsencrypt/live/` để Nginx khởi động trơn tru.
- **Chế độ Trực tuyến (Public Domain):** Khi máy chủ có Internet và tên miền trỏ về IP máy chủ, quản trị viên chỉ cần chạy đúng 1 lệnh để cấp chứng chỉ chính thức và cấu hình tự động gia hạn 90 ngày:
```bash
sudo bash setup-ssl-certbot.sh
```
*Tùy chọn cấu hình nâng cao:*
```bash
# Chỉ định email quản trị riêng:
sudo bash setup-ssl-certbot.sh your-email@lpbank.com.vn
```

---

## 7. BẢNG TRA CỨU CỔNG DỊCH VỤ & LỆNH QUẢN TRỊ VẬN HÀNH

### 7.1. Danh mục cổng dịch vụ mạng (Network Ports)
| Cổng (Port) | Giao thức | Dịch vụ đảm nhiệm | Phạm vi truy cập |
| :---: | :---: | :--- | :--- |
| **80** | HTTP | Nginx Redirect sang HTTPS & ACME Challenge | Public / Mạng nội bộ |
| **443** | HTTPS | Nginx Web Server (Frontend SPA & API Proxy) | Public / Mạng nội bộ |
| **3000** | HTTP | NestJS Core API Backend Server | Nội bộ `127.0.0.1` |
| **1234** | WS/WSS | Yjs Collaboration WebSocket Server | Nội bộ `127.0.0.1` |
| **8000** | HTTP | Python FastAPI OCR & Document Extractor | Nội bộ `127.0.0.1` |
| **5432** | TCP | PostgreSQL 16 Database Server | Nội bộ `127.0.0.1` |
| **6379** | TCP | Redis Server (Cache, Queue, Session) | Nội bộ `127.0.0.1` |
| **11434**| HTTP | Ollama Local LLM Inference Engine | Nội bộ `127.0.0.1` |

### 7.2. Lệnh quản trị dịch vụ thường dùng
```bash
# Xem trạng thái cụm tiến trình PM2
pm2 list
pm2 status

# Xem nhật ký hoạt động (Logs) thời gian thực
pm2 logs
pm2 logs nestjs-backend --lines 50

# Khởi động lại toàn bộ hoặc từng tiến trình
pm2 restart all
pm2 restart nestjs-backend

# Quản lý dịch vụ hệ thống (Systemd)
systemctl status nginx postgresql redis-server ollama
systemctl restart nginx
systemctl restart postgresql
systemctl restart ollama
```

---

## 8. THÔNG TIN ĐĂNG NHẬP & PHÂN QUYỀN HỆ THỐNG

### 8.1. Địa chỉ truy cập
- **Tên miền chính:** `https://ktnb.io.vn` hoặc `https://chinhta.io.vn`
- **Truy cập nội bộ:** `http://<IP_MÁY_CHỦ>` hoặc `https://<IP_MÁY_CHỦ>`

### 8.2. Danh sách tài khoản quản trị mặc định
| Loại tài khoản | Tên đăng nhập (Username) | Mật khẩu chuẩn | Vai trò & Thẩm quyền |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin` | `@Lpbank2026!` | Toàn quyền cấu hình hệ thống, phân quyền, quản trị CSDL |
| **Trưởng ban Kiểm soát** | `auditor.ad` | `@Lpbank2026!` | Phê duyệt kế hoạch kiểm toán, ký duyệt báo cáo chính thức |
| **Kiểm toán viên chính** | `lead.auditor` | `@Lpbank2026!` | Lập kế hoạch, phân công kiểm toán viên, quản lý phát hiện |
| **Thành viên đoàn KT** | `auditor1`, `auditor2` | `@Lpbank2026!` | Thực thi kiểm toán, ghi nhận bằng chứng, trích xuất OCR |
| **Chi nhánh / Đơn vị** | Mã phòng ban / chi nhánh | `@Lpbank2026!` | Theo dõi kiến nghị, cập nhật tiến độ khắc phục rủi ro |

> *Ghi chú bảo mật:* Toàn bộ mật khẩu người dùng trong CSDL ban đầu đều được đồng bộ hóa về `@Lpbank2026!`. Sau lần đăng nhập đầu tiên, quản trị viên và người dùng nên đổi mật khẩu để tuân thủ chính sách an toàn thông tin của LPBank.
