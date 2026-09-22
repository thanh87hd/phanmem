# TÀI LIỆU AN NINH THÔNG TIN & TUÂN THỦ BẢO MẬT
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-DOC-SEC`  
**Chuẩn mực áp dụng**: Thông tư 09/2020/TT-NHNN, Thông tư 18/2018/TT-NHNN, OWASP Top 10 (2021), Mô hình đe dọa STRIDE, Nghị định 13/2023/NĐ-CP  
**Phiên bản**: 4.0.0  
**Tình trạng**: Ban hành chính thức  
**Đơn vị thẩm duyệt**: Khối An toàn Thông tin (CISO) & Ban Kiểm soát Ngân hàng  

---

## 1. KHUNG PHÁP LÝ & TIÊU CHUẨN AN TOÀN THÔNG TIN BẮT BUỘC

Hệ thống **Phần mềm Kiểm toán Nội bộ KTNB 4.0** lưu trữ toàn bộ các thông tin kiểm toán trọng yếu, hồ sơ rủi ro, phát hiện sai phạm và dữ liệu giao dịch tài chính của Ngân hàng. Do đó, hệ thống bắt buộc phải đáp ứng các tiêu chuẩn an toàn bảo mật cấp cao nhất:

1. **Thông tư 09/2020/TT-NHNN**: Quy định về an toàn hệ thống thông tin trong hoạt động ngân hàng.
   * Hệ thống KTNB 4.0 được phân loại là **Hệ thống thông tin Cấp độ 3** (theo quy định tại Điều 6 Thông tư 09/2020 và Nghị định 85/2016/NĐ-CP).
2. **Thông tư 18/2018/TT-NHNN**: Quy định về an toàn hệ thống thông tin trong hoạt động ngân hàng (yêu cầu quản lý khóa mật mã, phân tách môi trường, và kiểm thử xâm nhập định kỳ).
3. **Nghị định 13/2023/NĐ-CP**: Quy định về bảo vệ dữ liệu cá nhân (Personal Data Protection) đối với thông tin khách hàng và thông tin cán bộ nhân viên ngân hàng.
4. **Luật An ninh mạng số 24/2018/QH14**: Tuân thủ về chủ quyền dữ liệu, lưu trữ dữ liệu tại Việt Nam và ngăn chặn mã độc.

---

## 2. MÔ HÌNH PHÂN TÍCH ĐE DỌA STRIDE (STRIDE THREAT MODEL)

Mô hình đe dọa STRIDE được áp dụng để nhận diện rủi ro an ninh và thiết lập các chốt kiểm soát bảo vệ tương ứng trên toàn bộ các thành phần của hệ thống KTNB 4.0:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MÔ HÌNH ĐE DỌA STRIDE TRÊN KTNB 4.0                     │
├──────────────────────────┬───────────────────────────┬──────────────────────┤
│ Mối Đe Dọa (Threat)      │ Kịch Bản Rủi Ro           │ Biện Pháp Kiểm Soát  │
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ S - Spoofing             │ Kẻ tấn công giả mạo tài   │ Xác thực JWT ký số,  │
│ (Giả mạo danh tính)      │ khoản KTV hoặc Trưởng ban │ Keycloak SSO OIDC,   │
│                          │ KTNB để duyệt báo cáo     │ MFA bắt buộc, Lockout│
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ T - Tampering            │ KTV hoặc Auditee can      │ Băm SHA-256 file đính│
│ (Can thiệp làm giả dữ    │ thiệp sửa chữa biên bản,  │ kèm, khóa sổ kiểm    │
│ liệu)                    │ xóa dấu vết sai phạm      │ toán (Audit Freeze)  │
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ R - Repudiation          │ KTV chối bỏ việc đã ký    │ Audit Trail bất biến │
│ (Chối bỏ trách nhiệm)    │ duyệt hoặc Auditee chối bỏ│ (IP, Timestamp, User,│
│                          │ cam kết khắc phục         │ Old/New Value, Hash) │
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ I - Information          │ Rò rỉ dữ liệu phát hiện   │ Mã hóa TLS 1.3,      │
│ Disclosure (Lộ lọt thông │ kiểm toán nhạy cảm ra     │ AES-256 lưu trữ, che │
│ tin)                     │ bên ngoài                 │ giấu dữ liệu nhạy cảm│
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ D - Denial of Service    │ Tấn công làm tràn ngập    │ Rate Limiting trên   │
│ (Từ chối dịch vụ)        │ tài nguyên, gián đoạn     │ Fastify, Connection  │
│                          │ phê duyệt kế hoạch năm    │ Pooling, Cache Redis │
├──────────────────────────┼───────────────────────────┼──────────────────────┤
│ E - Elevation of         │ KTV tự nâng quyền thành   │ CASL RBAC + ABAC     │
│ Privilege (Leo thang     │ Trưởng ban KTNB để tự     │ kiểm tra quyền ở cả  │
│ đặc quyền)               │ duyệt hồ sơ của mình      │ Controller & Service │
└──────────────────────────┴───────────────────────────┴──────────────────────┘
```

