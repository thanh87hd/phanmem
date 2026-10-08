# HƯỚNG DẪN KIỂM THỬ BẢO MẬT — KTNB 4.0

> Bộ kiểm thử bảo mật tự động phục vụ **nghiệm thu an ninh thông tin** trước khi triển khai.
> Vị trí: `scripts/security/` — Chạy: `npm run test:security`

---

## 1. Mục đích & Phạm vi

Bộ test được thiết kế để **chứng minh bằng bằng chứng khách quan** rằng hệ thống đáp ứng các yêu cầu bảo mật
bắt buộc, thay vì chỉ tuyên bố trên tài liệu. Kết quả sinh ra báo cáo có thể đính kèm hồ sơ nghiệm thu.

**Phạm vi kiểm thử:**

| Lớp | Nội dung | Phương pháp |
| :--- | :--- | :--- |
| Động (Black-box) | 638 route API đang chạy | Gửi HTTP request thực tế |
| Tĩnh (SAST) | 745+ tệp mã nguồn TS/JS | Phân tích cú pháp, không cần chạy |
| Chuỗi cung ứng | `package.json` của backend/frontend | `npm audit` (CVE đã biết) |

**Ngoài phạm vi (cần kiểm thử thủ công riêng):**
- Kiểm thử xâm nhập có kiểm soát (penetration test) bởi đơn vị độc lập.
- Đánh giá an ninh vật lý, an ninh nhân sự.
- Kiểm thử tải và chịu tải (xem `scripts/load-test/`).

---

## 2. Cách chạy

### 2.1. Lệnh cơ bản

```bash
# Quét mã nguồn tĩnh — KHÔNG cần backend đang chạy (nhanh, dùng được trong CI)
npm run test:security:sast

# Quét đầy đủ nhắm vào backend local (mặc định http://127.0.0.1:3001)
npm run test:security

# Quét nhắm vào máy chủ VPS/production
npm run test:security:vps
npm run test:security:prod
```

### 2.2. Kiểm thử có xác thực (khuyến nghị)

Nhiều phép kiểm chỉ chạy được khi có phiên đăng nhập. Cung cấp thông tin qua biến môi trường:

```bash
# PowerShell
$env:KTNB_ADMIN_USER="admin"
$env:KTNB_ADMIN_PASS="<mật khẩu>"
$env:KTNB_USER_USER="ktv01"       # tài khoản quyền thấp, dùng kiểm tra vượt quyền
$env:KTNB_USER_PASS="<mật khẩu>"
npm run test:security
```

> **Lưu ý:** Chỉ dùng tài khoản kiểm thử chuyên dụng trên môi trường staging.
> Không chạy bộ test này trên production với tài khoản thật của người dùng.

### 2.3. Tuỳ chọn nâng cao

```bash
node scripts/security/run-security-suite.js --help

# Chỉ chạy một số nhóm
node scripts/security/run-security-suite.js --only=A01,A03,A10

# Bỏ qua nhóm không mong muốn
node scripts/security/run-security-suite.js --skip=A06

# Đổi ngưỡng làm CI thất bại (mặc định: critical,high)
node scripts/security/run-security-suite.js --fail-on=critical

# Xuất JSON thuần cho pipeline
npm run test:security:json

# Chế độ an toàn: không chạy phép kiểm thay đổi dữ liệu (tự bật với vps/prod)
npm run test:security -- --safe

# Cho phép phép kiểm thay đổi dữ liệu (CHỈ trên môi trường test)
npm run test:security -- --unsafe

# Nhắm vào URL bất kỳ
node scripts/security/run-security-suite.js --url=https://staging.ktnb.vn
```

### 2.4. Chế độ an toàn (BẮT BUỘC đọc trước khi quét VPS)

Một số phép kiểm thử **thay đổi dữ liệu hoặc cấu hình máy chủ** (tạo tài khoản, tải tệp lên,
ghi đè cấu hình bảo mật, gọi endpoint `seed`/`reset`). Nếu chạy thẳng trên production, chúng
có thể gây thiệt hại thật.

Bộ test tự động bật **chế độ an toàn** khi nhắm vào `vps`/`prod`, hoặc khi URL không phải
localhost. Ở chế độ này, các phép kiểm thay đổi dữ liệu sẽ **không chạy** và được ghi nhận
minh bạch là `*-SKIP` trong báo cáo.