---

## 3. CHIẾN LƯỢC PHÒNG CHỐNG CÁC LỖ HỔNG BẢO MẬT OWASP TOP 10

Hệ thống được thiết kế chủ động phòng chống 10 lỗ hổng an ninh mạng phổ biến nhất:

### 3.1. A01:2021 - Broken Access Control (Hở Kiểm Soát Truy Cập)
* **Giải pháp**:
  * Ứng dụng mô hình **CASL Authorization Framework** ở tầng Backend.
  * Mọi endpoint thao tác dữ liệu đều được bảo vệ bởi `@UseGuards(JwtAuthGuard, PoliciesGuard)`.
  * Kiểm soát quyền theo ngữ cảnh đối tượng (Object-level permission): KTV chỉ được cập nhật hồ sơ làm việc thuộc cuộc kiểm toán mà mình được phân công, và hồ sơ đó chưa bị khóa sổ (`is_locked == false`).

### 3.2. A02:2021 - Cryptographic Failures (Lỗi Mã Hóa Mật Mã)
* **Giải pháp**:
  * **Dữ liệu truyền tải (Data in Transit)**: Bắt buộc sử dụng giao thức **TLS 1.3** (hoặc TLS 1.2 với các bộ Cipher Suites an toàn: `ECDHE-ECDSA-AES256-GCM-SHA384`). Thiết lập cờ `Strict-Transport-Security` (HSTS) với thời gian 1 năm.
  * **Mã hóa Mật khẩu**: Bắt buộc sử dụng thuật toán băm chậm **Argon2id** (hoặc **Bcrypt với Work Factor = 12**), kèm Salt ngẫu nhiên chống tấn công Rainbow Table.
  * **Mã hóa Dữ liệu Lưu trữ (Data at Rest)**: Các tài liệu bằng chứng kiểm toán nhạy cảm và file đính kèm được mã hóa bằng **AES-256-GCM** trước khi ghi xuống ổ đĩa lưu trữ.

### 3.3. A03:2021 - Injection (Tấn Công Tiêm Lệnh SQL/NoSQL)
* **Giải pháp**:
  * 100% các truy vấn cơ sở dữ liệu đều thông qua **TypeORM Parameterized Queries** (Prepared Statements).
  * Nghiêm cấm tuyệt đối việc cộng chuỗi trực tiếp (String Concatenation) trong các câu lệnh SQL.
  * Áp dụng `ValidationPipe` của NestJS với thư viện `class-validator` và `class-transformer` để tự động loại bỏ (strip) các tham số không hợp lệ trong payload.

### 3.4. A04:2021 - Insecure Design (Thiết Kế Không An Toàn)
* **Giải pháp**:
  * Thiết lập cơ chế **Khóa Sổ Kiểm Toán (Audit Freeze / Sign-off)**: Khi Báo cáo Kiểm toán Nội bộ chính thức được ký ban hành, toàn bộ hồ sơ làm việc, bằng chứng và phát hiện thuộc cuộc kiểm toán đó tự động chuyển sang chế độ Chỉ đọc (Read-only). Không một người dùng nào (kể cả Quản trị viên) được phép chỉnh sửa dữ liệu, trừ trường hợp có yêu cầu mở khóa đặc biệt được Ban Kiểm soát phê duyệt bằng văn bản.

### 3.5. A05:2021 - Security Misconfiguration (Cấu Hình Sai Lầm Về Bảo Mật)
* **Giải pháp**:
  * Tắt hoàn toàn chế độ `stack-trace` và thông báo lỗi kỹ thuật chi tiết trên môi trường Production.
  * Áp dụng middleware **Helmet** để thiết lập các HTTP Security Headers chuẩn:
    * `Content-Security-Policy (CSP)`
    * `X-Frame-Options: DENY` (Chống Clickjacking)
    * `X-Content-Type-Options: nosniff`
    * `Referrer-Policy: strict-origin-when-cross-origin`

### 3.6. A07:2021 - Identification and Authentication Failures (Lỗi Xác Thực)
* **Giải pháp**:
  * **Chính sách Mật khẩu Mạnh**: Tối thiểu 10 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Hết hạn mật khẩu sau 90 ngày.
  * **Chống Tấn công Brute-force**: Khóa tài khoản tạm thời 30 phút nếu đăng nhập sai 5 lần liên tiếp.
  * **Quản lý Phiên làm việc (Session Management)**: Access Token JWT có thời hạn ngắn (15 phút). Cơ chế Refresh Token xoay vòng (Token Rotation) giúp thu hồi phiên ngay lập tức khi phát hiện nghi vấn.

### 3.7. A09:2021 - Security Logging and Monitoring Failures (Thiếu Log & Giám Sát)
* **Giải pháp**:
  * Ghi nhận tập trung toàn bộ các sự kiện xác thực, phân quyền thất bại, truy cập dữ liệu nhạy cảm vào bảng `audit_trails`.
  * Không bao giờ ghi nhận mật khẩu, token hoặc thông tin bí mật trong log hệ thống (Data Masking).

---

## 4. QUẢN LÝ ĐẶC QUYỀN TRUY CẬP (ACCESS CONTROL POLICY)

Hệ thống tuân thủ nguyên tắc **Đặc quyền Tối thiểu (Principle of Least Privilege)** và **Phân tách Trách nhiệm (Segregation of Duties - SoD)**:

```
                  ┌──────────────────────────────────────────────┐
                  │            BAN KIỂM SOÁT / HĐQT              │
                  │   • Quyền: Giám sát toàn quyền, xem Báo cáo  │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────▼───────────────────────┐
                  │          TRƯỞNG BAN KTNB (CAE)               │
                  │   • Quyền: Phê duyệt Kế hoạch, ký Báo cáo    │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│  TRƯỞNG ĐOÀN KIỂM TOÁN       │                         │  KIỂM TOÁN VIÊN THÀNH VIÊN   │
│  • Quản lý cuộc kiểm toán    │                         │  • Thực hiện bước kiểm tra   │
│  • Soát xét hồ sơ làm việc   │                         │  • Lập hồ sơ làm việc (ToD)  │
│  • Tạo & xóa Review Notes    │                         │  • Tải lên bằng chứng băm    │
│  • Duyệt phát hiện 5C        │                         │  • Giải trình Review Notes   │
└──────────────────────────────┘                         └──────────────────────────────┘
        │
        ▼ (Tách biệt quyền hạn - Segregation of Duties)
┌──────────────────────────────┐
│  ĐƠN VỊ ĐƯỢC KT (AUDITEE)    │
│  • Chỉ xem phát hiện của mình│
│  • Giải trình trực tuyến     │
│  • Cập nhật tiến độ khắc phục│
└──────────────────────────────┘
```

* **Ngăn ngừa Xung đột Lợi ích**:
  * Thành viên đoàn kiểm toán không được phép kiểm toán các đơn vị hoặc quy trình mà mình từng làm việc hoặc quản lý trong vòng **03 năm gần nhất** (tuân thủ Thông tư 13/2018/TT-NHNN và tính năng `IndependenceTracker.tsx`).