```bash
# Mặc định với vps/prod: chế độ an toàn tự bật
npm run test:security -- --target=vps

# Ép chế độ an toàn ngay cả trên local
npm run test:security -- --target=local --safe

# CHỈ dùng trên môi trường test — cho phép phép kiểm thay đổi dữ liệu
npm run test:security -- --target=local --unsafe
```

> ⚠️ **Không bao giờ dùng `--unsafe` trên production.**

**Lưu ý về khoá tài khoản:** hệ thống khoá tài khoản sau vài lần đăng nhập sai. Các phép kiểm
thử mật khẩu/dò tần suất vì vậy đã được thiết kế để dùng **tài khoản không tồn tại** làm mục
tiêu, tránh khoá tài khoản thật. Các phép kiểm còn lại có thể gây khoá đều bị bỏ qua ở chế độ
an toàn.

### 2.5. Tự kiểm chứng bộ test

Trước khi tin kết quả, hãy xác minh **chính bộ test** hoạt động đúng:

```bash
npm run test:security:selftest
```

Lệnh này chạy hai phép kiểm chứng (xem mục 5).

---

## 3. Các nhóm kiểm thử

| Mã | Nhóm | Số phép kiểm tiêu biểu |
| :--- | :--- | :--- |
| **A01** | Broken Access Control | Truy cập ẩn danh, IDOR, CORS, vượt quyền vai trò |
| **A02** | Cryptographic Failures | JWT `alg=none`, JWT secret yếu, cookie, lộ dotfile |
| **A03** | Injection | SQLi, NoSQLi, XSS, Command Injection, SSTI, Prototype Pollution |
| **A04** | Insecure Design | Mass assignment, độ mạnh mật khẩu, rate limit, giới hạn body |
| **A05** | Security Misconfiguration | Header bảo mật, lộ stack trace, Swagger công khai |
| **A06** | Vulnerable Components | `npm audit` — CVE đã biết, gói lỗi thời |
| **A07** | Authentication Failures | Token không hợp lệ/hết hạn, liệt kê tài khoản, mật khẩu mặc định |
| **A08** | Integrity Failures | Tải tệp nguy hiểm, XXE, path traversal, SRI |
| **A09** | Logging Failures | Lộ file log, audit trail, correlation ID |
| **A10** | SSRF | Truy cập metadata cloud, giao thức nguy hiểm, open redirect |
| **SAST** | Phân tích mã nguồn | SQL nối chuỗi, RCE, bí mật ghi cứng, TLS bị tắt |

### Ánh xạ với khung pháp lý

| Yêu cầu | Nhóm kiểm thử tương ứng |
| :--- | :--- |
| Thông tư 09/2020/TT-NHNN — an toàn hệ thống CNTT ngân hàng | A01–A10, SAST |
| Luật An ninh mạng 2018 | A01, A09 (nhật ký, truy vết) |
| Nghị định 13/2023/NĐ-CP — bảo vệ dữ liệu cá nhân | A02, A05 (lộ dữ liệu), A09 |
| ISO/IEC 27001 — A.12.6 (quản lý lỗ hổng kỹ thuật) | A06, SAST |
| OWASP Top 10:2021 | Toàn bộ A01–A10 |

---

## 4. Đọc kết quả

Mỗi lần chạy sinh ra 3 tệp trong `security-reports/<timestamp>/`:

| Tệp | Mục đích |
| :--- | :--- |
| `SECURITY_REPORT.md` | Báo cáo đọc được, để đính kèm hồ sơ nghiệm thu |
| `security-report.json` | Dữ liệu thô cho pipeline tự động |
| `security-report.sarif` | Định dạng SARIF 2.1.0 — hiển thị trên tab Security của GitLab/GitHub |

**Mã thoát (exit code):**

| Mã | Ý nghĩa |
| :--- | :--- |
| `0` | Đạt — không có phát hiện ở mức trong ngưỡng `--fail-on` |
| `1` | Thất bại — có phát hiện ở mức nghiêm trọng |
| `2` | Lỗi không xử lý khi chạy bộ test |

**Mức độ nghiêm trọng:**