---

## 5. VẾT KIỂM TOÁN BẤT BIẾN & TÍNH TOÀN VẸN DỮ LIỆU (AUDIT TRAIL & NON-REPUDIATION)

### 5.1. Cơ Chế Băm Chống Sửa Đổi Bằng Chứng Kiểm Toán
Mọi tệp tin bằng chứng (file chứng từ kế toán, hợp đồng tín dụng, ảnh chụp, log trích xuất) khi tải lên hệ thống đều được băm theo giải thuật **SHA-256**:
$$\text{File Hash} = \text{SHA-256}(\text{File Content Bytes})$$
* Mã băm này được lưu trữ trong bảng `evidences`. Khi người dùng tải file về hoặc khi cơ quan chức năng kiểm tra, hệ thống tự động tính toán lại mã băm để đối chiếu. Nếu mã băm không trùng khớp, hệ thống phát cảnh báo tài liệu đã bị can thiệp trái phép.

### 5.2. Nhật Ký Vết Kiểm Toán (Audit Trail)
Bảng `audit_trails` được bảo vệ nghiêm ngặt:
* Không cấp quyền `UPDATE` hoặc `DELETE` trên bảng `audit_trails` cho bất kỳ người dùng ứng dụng nào (kể cả tài khoản quản trị).
* Dữ liệu log được phân vùng (Partitioned) theo tháng để đảm bảo khả năng mở rộng lưu trữ trong thời gian tối thiểu **05 năm** theo quy định lưu trữ chứng từ kiểm toán ngân hàng.

---

## 6. KẾ HOẠCH ỨNG PHÓ SỰ CỐ & PHỤC HỒI THẢM HỌA (INCIDENT RESPONSE & BCP/DR)

### 6.1. Quy Trình 6 Bước Ứng Phó Sự Cố An Ninh Mạng
1. **Chuẩn bị (Preparation)**: Thiết lập giám sát cảnh báo tài nguyên, cấu hình log tập trung.
2. **Nhận diện (Identification)**: Phát hiện dấu hiệu tấn công (Brute-force liên tục, quét lỗ hổng, sửa đổi file trái phép).
3. **Cô lập (Containment)**: Khóa tài khoản bị xâm nhập, cách ly địa chỉ IP máy trạm tấn công qua tường lửa, ngắt kết nối container bị nhiễm.
4. **Triệt tiêu (Eradication)**: Loại bỏ mã độc, thu hồi các token JWT đang phát hành, vá lỗ hổng bảo mật.
5. **Khôi phục (Recovery)**: Khôi phục cơ sở dữ liệu từ bản sao lưu sạch gần nhất, kiểm tra tính toàn vẹn hệ thống và mở lại dịch vụ.
6. **Rút kinh nghiệm (Lessons Learned)**: Lập biên bản sự cố, báo cáo Ban Kiểm soát và NHNN trong vòng 24 giờ theo quy định của Thông tư 09/2020/TT-NHNN.

### 6.2. Chính Sách Sao Lưu & Phục Hồi Thảm Họa (Disaster Recovery Plan)
* **Sao lưu Cơ sở dữ liệu**:
  * Sao lưu toàn phần (Full Backup): Thực hiện tự động lúc 01:00 sáng hàng ngày.
  * Sao lưu nhật ký giao dịch (WAL Archiving): Lưu trữ liên tục đảm bảo khả năng phục hồi đến từng thời điểm (Point-in-Time Recovery - PITR).
* **Mục tiêu Phục hồi**:
  * **RPO (Recovery Point Objective)** $\le 15\text{ phút}$.
  * **RTO (Recovery Time Objective)** $\le 2\text{ giờ}$.
* **Kiểm thử Phục hồi Thảm họa**: Định kỳ 06 tháng/lần, Khối CNTT phối hợp với Khối KTNB thực hiện diễn tập khôi phục hệ thống từ bản sao lưu sang môi trường DR dự phòng.