- 🔴 **critical** — Khai thác được từ xa, không cần xác thực, hậu quả nghiêm trọng (SQLi, RCE, vượt xác thực).
- 🟠 **high** — Khai thác được nhưng cần điều kiện (đã xác thực, cần tương tác người dùng).
- 🟡 **medium** — Làm suy yếu phòng thủ, cần khắc phục theo kế hoạch.
- 🔵 **low** — Khuyến nghị cải thiện, rủi ro thấp.
- ⚪ **info** — Thông tin tham khảo (ví dụ: số gói lỗi thời).

---

## 5. Độ tin cậy của bộ test (đã tự kiểm chứng)

Một bộ test bảo mật chỉ có giá trị nếu bản thân nó được kiểm chứng. Bộ test này được xác minh
theo **hai chiều** bằng hai ứng dụng giả lập trong `scripts/security/test/fixtures/`:

| Phép kiểm chứng | Ứng dụng mục tiêu | Kết quả yêu cầu | Kết quả thực tế |
| :--- | :--- | :--- | :--- |
| **Khả năng phát hiện** (`verify-detection.js`) | `vulnerable-app.js` — cố ý chứa 15 lỗ hổng đã cắm cờ | Phát hiện **15/15**, không bỏ sót | ✅ 15/15, 0 bỏ sót |
| **Không báo động giả** (`verify-no-false-positives.js`) | `secure-app.js` — đã cấu hình đúng chuẩn | **0** phát hiện mức critical/high | ✅ 0 phát hiện |

Điều này chứng minh bộ test **thực sự phát hiện** lỗ hổng (không phải luôn báo "đạt")
và **không báo động giả** trên hệ thống đã an toàn (không phải luôn báo "thất bại").

> ⚠️ Hai ứng dụng giả lập chứa lỗ hổng có chủ đích, **chỉ dùng cho mục đích tự kiểm chứng**.
> Tuyệt đối không triển khai lên bất kỳ môi trường nào.

---

## 6. Quy trình vá lỗi

1. **Phân loại** — Đọc `SECURITY_REPORT.md`, ưu tiên theo mức độ nghiêm trọng.
2. **Xác minh** — Tái hiện phát hiện bằng lệnh trong trường `URL` của báo cáo.
3. **Đánh giá** — Loại bỏ dương tính giả (ghi lại lý do vào hồ sơ).
4. **Khắc phục** — Làm theo hướng dẫn ở trường **Khắc phục** của từng phát hiện.
5. **Tái kiểm thử** — Chạy lại bộ test, xác nhận phát hiện đã biến mất.
6. **Đóng** — Lưu báo cáo trước/sau vào hồ sơ nghiệm thu an ninh.

**Thời hạn khắc phục đề xuất:**

| Mức độ | Thời hạn |
| :--- | :--- |
| critical | 24 giờ |
| high | 07 ngày |
| medium | 30 ngày |
| low | 90 ngày |

---

## 7. Tích hợp CI/CD

Job `security-scan` trong `.gitlab-ci.yml` chạy ở giai đoạn `test`:

- Nhánh `develop`/`main`: chạy SAST + `npm audit`, **chặn merge** nếu có mức critical/high.
- Báo cáo SARIF được đẩy lên tab Security của GitLab.
- Báo cáo được lưu trữ 30 ngày làm bằng chứng.

Chạy tự kiểm chứng trong CI đảm bảo bộ test không bị thoái hoá theo thời gian.

---

## 8. Bảo trì bộ test

- **Khi thêm route mới:** Bộ test tự động đọc `backend/src/**/*.controller.ts` — không cần cập nhật thủ công.
- **Khi thêm nhóm kiểm thử:** Tạo tệp trong `scripts/security/checks/`, đăng ký tại `checks/index.js`.
- **Khi quy tắc SAST báo dương tính giả:** Hiệu chỉnh quy tắc trong `checks/sast.js`; với mã nguồn
  không triển khai (script build/dev), mức độ được tự động hạ một bậc qua hàm `calibrate()`.
- **Định kỳ:** Cập nhật bộ payload (`lib/payloads.js`) theo OWASP Testing Guide mới nhất.

---

*Tài liệu liên quan: [INFORMATION_SECURITY_AND_COMPLIANCE.md](./INFORMATION_SECURITY_AND_COMPLIANCE.md)*
