# HỆ THỐNG MẪU BIỂU HỒ SƠ KIỂM TOÁN NỘI BỘ NGÂN HÀNG CHUẨN HÓA & THƯ VIỆN RCM CHUYÊN NGÀNH
**Mã tài liệu:** `KTNB-METHODOLOGY-02`  
**Phiên bản:** 4.0 (2026 Edition)  
**Tiêu chuẩn áp dụng:** IIA GIAS 2024, Thông tư 13/2018/TT-NHNN, COSO Internal Control 2013, ISO 19011  
**Phạm vi áp dụng:** Toàn hệ thống Khối Kiểm toán Nội bộ Ngân hàng Thương mại

---

## MỤC LỤC TỔNG QUAN

1. [DANH MỤC HỆ THỐNG 16 MẪU BIỂU KIỂM TOÁN NỘI BỘ CHUẨN HÓA](#1-danh-mục-hệ-thống-16-mẫu-biểu-kiểm-toán-nội-bộ-chuẩn-hóa)
2. [CHI TIẾT MẪU BIỂU GIAI ĐOẠN 1: LẬP KẾ HOẠCH NĂM & ĐỊNH BIÊN (MB-01 -> MB-03)](#2-chi-tiết-mẫu-biểu-giai-đoạn-1-lập-kế-hoạch-năm--định-biên-mb-01---mb-03)
3. [CHI TIẾT MẪU BIỂU GIAI ĐOẠN 2: CHUẨN BỊ & LẬP KẾ HOẠCH CUỘC KIỂM TOÁN (MB-04 -> MB-06)](#3-chi-tiết-mẫu-biểu-giai-đoạn-2-chuẩn-bị--lập-kế-hoạch-cuộc-kiểm-toán-mb-04---mb-06)
4. [CHI TIẾT MẪU BIỂU GIAI ĐOẠN 3: THỰC ĐỊA, THỬ NGHIỆM & SOÁT XÉT (MB-07 -> MB-10)](#4-chi-tiết-mẫu-biểu-giai-đoạn-3-thực-địa-thử-nghiệm--soát-xét-mb-07---mb-10)
5. [CHI TIẾT MẪU BIỂU GIAI ĐOẠN 4: BÁO CÁO, KẾT THÚC & XẾP HẠNG KSNB (MB-11 -> MB-14)](#5-chi-tiết-mẫu-biểu-giai-đoạn-4-báo-cáo-kết-thúc--xếp-hạng-ksnb-mb-11---mb-14)
6. [CHI TIẾT MẪU BIỂU GIAI ĐOẠN 5: THEO DÕI KHẮC PHỤC & PHÚC TRA (MB-15 -> MB-16)](#6-chi-tiết-mẫu-biểu-giai-đoạn-5-theo-dõi-khắc-phục--phúc-tra-mb-15---mb-16)
7. [THƯ VIỆN MA TRẬN RỦI RO VÀ KIỂM SOÁT (RCM) CHUYÊN SÂU NGÂN HÀNG THƯƠNG MẠI](#7-thư-viện-ma-trận-rủi-ro-và-kiểm-soát-rcm-chuyên-sâu-ngân-hàng-thương-mại)
   - 7.1. RCM Nghiệp vụ Cấp tín dụng & Quản lý TSBĐ
   - 7.2. RCM Nghiệp vụ Nguồn vốn & Kinh doanh thị trường vốn (Treasury)
   - 7.3. RCM Nghiệp vụ Quản lý Kho quỹ & Tiếp quỹ Tiền mặt
   - 7.4. RCM Nghiệp vụ An toàn Công nghệ Thông tin & Ngân hàng số
8. [HƯỚNG DẪN ĐÓNG VÀ LƯU TRỮ HỒ SƠ KIỂM TOÁN ĐIỆN TỬ (ELECTRONIC AUDIT FILE)](#8-hướng-dẫn-đóng-và-lưu-trữ-hồ-sơ-kiểm-toán-điện-tử-electronic-audit-file)

---

# 1. DANH MỤC HỆ THỐNG 16 MẪU BIỂU KIỂM TOÁN NỘI BỘ CHUẨN HÓA

Toàn bộ hồ sơ kiểm toán trong Hệ thống Phần mềm KTNB 4.0 được số hóa theo mã định danh duy nhất từ `MB-01` đến `MB-16`, tích hợp sẵn luồng ký duyệt số điện tử (Digital Sign-off) và thẩm quyền phân cấp:

| Mã Biểu | Tên Mẫu Biểu Hồ Sơ Kiểm Toán | Giai Đoạn Áp Dụng | Định Dạng Xuất / Lưu Trữ | Người Lập / Ký Duyệt |
| :--- | :--- | :--- | :--- | :--- |
| **MB-01** | Bảng Khảo sát & Đánh giá Rủi ro Đơn vị (Risk Assessment Questionnaire) | Lập Kế hoạch năm | Form Web / Excel / PDF | KTV Phân tích / Trưởng phòng NV |
| **MB-02** | Ma trận Đánh giá Rủi ro & Bản đồ Rủi ro (Risk Heatmap Matrix) | Lập Kế hoạch năm | Dynamic Chart / Excel | Tổ trưởng Kế hoạch / CAE duyệt |
| **MB-03** | Kế hoạch Kiểm toán Năm & Phân bổ Nguồn lực (Annual Audit Plan - AAP) | Lập Kế hoạch năm | Word / PDF Trình BKS | CAE lập / Ban Kiểm soát phê chuẩn |
| **MB-04** | Quyết định Kiểm toán & Thông báo Kiểm toán (Audit Charter & Notice) | Chuẩn bị cuộc KT | Word / PDF Ký số | CAE ký duyệt / Gửi Đơn vị nhận KT |
| **MB-05** | Kế hoạch Chi tiết Cuộc Kiểm toán (Detailed Audit Engagement Plan) | Chuẩn bị cuộc KT | Word / Form Web | Trưởng đoàn KT / Lãnh đạo Khối KTNB |
| **MB-06** | Ma trận Rủi ro & Kiểm soát Cuộc kiểm toán (Engagement RCM) | Chuẩn bị cuộc KT | Excel / Form Lưới dữ liệu | KTV phụ trách mảng / Trưởng đoàn |
| **MB-07** | Giấy làm việc Kiểm toán (Audit Working Paper - WP / Credit Grid) | Thực địa & Thử nghiệm | Excel / Web Table Grid | Kiểm toán viên viên / Trưởng đoàn soát xét |
| **MB-08** | Biên bản Lấy mẫu Kiểm toán & Tính cỡ mẫu MUS/PPS | Thực địa & Thử nghiệm | Excel Modeling / Web Tool | KTV thực hiện / Chuyên viên Data |
| **MB-09** | Phiếu Phỏng vấn & Biên bản Xác minh Thực địa | Thực địa & Thử nghiệm | Word / PDF (Có chữ ký 2 bên)| KTV & Cán bộ Đơn vị được phỏng vấn |
| **MB-10** | Phiếu Soát xét của Lãnh đạo Đoàn (Audit Review Notes) | Soát xét Chất lượng | Web Log / PDF ký số | Trưởng đoàn, QA / KTV giải trình |
| **MB-11** | Phiếu Ghi nhận Phát hiện Kiểm toán Chuẩn 5C (Audit Finding Sheet) | Báo cáo & Thống nhất | Form Web / Word | KTV lập / Đơn vị phản hồi giải trình |
| **MB-12** | Biên bản Họp Kết thúc Thực địa (Exit Meeting Minutes) | Kết thúc Thực địa | Word / PDF ký tươi 2 bên | Trưởng đoàn KT & Giám đốc Đơn vị |
| **MB-13** | Báo cáo Kiểm toán Nội bộ Chính thức (Formal Internal Audit Report) | Báo cáo Chính thức | Word / Báo cáo màu PDF | Trưởng đoàn soạn / CAE & BKS ký |
| **MB-14** | Bảng Điểm & Xếp hạng Hệ thống KSNB Đơn vị (IC Rating Card) | Báo cáo Chính thức | Excel / Dashboard Web | Trưởng đoàn lập / CAE chuẩn y |
| **MB-15** | Kế hoạch Hành động Khắc phục Kiến nghị (Remediation Action Plan) | Theo dõi Khắc phục | Form Web / Excel tương tác | Đơn vị cam kết / KTNB phê duyệt |
| **MB-16** | Biên bản Phúc tra & Đóng Kiến nghị Kiểm toán (Follow-up Closure WP) | Phúc tra Đóng kiến nghị| Form Web / PDF Ký duyệt | KTV Theo dõi / Trưởng phòng KTNB |

---

# 2. CHI TIẾT MẪU BIỂU GIAI ĐOẠN 1: LẬP KẾ HOẠCH NĂM & ĐỊNH BIÊN (MB-01 -> MB-03)

## MB-01: BẢNG KHẢO SÁT & ĐÁNH GIÁ RỦI RO ĐƠN VỊ (RISK ASSESSMENT QUESTIONNAIRE)
*Áp dụng: Thu thập thông tin định kỳ Quý 3 hàng năm từ 100% Chi nhánh, Khối nghiệp vụ, Công ty con.*

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             MẪU BIỂU: MB-01
KHỐI KIỂM TOÁN NỘI BỘ                                         Ban hành theo QĐ số: .../QĐ-BKS
                                                              Ngày áp dụng: 01/01/2026

             PHIẾU KHẢO SÁT THÔNG TIN ĐÁNH GIÁ RỦI RO PHỤC VỤ KẾ HOẠCH KIỂM TOÁN
                                        NĂM TÀI CHÍNH: 202...

I. THÔNG TIN CHUNG ĐƠN VỊ:
1. Tên Đơn vị/Chi nhánh: ........................................... Mã đơn vị (Core): ...........
2. Người đại diện/Giám đốc: ....................................... Điện thoại: ....................
3. Phân cấp Chi nhánh: [ ] Hạng 1    [ ] Hạng 2    [ ] Hạng 3    [ ] Khối Hội sở chính
4. Thời điểm kiểm toán nội bộ gần nhất: .../.../202... (Xếp hạng KSNB kỳ trước: [A/B/C/D])

II. CÁC CHỈ SỐ QUY MÔ & TÀI CHÍNH TẠI THỜI ĐIỂM ĐÁNH GIÁ:
+ Tổng tài sản/Dư nợ tín dụng: ................. tỷ VNĐ (Tăng trưởng so với đầu năm: .....%)
+ Huy động vốn: ................................. tỷ VNĐ (Tỷ lệ CASA: .....%)
+ Tỷ lệ nợ xấu (Nợ nhóm 3-5 theo TT 11): ........% (Nợ cần chú ý nhóm 2: .....%)
+ Dư nợ cơ cấu lại thời hạn trả nợ/chính sách đặc thù: ........... tỷ VNĐ
+ Thu nhập thuần từ dịch vụ (NFI): .............. tỷ VNĐ
+ Lợi nhuận trước thuế lũy kế: ................. tỷ VNĐ (Đạt .....% kế hoạch năm)

III. ĐÁNH GIÁ THAY ĐỔI MÔI TRƯỜNG VÀ HOẠT ĐỘNG KIỂM SOÁT (Self-Assessment):
(Đơn vị tự đánh giá theo thang điểm từ 1 đến 5: 1 - Rất thấp, 2 - Thấp, 3 - Trung bình, 4 - Cao, 5 - Rất cao)
+ Biến động nhân sự chủ chốt (Ban Giám đốc, Trưởng phòng Tín dụng, Kế toán trưởng): [ ]
+ Số lượng nhân sự tuyển mới dưới 1 năm kinh nghiệm chiếm tỷ trọng: [ ]
+ Số lượng quy trình nội bộ mới ban hành hoặc thay đổi lớn trong năm: [ ]
+ Triển khai phân hệ phần mềm/hệ thống CNTT mới: [ ]
+ Số vụ việc sai phạm/kỷ luật cán bộ hoặc rủi ro tác nghiệp ghi nhận: [ ]
+ Ý kiến/kết luận của Thanh tra NHNN, Kiểm toán độc lập trong kỳ: [ ]

IV. TÀI LIỆU MINH CHỨNG GỬI KÈM:
1. Bảng cân đối tài khoản phát sinh (Bảng F01) 3 kỳ gần nhất.
2. Báo cáo phân loại nợ và trích lập dự phòng rủi ro (Mẫu biểu 01/NHNN).
3. Biên bản bàn giao công việc của các nhân sự quản lý chuyển công tác trong năm.

                                                    Ngày ..... tháng ..... năm 202...
          NGƯỜI LẬP BIỂU                                     GIÁM ĐỐC ĐƠN VỊ
         (Ký, ghi rõ họ tên)                              (Ký, ghi rõ họ tên, đóng dấu)
```

---

## MB-02: MA TRẬN ĐÁNH GIÁ RỦI RO & BẢN ĐỒ RỦI RO (RISK HEATMAP MATRIX)
*Đặc tả cấu trúc bảng tính toán tự động trên Hệ thống Phần mềm KTNB 4.0:*

### Cấu trúc bảng tính điểm rủi ro:
| Mã Đơn vị | Tên Đơn Vị / Nghiệp Vụ | Điểm Rủi ro Tiềm tàng (IR: 1-5) | Trọng số Quy mô Tài chính | Điểm Kiểm soát Nội bộ (CE: 1-5) | Điểm Rủi ro Còn lại (RR = IR x CE) | Mức độ Rủi ro (Heatmap Level) | Tần suất Kiểm toán Đề xuất |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **CN-001** | Chi nhánh Chợ Lớn | 4.8 | 1.5 | 4.2 | **20.16** | 🔴 Cực Kỳ Cao | Hàng năm (Annual) |
| **CN-045** | Chi nhánh Ba Đình | 3.5 | 1.2 | 2.5 | **8.75** | 🟡 Trung bình | 2 năm / 1 lần |
| **HS-003** | Phòng Phê duyệt Tín dụng | 4.5 | 1.8 | 3.8 | **17.10** | 🔴 Cao | Hàng năm (Annual) |
| **IT-002** | Hệ thống Core Banking & DB | 5.0 | 2.0 | 3.0 | **15.00** | 🔴 Cao | 6 tháng / 1 lần |
| **CN-102** | Phòng Giao dịch An Dương | 2.0 | 0.8 | 1.5 | **3.00** | 🟢 Thấp | 3 năm / 1 lần |

---

## MB-03: KẾ HOẠCH KIỂM TOÁN NĂM & PHÂN BỔ NGUỒN LỰC (ANNUAL AUDIT PLAN - AAP)
*Văn bản chính thức trình Ban Kiểm soát và Hội đồng Quản trị phê duyệt trước ngày 15/11 hàng năm.*

### Cấu trúc tài liệu AAP:
1. **Căn cứ pháp lý & Nguyên tắc xây dựng:**
   - Điều 40-44 Thông tư 13/2018/TT-NHNN về Kế hoạch kiểm toán nội bộ hàng năm.
   - Chuẩn mực IIA Standard 2010 (Planning) & IIA GIAS 2024.
   - Chiến lược kinh doanh và khẩu vị rủi ro của Ngân hàng năm kế hoạch.
2. **Tổng kết năng lực & Phân bổ Ngày công (Audit Resource Allocation Model):**
   $$\text{Tổng ngày công khả dụng} = N_{\text{KTV}} \times 208 \text{ ngày công}$$
   - Bảng phân bổ chi tiết: Kiểm toán bảo đảm (70%), Tư vấn & Tham gia dự án lớn (10%), Đào tạo/Nghỉ phép (12%), Quỹ dự phòng kiểm toán đột xuất/Thanh tra NHNN (8%).
3. **Danh mục Cuộc kiểm toán năm (Audit Universe Priority List):**
   - Phân loại: 35 Chi nhánh loại 1, 12 Đơn vị Khối Hội sở, 03 Hệ thống CNTT trọng yếu, 02 Công ty con (Chứng khoán, Quản lý quỹ).
4. **Ngân sách hoạt động & Công cụ CAATs/Phần mềm:**
   - Dự toán chi phí công tác phí thực địa, bản quyền công cụ phân tích dữ liệu, chi phí đào tạo chứng chỉ CIA/CISA.

---

# 3. CHI TIẾT MẪU BIỂU GIAI ĐOẠN 2: CHUẨN BỊ & LẬP KẾ HOẠCH CUỘC KIỂM TOÁN (MB-04 -> MB-06)

## MB-04: QUYẾT ĐỊNH KIỂM TOÁN & THÔNG BÁO KIỂM TOÁN (AUDIT CHARTER & NOTICE)

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          BAN KIỂM SOÁT                                          Độc lập - Tự do - Hạnh phúc
Số: ....../202.../QĐ-BKS-KTNB                                 -----------------------------------
                                                              Hà Nội, ngày ..... tháng ..... năm 202...

                                              QUYẾT ĐỊNH
                         Về việc tiến hành kiểm toán nội bộ hoạt động toàn diện
                                 tại Ngân hàng TMCP ... - Chi nhánh ...

                                    TRƯỞNG BAN KIỂM SOÁT
- Căn cứ Điều lệ tổ chức và hoạt động của Ngân hàng TMCP ...;
- Căn cứ Quy chế Kiểm toán nội bộ ban hành theo Quyết định số .../QĐ-HĐQT;
- Căn cứ Kế hoạch kiểm toán năm 202... đã được Hội đồng Quản trị/Ban Kiểm soát thông qua;
- Xét đề nghị của Giám đốc Khối Kiểm toán Nội bộ,

                                              QUYẾT ĐỊNH:
Điều 1. Tiến hành kiểm toán hoạt động toàn diện tại:
        Tên đơn vị: Ngân hàng TMCP ... - Chi nhánh .......................................
        Địa chỉ: .........................................................................
Điều 2. Thời kỳ và thời gian kiểm toán:
        1. Thời kỳ kiểm toán: Từ ngày 01/01/202... đến ngày 31/12/202... (và các thời kỳ trước/sau
           có liên quan).
        2. Thời gian kiểm toán thực địa: ... ngày làm việc (Từ ngày .../.../202... đến .../.../202...).
Điều 3. Nội dung và phạm vi kiểm toán trọng yếu:
        - Hoạt động cấp tín dụng và quản lý nợ (theo Thông tư 11/2021/TT-NHNN, Thông tư 39/2016/TT-NHNN).
        - Công tác kế toán, quản lý tài chính và giao dịch ngân quỹ (Thông tư 01/2014/TT-NHNN).
        - Quản lý vận hành hệ thống CNTT và bảo mật dữ liệu khách hàng (Thông tư 09/2020/TT-NHNN).
        - Công tác phòng, chống rửa tiền và tuân thủ các quy định giám sát.
Điều 4. Thành lập Đoàn kiểm toán nội bộ gồm các ông/bà có tên sau:
        1. Ông/Bà: ............................. Chức vụ: ................. - Trưởng đoàn
        2. Ông/Bà: ............................. Chức vụ: ................. - Thành viên (Mảng Tín dụng)
        3. Ông/Bà: ............................. Chức vụ: ................. - Thành viên (Mảng Kế toán/Kho quỹ)
        4. Ông/Bà: ............................. Chức vụ: ................. - Thành viên (Mảng CNTT & Dữ liệu)
Điều 5. Quyền hạn và trách nhiệm:
        - Đoàn kiểm toán được quyền tiếp cận không hạn chế đối với toàn bộ hồ sơ, chứng từ, dữ liệu điện tử,
          kho tiền và cán bộ nhân viên liên quan đến nội dung kiểm toán.
        - Giám đốc Chi nhánh chịu trách nhiệm bố trí phòng làm việc độc lập, cung cấp đầy đủ tài liệu đúng
          thời hạn và phối hợp chặt chẽ với Đoàn kiểm toán.
Điều 6. Quyết định có hiệu lực thi hành kể từ ngày ký.

Nơi nhận:                                                      TM. BAN KIỂM SOÁT
- Chi nhánh được kiểm toán (để thực hiện);                     TRƯỞNG BAN KIỂM SOÁT
- HĐQT & Tổng Giám đốc (để báo cáo);                               (Đã ký)
- Đoàn kiểm toán (để thi hành);
- Lưu: VT, KTNB.
```

---

## MB-05: KẾ HOẠCH CHI TIẾT CUỘC KIỂM TOÁN (ENGAGEMENT PLAN)
*Văn bản quy định chi tiết phân công công việc, thời gian biểu và trọng tâm thử nghiệm:*

```markdown
1. MỤC TIÊU CUỘC KIỂM TOÁN:
   - Đánh giá tính đầy đủ, hiệu lực và hiệu quả của hệ thống KSNB tại Chi nhánh.
   - Xác minh tính tuân thủ pháp luật, quy chế nội bộ và nhận diện các rủi ro gian lận tiềm ẩn.
   - Đề xuất các khuyến nghị kiểm toán nhằm cải thiện quy trình nghiệp vụ và ngăn ngừa thất thoát.

2. PHÂN TÍCH RỦI RO BAN ĐẦU & XÁC ĐỊNH MỨC TRỌNG YẾU (ENGAGEMENT MATERIALITY):
   - Mức trọng yếu sai sót có thể chấp nhận được (Tolerable Misstatement): 500,000,000 VNĐ.
   - Ngưỡng ghi nhận phát hiện kiểm toán vi phạm thủ tục: 100% hồ sơ sai thẩm quyền phê duyệt.
   - Nhóm rủi ro trọng tâm (High-Focus Areas):
     * Các khoản vay doanh nghiệp lớn vượt hạn mức phê duyệt Chi nhánh ủy quyền.
     * Các khoản vay tiêu dùng thế chấp bằng bất động sản định giá tăng đột biến >30% trong 6 tháng.
     * Kiểm kê quỹ tiền mặt đột xuất vào đầu giờ sáng và cuối ngày giao dịch.

3. LỊCH TRÌNH VÀ PHÂN CÔNG THỰC ĐỊA:
   + Tuần 1 (Ngày 1-5): Thu thập tài liệu, phân tích dữ liệu CAATs, kiểm kê quỹ đột xuất, Walkthrough Test.
   + Tuần 2 (Ngày 6-10): Thử nghiệm kiểm soát (ToE) và Thử nghiệm cơ bản (ToD) hồ sơ tín dụng mẫu.
   + Tuần 3 (Ngày 11-15): Phỏng vấn, lập biên bản xác minh, gửi Phiếu phát hiện kiểm toán (MB-11).
   + Ngày 16: Họp kết thúc thực địa (Exit Meeting), ký kết Biên bản MB-12.
```

---

## MB-06: MA TRẬN RỦI RO & KIỂM SOÁT CUỘC KIỂM TOÁN (ENGAGEMENT RCM)
*Công cụ trung tâm liên kết Rủi ro - Chốt kiểm soát - Thủ tục kiểm toán chi tiết:*

```markdown
BẢNG MA TRẬN RCM CUỘC KIỂM TOÁN TÍN DỤNG (MẪU THIẾT KẾ):
```
| Ref | Quy Trình / Nghiệp Vụ | Mục Tiêu Kiểm Soát | Rủi Ro Tiềm Tàng | Chốt Kiểm Soát Hiện Hữu | Loại KS (P/D) | Bản Chất (A/M) | Tần Suất | Thủ Tục Thử Nghiệm Kiểm Soát (ToE) | Thủ Tục Thử Nghiệm Cơ Bản (ToD) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **TD-01** | Tiếp nhận & Thẩm định vay | Thẩm định đúng thực tế, hồ sơ khách hàng hợp lệ | Khách hàng lập hồ sơ khống, BCTC gian lận, phương án vay ảo | Cán bộ QHKH và Cán bộ Thẩm định độc lập đi thực địa 100% | Prevention | Manual | Mỗi khoản vay | Kiểm tra Biên bản thẩm định thực tế có chữ ký xác nhận của 02 cán bộ | Thu thập hóa đơn VAT, hợp đồng kinh tế đầu vào, đối chiếu sao kê ngân hàng đối tác |
| **TD-02** | Định giá Tài sản bảo đảm | Định giá sát thị trường, tuân thủ tỷ lệ LTV quy định | Định giá nâng khống giá trị TSBĐ để cấp dư nợ vượt mức | TSBĐ > 5 tỷ VNĐ bắt buộc thẩm định qua Công ty định giá độc lập | Prevention | Manual | Định kỳ/Mỗi lần | Kiểm tra chứng thư thẩm định giá có hiệu lực, so sánh danh sách Công ty định giá đủ chuẩn | Khảo sát độc lập giá thị trường bất động sản lân cận, đối chiếu thông tin phòng công chứng |
| **TD-03** | Phê duyệt cấp tín dụng | Phê duyệt đúng thẩm quyền phân cấp | Vượt thẩm quyền, chia nhỏ hợp đồng để lách hạn mức phê duyệt | Hệ thống BPM/LOS khóa cứng hạn mức phê duyệt tự động theo User Role | Prevention | Automated | Mỗi khoản vay | Thử nghiệm User Profile trên LOS xem có phê duyệt được khoản vay vượt hạn mức | Quét toàn bộ CSDL tìm các khoản vay của cùng một khách hàng giải ngân cách nhau < 48h |

---

# 4. CHI TIẾT MẪU BIỂU GIAI ĐOẠN 3: THỰC ĐỊA, THỬ NGHIỆM & SOÁT XÉT (MB-07 -> MB-10)

## MB-07: GIẤY LÀM VIỆC KIỂM TOÁN TÍN DỤNG (CREDIT AUDIT WORKING PAPER - WP GRID)
*Được số hóa dưới dạng bảng lưới dữ liệu lớn (Credit Grid) với hơn 20 trường kiểm tra tiêu chuẩn:*

```markdown
NGÂN HÀNG TMCP ... - KHỐI KIỂM TOÁN NỘI BỘ                     MẪU BIỂU: MB-07
Đoàn Kiểm toán: Chi nhánh ...................                  Mã WP: WP-TD-01/05
Nghiệp vụ: Kiểm toán Chi tiết Khoản vay Khách hàng Doanh nghiệp

THÔNG TIN GIẤY LÀM VIỆC:
- Người lập (Prepared by): Nguyễn Văn A - KTV            Ngày lập: 12/03/2026
- Người soát xét (Reviewed by): Trần Thị B - Trưởng đoàn Ngày soát xét: 15/03/2026
- Phương pháp chọn mẫu: Monetary Unit Sampling (MUS) với Ngưỡng trọng yếu 2,000,000,000 VNĐ.

DANH MỤC THỬ NGHIỆM CHI TIẾT (CREDIT TESTING GRID):
```
| STT | Mã Hợp Đồng Vay | Tên Khách Hàng | Dư Nợ (VNĐ) | Nhóm Nợ Core | Mục Đích Vay | Thẩm Quyền Phê Duyệt | Hợp Đồng Thế Chấp & ĐKBD | Đăng Ký Giao Dịch ĐB | Tỷ Lệ LTV Thực Tế | Giám Sát Sau Vay Đầy Đủ? | Có Dấu Hiệu Đảo Nợ? | Kết Quả Kiểm Toán (Đạt/Không Đạt) | Ghi Chú Tham Chiếu |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `HD-2025-089` | CTCP Thép Việt Á | 18,500,000,000 | 1 | Bổ sung VLĐ | HĐTD Chi nhánh | Hợp lệ | Có (Hạn 24h) | 68% | Đạt định kỳ | Không | **ĐẠT** | WP-TD-REF01 |
| 2 | `HD-2025-112` | Cty TNHH Bất Động Sản An Phát | 24,000,000,000 | 1 | Thanh toán tiền đất | Ủy ban Tín dụng HS | Chưa công chứng | **CHƯA ĐĂNG KÝ** | **88%** | **Quá hạn 90 ngày** | **CÓ (48h)** | **KHÔNG ĐẠT** | **Finding-01** (MB-11) |
| 3 | `HD-2025-304` | Doanh nghiệp Tư nhân Minh Tâm | 4,200,000,000 | 2 | Mua xe chuyên dùng | GĐ Chi nhánh | Hợp lệ | Có | 55% | Đạt | Không | **ĐẠT** | WP-TD-REF02 |

```markdown
KẾT LUẬN VÀ Ý KIẾN CỦA KIỂM TOÁN VIÊN:
1. Mẫu kiểm tra gồm 45 hồ sơ với tổng dư nợ 312 tỷ VNĐ (chiếm 68% dư nợ KHDN của Chi nhánh).
2. Phát hiện 01 hồ sơ (Cty TNHH BĐS An Phát - Dư nợ 24 tỷ) vi phạm nghiêm trọng:
   - TSBĐ chưa hoàn tất công chứng thế chấp và đăng ký giao dịch bảo đảm nhưng đã giải ngân vốn.
   - Có dấu hiệu sử dụng vốn sai mục đích và đảo nợ cho khoản vay đến hạn ngày 14/10/2025.
   -> Lập Phiếu phát hiện kiểm toán MB-11 chuyển Trưởng đoàn xem xét.
```

---

## MB-08: BẢNG TÍNH TOÁN CỠ MẪU VÀ KẾT QUẢ LẤY MẪU (SAMPLING WORKPAPER)
*Áp dụng công thức Monetary Unit Sampling (MUS) chuẩn hóa:*

```markdown
1. CÁC THAM SỐ TOÁN HỌC ĐẦU VÀO:
   - Tổng giá trị tổng thể (Book Value - BV): 1,250,000,000,000 VNĐ (Một nghìn hai trăm năm mươi tỷ đồng).
   - Tổng số phần tử tổng thể ($N$): 3,420 món vay.
   - Mức tin cậy (Confidence Level - CL): 95% ($\implies$ Hệ số độ tin cậy $R = 3.0$).
   - Mức trọng yếu có thể chấp nhận (Tolerable Misstatement - $TM$): 25,000,000,000 VNĐ (2% BV).
   - Sai sót dự kiến (Expected Misstatement - $EM$): 2,500,000,000 VNĐ (0.2% BV).

2. KẾT QUẢ TÍNH TOÁN:
   - Khoảng cách mẫu (Sampling Interval - $J$):
     $$J = \frac{TM}{R} = \frac{25,000,000,000}{3.0} = 8,333,333,333 \text{ VNĐ}$$
   - Cỡ mẫu toán học ($n$):
     $$n = \frac{BV \times R}{TM - (EM \times 1.6)} = \frac{1,250,000,000,000 \times 3.0}{25,000,000,000 - 4,000,000,000} \approx 178 \text{ khoản mục}$$
   - Số ngẫu nhiên bắt đầu (Random Seed - $R_0$): 4,120,500,000 VNĐ.

3. KẾT QUẢ TRÍCH XUẤT MẪU (CAATs Log):
   - Mẫu bao gồm 42 khoản vay có giá trị cá biệt $> J$ (Kiểm tra 100%).
   - Mẫu ngẫu nhiên theo bước nhảy tiền tệ gồm 136 khoản mục.
   - Toàn bộ log trích xuất từ CSDL SQL CoreBanking được lưu trữ an toàn tại thư mục chứng từ.
```

---

## MB-09: PHIẾU PHỎNG VẤN & BIÊN BẢN XÁC MINH THỰC ĐỊA

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             MẪU BIỂU: MB-09
ĐOÀN KIỂM TOÁN NỘI BỘ TẠI CHI NHÁNH ..............

                                  BIÊN BẢN PHỎNG VẤN VÀ XÁC MINH THỰC ĐỊA
                               V/v: Quy trình phê duyệt giải ngân và kiểm tra sau vay
                                     đối với Hợp đồng số: HD-2025-112

Hôm nay, vào hồi ..... giờ ..... ngày ..... tháng ..... năm 202..., tại Trụ sở Chi nhánh ...............
Chúng tôi gồm có:
I. ĐẠI DIỆN ĐOÀN KIỂM TOÁN NỘI BỘ:
   1. Ông/Bà: ....................................... - Chức danh: Trưởng đoàn
   2. Ông/Bà: ....................................... - Chức danh: Thành viên Đoàn
II. ĐẠI DIỆN ĐƠN VỊ ĐƯỢC KIỂM TOÁN:
   1. Ông/Bà: ....................................... - Chức vụ: Phó Giám đốc phụ trách KHDN
   2. Ông/Bà: ....................................... - Chức vụ: Cán bộ QHKH thực hiện món vay

NỘI DUNG PHỎNG VẤN VÀ XÁC MINH:
1. Câu hỏi của KTNB: "Căn cứ vào đâu Cán bộ QHKH đề xuất giải ngân ngày 15/10/2025 khi tài sản thế
   chấp là Giấy chứng nhận QSDĐ số AB-123456 chưa có xác nhận đăng ký thế chấp của Văn phòng ĐKĐĐ?"
   - Trả lời của Cán bộ QHKH: ....................................................................
   ...............................................................................................
2. Câu hỏi của KTNB: "Ý kiến phê duyệt chấp thuận giải ngân kèm điều kiện tiên quyết của Giám đốc Chi
   nhánh quy định thời hạn bổ sung đăng ký trong vòng 03 ngày làm việc. Đến nay đã quá 90 ngày, Chi nhánh
   đã có văn bản đôn đốc khách hàng chưa?"
   - Trả lời của Phó Giám đốc: ...................................................................
   ...............................................................................................

KẾT LUẬN CỦA BIÊN BẢN:
Hai bên thống nhất các nội dung giải trình trên là trung thực và phản ánh đúng diễn biến thực tế. Biên bản
được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.

            ĐẠI DIỆN ĐƠN VỊ                                           ĐOÀN KIỂM TOÁN NỘI BỘ
         (Ký và ghi rõ họ tên)                                        (Ký và ghi rõ họ tên)
```

---

## MB-10: PHIẾU SOÁT XÉT CỦA LÃNH ĐẠO ĐOÀN (AUDIT REVIEW NOTES)
*Quy trình kiểm soát chất lượng QA theo chuẩn IIA Standard 1311:*

| Ref | Mã WP Liên Quan | Nội Dung / Phát Hiện Soát Xét Cần Làm Rõ | Ý Kiến Chỉ Đạo Của Trưởng Đoàn (Reviewer) | Giải Trình Của Kiểm Toán Viên (Auditor Response) | Trạng Thái (Open/Closed) |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **RN-01** | `WP-TD-02` | KTV chưa thu thập Báo cáo tài chính quý 4 đã kiểm toán của KH Thép Việt Á | Yêu cầu KTV thu thập bổ sung BCTC kiểm toán và chạy lại chỉ số nợ/EBITDA | Đã thu thập và bổ sung vào WP-TD-02 ngày 14/03 | **CLOSED** (Trưởng đoàn ký 15/03) |
| **RN-02** | `WP-KQ-01` | Biên bản kiểm kê quỹ ATM thiếu chữ ký của Cán bộ quản lý mã khóa | Yêu cầu KTV yêu cầu Chi nhánh lập văn bản giải trình lý do thiếu chữ ký | Đã nhận văn bản giải trình số 45/CV-CN ngày 15/03 | **CLOSED** |
| **RN-03** | `Finding-01` | Mô tả nguyên nhân (Cause) còn chung chung, chưa chỉ rõ lỗ hổng kiểm soát | Viết lại nguyên nhân 5C theo hướng lỗi bỏ qua chốt chặn trên hệ thống | Đã chỉnh sửa mô tả 5C trên mẫu MB-11 | **CLOSED** |

---

# 5. CHI TIẾT MẪU BIỂU GIAI ĐOẠN 4: BÁO CÁO, KẾT THÚC & XẾP HẠNG KSNB (MB-11 -> MB-14)

## MB-11: PHIẾU GHI NHẬN PHÁT HIỆN KIỂM TOÁN CHUẨN 5C (AUDIT FINDING SHEET)
*Mẫu biểu cốt lõi của Hệ thống Phần mềm KTNB 4.0, đảm bảo tính chặt chẽ pháp lý và logic:*

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             MÃ PHÁT HIỆN: FINDING-TD-01
KHỐI KIỂM TOÁN NỘI BỘ                                         Mức độ rủi ro: [X] CAO  [ ] TB  [ ] THẤP
Đoàn Kiểm toán: Chi nhánh ...................                  Lần ban hành: 01

                    PHIẾU GHI NHẬN PHÁT HIỆN KIỂM TOÁN NỘI BỘ (CHUẨN MỰC 5C)
Tên phát hiện: Giải ngân khi chưa hoàn tất biện pháp bảo đảm và có dấu hiệu đảo nợ tiềm ẩn.
Bộ phận chịu trách nhiệm: Phòng Khách hàng Doanh nghiệp - Chi nhánh .................................

1. THỰC TRẠNG (CONDITION - CÁI GÌ ĐANG DIỄN RA?):
   - Ngày 15/10/2025, Chi nhánh thực hiện giải ngân số tiền 24,000,000,000 VNĐ cho Cty TNHH BĐS An Phát
     theo HĐTD số HD-2025-112.
   - Tại thời điểm giải ngân, TSBĐ là QSDĐ tại Thửa đất số 45, Tờ bản đồ số 12 chưa hoàn tất công chứng
     thế chấp và chưa có xác nhận đã đăng ký thế chấp tại Văn phòng Đăng ký Đất đai.
   - Đến thời điểm kiểm toán (12/03/2026 - tức sau 148 ngày), hồ sơ vẫn chưa có kết quả đăng ký thế chấp.
   - Sao kê dòng tiền cho thấy 95% số tiền giải ngân được chuyển sang tài khoản của Công ty Cổ phần X để
     thanh toán tiền mua vật liệu, nhưng chỉ sau 48 giờ, Công ty X lại chuyển ngược 22 tỷ đồng về tài
     khoản của bên vay mở tại Chi nhánh khác để thanh toán nợ gốc khoản vay cũ.

2. TIÊU CHUẨN ĐỐI CHIẾU (CRITERIA - QUY ĐỊNH NÀO BỊ VI PHẠM?):
   - Khoản 2 Điều 15 Thông tư 39/2016/TT-NHNN: TCTD phải giám sát việc sử dụng vốn vay đúng mục đích.
   - Điều 24 Quy chế Cấp tín dụng nội bộ Ngân hàng (QĐ số 568/QĐ-HĐQT): "Tiền vay chỉ được giải ngân sau
     khi đã hoàn thành công chứng và đăng ký biện pháp bảo đảm theo quy định pháp luật".

3. NGUYÊN NHÂN CỐT LÕI (CAUSE - VÌ SAO SAI PHẠM XẢY RA?):
   - Nguyên nhân chủ quan: Cán bộ QHKH và Trưởng phòng KHDN chịu áp lực chỉ tiêu tăng trưởng dư nợ cuối năm,
     chủ quan tin tưởng khách hàng truyền thống.
   - Nguyên nhân kiểm soát: Chốt kiểm soát trên phần mềm LOS cho phép Giám đốc Chi nhánh ghi đè (Override)
     ngoại lệ mà không yêu cầu phê duyệt của Khối Quản trị Rủi ro Hội sở.

4. HẬU QUẢ / TÁC ĐỘNG TIỀM TÀNG (CONSEQUENCE - RỦI RO LÀ GÌ?):
   - Toàn bộ dư nợ 24 tỷ đồng đang trong trạng thái cho vay không có bảo đảm hợp pháp; nếu khách hàng phát
     sinh tranh chấp hoặc phá sản, Ngân hàng mất quyền ưu tiên thanh toán xử lý TSBĐ.
   - Rủi ro bị NHNN xử phạt vi phạm hành chính về giải ngân sai điều kiện phê duyệt.

5. HÀNH ĐỘNG KIẾN NGHỊ (CORRECTIVE ACTION RECOMMENDATION - CẦN KHẮC PHỤC THẾ NÀO?):
   - Đối với Chi nhánh:
     + Trong vòng 10 ngày làm việc: Yêu cầu khách hàng nộp ngay văn bản đăng ký thế chấp hợp pháp hoặc bổ
       sung TSBĐ thay thế thanh khoản cao (Tiền gửi, Bất động sản khác đã có sổ).
     + Nếu quá thời hạn trên, kích hoạt điều khoản thu hồi nợ trước hạn theo Hợp đồng tín dụng.
   - Đối với Khối CNTT & Quản trị Rủi ro Hội sở:
     + Khóa chức năng phê duyệt giải ngân bỏ qua điều kiện ĐKBĐ trên phần mềm Core/LOS; mọi trường hợp ngoại
       lệ bắt buộc phải được Phê duyệt viên cấp Trung ương (Khối QTRR) phê chuẩn.

Ý KIẾN GIẢI TRÌNH CỦA ĐƠN VỊ ĐƯỢC KIỂM TOÁN:
[X] Thống nhất hoàn toàn với phát hiện và khuyến nghị của KTNB.
[ ] Thống nhất một phần (nêu rõ lý do): .............................................................
Thời hạn cam kết khắc phục hoàn thành: 25/03/2026. Cán bộ đầu mối phụ trách: Ông Nguyễn Văn C (Trưởng phòng KHDN).

            TRƯỞNG ĐOÀN KIỂM TOÁN                                    ĐẠI DIỆN ĐƠN VỊ ĐƯỢC KIỂM TOÁN
            (Ký số trên Hệ thống)                                         (Ký số trên Hệ thống)
```

---

## MB-12: BIÊN BẢN HỌP KẾT THÚC THỰC ĐỊA (EXIT MEETING MINUTES)

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
ĐOÀN KIỂM TOÁN NỘI BỘ                                            Độc lập - Tự do - Hạnh phúc
                                                              -----------------------------------
                                                              Hà Nội, ngày ..... tháng ..... năm 202...

                                       BIÊN BẢN HỌP KẾT THÚC THỰC ĐỊA
                                          (EXIT MEETING MINUTES)

Cuộc họp bắt đầu vào hồi 09h00 ngày .../.../202..., tại Phòng họp Chi nhánh ............................
I. THÀNH PHẦN THAM DỰ:
   1. Về phía Đoàn kiểm toán:
      - Ông/Bà: ....................................... - Trưởng đoàn kiểm toán
      - Cùng các thành viên trong Đoàn kiểm toán.
   2. Về phía Đơn vị được kiểm toán:
      - Ông/Bà: ....................................... - Giám đốc Chi nhánh
      - Ông/Bà: ....................................... - Phó Giám đốc Chi nhánh
      - Các Trưởng/Phó phòng ban nghiệp vụ liên quan.

II. NỘI DUNG CUỘC HỌP:
1. Đoàn kiểm toán trình bày Báo cáo sơ bộ kết quả kiểm toán thực địa:
   - Tóm tắt các mặt tích cực đã đạt được của Chi nhánh.
   - Thông báo chi tiết 08 phát hiện kiểm toán (02 phát hiện Mức độ Cao, 04 Mức độ Trung bình, 02 Mức độ Thấp).
2. Đơn vị được kiểm toán phát biểu ý kiến:
   - Giám đốc Chi nhánh giải trình thêm bối cảnh kinh doanh tại địa bàn.
   - Thống nhất đối với 07/08 phát hiện; giải trình làm rõ bổ sung chứng từ đối với phát hiện số 04 (sau
     khi bổ sung chứng từ, Đoàn KTNB rút phát hiện số 04 xuống mức khuyến nghị cải tiến).
3. Thống nhất Kế hoạch lập Báo cáo chính thức và Kế hoạch khắc phục:
   - Đoàn kiểm toán dự kiến phát hành Dự thảo Báo cáo kiểm toán chính thức vào ngày: .../.../202...
   - Chi nhánh gửi Kế hoạch hành động khắc phục hoàn chỉnh (MB-15) trước ngày: .../.../202...

Cuộc họp kết thúc vào hồi 11h30 cùng ngày. Biên bản đã được đọc lại cho mọi người cùng nghe và thống nhất ký tên.

            ĐẠI DIỆN ĐƠN VỊ                                           TRƯỞNG ĐOÀN KIỂM TOÁN
         (Ký và ghi rõ họ tên)                                        (Ký và ghi rõ họ tên)
```

---

## MB-13: BÁO CÁO KIỂM TOÁN NỘI BỘ CHÍNH THỨC (FORMAL AUDIT REPORT)
*Cấu trúc chuẩn của Báo cáo kiểm toán phát hành tới Ban Kiểm soát, HĐQT và Ban Điều hành:*

```markdown
BÁO CÁO KIỂM TOÁN NỘI BỘ HOẠT ĐỘNG TOÀN DIỆN CHI NHÁNH ...
(Mã số báo cáo: BCKT-2026-CN...)

TÓM TẮT DÀNH CHO CẤP ĐIỀU HÀNH (EXECUTIVE SUMMARY):
1. Ý kiến kiểm toán tổng thể về Hệ thống KSNB: "Hệ thống KSNB của Chi nhánh đạt mức độ KÉM (Xếp hạng C)".
2. Bảng tổng hợp số lượng phát hiện theo mức độ rủi ro:
   - Rủi ro Cao (High): 02 vụ việc.
   - Rủi ro Trung bình (Medium): 04 vụ việc.
   - Rủi ro Thấp (Low): 02 vụ việc.
3. Các vấn đề rủi ro trọng yếu cần sự chỉ đạo ngay lập tức của Ban Điều hành Ngân hàng:
   - Thu hồi ngay dư nợ 24 tỷ của Cty An Phát do vi phạm biện pháp bảo đảm và dòng tiền quay vòng.
   - Chấn chỉnh quy trình giao nhận khóa két sắt và kiểm kê tiền mặt đầu giờ sáng.

NỘI DUNG CHI TIẾT THEO TỪNG MẢNG NGHIỆP VỤ:
Mục 1: Hoạt động Cấp tín dụng và Quản lý nợ.
Mục 2: Hoạt động Kế toán tài chính & Quản lý Thu chi nội bộ.
Mục 3: Hoạt động Vận hành Kho quỹ, Tiếp quỹ ATM và An toàn kho tiền.
Mục 4: Công tác Tuân thủ Pháp lý, Phòng chống rửa tiền và CNTT.

PHỤ LỤC GỬI KÈM:
- Phụ lục 01: Bảng chi tiết toàn bộ các phát hiện và khuyến nghị (Action Plan Matrix).
- Phụ lục 02: Bảng điểm và Thẻ xếp hạng KSNB (MB-14).
```

---

## MB-14: BẢNG TÍNH ĐIỂM VÀ XẾP HẠNG HỆ THỐNG KSNB (IC RATING CARD)
*Mô hình lượng hóa điểm số KSNB của Chi nhánh:*

$$\text{Tổng Điểm KSNB} = 100 - \sum \left( N_{\text{Cao}} \times 15 + N_{\text{TB}} \times 5 + N_{\text{Thấp}} \times 1 \right)$$

### Thang đo xếp hạng chính thức:
- **Hạng A (85 - 100 điểm):** Hệ thống KSNB Hoạt động Tốt (Tần suất kiểm toán: 2-3 năm/lần).
- **Hạng B (70 - 84 điểm):** Hệ thống KSNB Đạt yêu cầu nhưng còn sơ hở nhỏ (2 năm/lần).
- **Hạng C (50 - 69 điểm):** Hệ thống KSNB Kém, nhiều rủi ro trọng yếu (Kiểm toán hàng năm).
- **Hạng D (< 50 điểm):** Hệ thống KSNB Yếu kém nghiêm trọng, nguy cơ mất an toàn (Kiểm toán 6 tháng/lần và báo cáo ngay Thường trực HĐQT).

---

# 6. CHI TIẾT MẪU BIỂU GIAI ĐOẠN 5: THEO DÕI KHẮC PHỤC & PHÚC TRA (MB-15 -> MB-16)

## MB-15: KẾ HOẠCH HÀNH ĐỘNG KHẮC PHỤC KIẾN NGHỊ (ACTION PLAN)
*Mẫu biểu tương tác trực tiếp trên giao diện Web Phần mềm KTNB 4.0 giữa Đơn vị và Kiểm toán viên:*

| Mã Kiến Nghị | Nội Dung Phát Hiện & Khuyến Nghị KTNB | Biện Pháp Khắc Phục Cụ Thể Của Đơn Vị | Cán Bộ Phụ Trách | Hạn Chót Hoàn Thành (SLA) | Tài Liệu Minh Chứng Cần Cung Cấp | Trạng Thái Phê Duyệt Của KTNB |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **KN-01** | Bổ sung ĐKBĐ hoặc thu hồi nợ vay 24 tỷ Cty An Phát | Gặp trực tiếp KH, ký phụ lục bổ sung sổ đỏ khác tại Ba Đình trị giá 30 tỷ | Nguyễn Văn C (TP KHDN) | 25/03/2026 | Hợp đồng thế chấp công chứng + Đơn đăng ký ĐKBĐ | [ ] Chấp thuận [ ] Yêu cầu sửa |
| **KN-02** | Khóa lỗ hổng ghi đè giải ngân ngoại lệ trên phần mềm LOS | Viết lại Code validation trên Backend, yêu cầu chữ ký số của Giám đốc QTRR | Lê Hồng D (Khối CNTT) | 15/04/2026 | Biên bản nghiệm thu UAT hệ thống LOS v4.2 | [X] Đã duyệt kế hoạch |

---

## MB-16: BIÊN BẢN PHÚC TRA & ĐÓNG KIẾN NGHỊ KIỂM TOÁN (FOLLOW-UP CLOSURE WP)

```markdown
NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN ....................             MÃ BIỂU: MB-16
KHỐI KIỂM TOÁN NỘI BỘ                                         Mã Báo cáo gốc: BCKT-2026-CN...

                                     BÁO CÁO PHÚC TRA & ĐÓNG KIẾN NGHỊ KIỂM TOÁN
                                           (AUDIT FINDING CLOSURE MEMO)

I. THÔNG TIN KIẾN NGHỊ PHÚC TRA:
   - Mã phát hiện: Finding-TD-01 (Mức độ rủi ro: CAO).
   - Nội dung tóm tắt: Giải ngân khi chưa có ĐKBĐ đối với Cty TNHH BĐS An Phát.
   - Thời hạn cam kết ban đầu: 25/03/2026.

II. KẾT QUẢ THỬ NGHIỆM PHÚC TRA (VALIDATION TESTING):
   - Ngày phúc tra: 28/03/2026.
   - Kiểm toán viên thực hiện: Nguyễn Văn A (KTV phụ trách).
   - Phương pháp phúc tra: [X] Kiểm tra chứng từ điện tử   [X] Đối chiếu hệ thống LOS/Core   [ ] Thực địa
   - Bằng chứng thu thập:
     1. Bản sao công chứng Hợp đồng thế chấp QSDĐ số công chứng 458/2026 ngày 22/03/2026.
     2. Giấy tiếp nhận hồ sơ đăng ký biện pháp bảo đảm có dấu xác nhận của Chi nhánh VP ĐKĐĐ ngày 23/03/2026.
     3. Khách hàng đã thanh toán giảm nợ gốc 5,000,000,000 VNĐ vào ngày 24/03/2026 (Sao kê TK kèm theo).

III. KẾT LUẬN VÀ ĐỀ XUẤT:
   - Đánh giá: Đơn vị đã hoàn thành 100% biện pháp khắc phục; rủi ro pháp lý đối với TSBĐ đã được giải tỏa.
   - Đề xuất của KTV: [X] CHÍNH THỨC ĐÓNG KIẾN NGHỊ (CLOSE FINDING).
   - Phê duyệt của Trưởng phòng KTNB: ĐỒNG Ý ĐÓNG trên phần mềm hệ thống ngày 28/03/2026.
```

---

# 7. THƯ VIỆN MA TRẬN RỦI RO VÀ KIỂM SOÁT (RCM) CHUYÊN SÂU NGÂN HÀNG THƯƠNG MẠI

---

## 7.1. RCM NGHIỆP VỤ CẤP TÍN DỤNG & QUẢN LÝ TÀI SẢN BẢO ĐẢM (CREDIT & COLLATERAL)

*Căn cứ quy định: Thông tư 39/2016/TT-NHNN, Thông tư 11/2021/TT-NHNN, Bộ Luật Dân sự 2015.*

```markdown
1. MỤC TIÊU KIỂM SOÁT NGHIỆP VỤ TÍN DỤNG:
   - Đảm bảo 100% hồ sơ cấp tín dụng tuân thủ điều kiện cấp tín dụng theo luật định.
   - Ngăn ngừa tình trạng cho vay sân sau, tài trợ dự án ma, cấp tín dụng vượt giới hạn cho nhóm khách hàng liên quan.
   - Đảm bảo TSBĐ có giá trị pháp lý, được định giá khách quan và kiểm tra định kỳ đầy đủ.
```

### Chi tiết bảng RCM Nghiệp vụ Cấp tín dụng:

| Mã Rủi Ro | Giai Đoạn Quy Trình | Mô Tả Rủi Ro (Risk Event) | Hậu Quả Tiềm Tàng | Chốt Kiểm Soát Trọng Yếu (Key Control) | Loại & Tần Suất | Thủ Tục Thử Nghiệm Kiểm Soát (ToE) | Thủ Tục Kiểm Tra Cơ Bản (ToD) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **R-TD01** | Tiếp nhận hồ sơ & Thẩm định | Khách hàng nộp Báo cáo tài chính giả mạo có lãi để làm đẹp hồ sơ vay | Cho vay khách hàng mất khả năng thanh toán, dẫn đến phát sinh nợ xấu | Quy định bắt buộc tra cứu BCTC nộp cơ quan Thuế có mã vạch xác nhận qua Cổng eTax | Preventive / Mỗi hồ sơ | Kiểm tra tính hiện hữu của tài liệu xác nhận tra cứu Thuế trong hồ sơ thẩm định | Đối chiếu doanh thu trên BCTC với dòng tiền thực tế qua sao kê ngân hàng và tài khoản thanh toán |
| **R-TD02** | Thẩm định tư cách khách hàng | Khách hàng có nợ xấu tại TCTD khác hoặc người đại diện có tiền sử tín dụng xấu | Nguy cơ mất vốn do uy tín tín dụng kém | Tra cứu báo cáo tín dụng CIC (Trung tâm Thông tin Tín dụng Quốc gia) bắt buộc trong vòng 03 ngày trước phê duyệt | Detective / Mỗi khoản vay | Kiểm tra log tra cứu CIC trên hệ thống LOS có đúng thời hạn quy định | Trích xuất báo cáo CIC đối chứng độc lập tại thời điểm kiểm toán; kiểm tra CIC nhóm liên quan |
| **R-TD03** | Thẩm định thực tế cơ sở kinh doanh | Phương án kinh doanh ảo, hàng tồn kho khống, nhà xưởng không hoạt động | Cho vay sai mục đích, thất thoát vốn | Biên bản thẩm định thực tế phải có chữ ký của 02 cán bộ và có ảnh chụp định vị GPS | Preventive / Định kỳ | Kiểm tra hồ sơ ảnh có dữ liệu Exif Metadata (thời gian, tọa độ GPS) trùng khớp địa điểm | Kiểm toán viên phúc tra đột xuất tại địa chỉ nhà xưởng/kho hàng của mẫu khoản vay |
| **R-TD04** | Định giá Tài sản bảo đảm | Định giá đất, nhà xưởng cao hơn giá thị trường để cấp vốn dư thừa | Ngân hàng không thu hồi đủ nợ khi phát mại tài sản | TSBĐ > 5 tỷ VNĐ phải có Chứng thư định giá độc lập; Định giá nội bộ độc lập với bộ phận kinh doanh | Preventive / Mỗi TSBĐ | Kiểm tra danh sách đơn vị thẩm định giá hợp tác có nằm trong Blacklist của Ngân hàng không | Khảo sát độc lập giá đất cùng vị trí tại thời điểm cấp tín dụng; so sánh tỷ lệ chênh lệch giá |
| **R-TD05** | Phê duyệt hạn mức | Phê duyệt vượt thẩm quyền hoặc tách hợp đồng vay nhỏ để né thẩm quyền Hội sở | Vi phạm quy chế quản trị nội bộ và quy định của Ngân hàng Nhà nước | Hệ thống Core/LOS áp đặt giới hạn phê duyệt cứng theo User ID; kiểm tra dư nợ gộp khách hàng | Preventive / Tự động | Thực hiện Penetration Test tài khoản Giám đốc CN xem có duyệt được hồ sơ vượt hạn mức | Chạy câu lệnh SQL quét các khoản vay giải ngân cho cùng một người thụ hưởng trong vòng 7 ngày |
| **R-TD06** | Công chứng & Đăng ký giao dịch bảo đảm | Tài sản thế chấp bị tẩu tán hoặc tranh chấp do chưa hoàn thành thủ tục ĐKBĐ | Mất quyền ưu tiên thanh toán khi xử lý nợ | Quy định bắt buộc có Phiếu tiếp nhận hoặc Đơn đăng ký ĐKBĐ hợp lệ trước khi bấm duyệt giải ngân | Preventive / Mỗi lần giải ngân | Kiểm tra trường ngày ĐKBĐ và ngày giải ngân trên phần mềm Core Banking | So sánh ngày trên Giấy chứng nhận ĐKBĐ bản gốc với ngày trích tiền trên hệ thống kế toán |
| **R-TD07** | Giải ngân vốn vay | Tiền giải ngân bị rút ra tiền mặt hoặc chuyển lòng vòng để đảo nợ khoản vay cũ | Sử dụng vốn vay sai mục đích, che giấu nợ xấu | Quy định giải ngân không dùng tiền mặt (chuyển khoản trực tiếp cho bên bán/cung cấp dịch vụ) | Preventive / Mỗi lần giải ngân | Kiểm tra tài liệu chứng minh giải ngân: Hợp đồng kinh tế, Hóa đơn GTGT, Biên bản giao hàng | Lập sơ đồ dòng tiền (Fund Flow Analysis) theo dõi tài khoản bên thụ hưởng trong vòng 48 giờ |
| **R-TD08** | Giám sát sau vay & Kiểm tra định kỳ | Khách hàng ngừng hoạt động hoặc chuyển nhượng TSBĐ nhưng Ngân hàng không biết | Phát sinh tổn thất không kịp thời xử lý, nợ chuyển nhóm chậm | Quy định kiểm tra sau vay lần đầu trong 30 ngày và định kỳ 03-06 tháng/lần | Detective / Định kỳ | Kiểm tra lịch sử lập Biên bản kiểm tra sau vay trên hệ thống phần mềm | Phỏng vấn cán bộ QHKH và thực hiện kiểm tra thực tế ngẫu nhiên các món vay có rủi ro cao |
| **R-TD09** | Phân loại nợ & Trích lập dự phòng (TT 11) | Chi nhánh cố tình giữ nợ nhóm 1 đối với các khoản nợ quá hạn để không bị trích lập DPRR | Báo cáo tài chính phản ánh sai lệch lợi nhuận, vi phạm quy định NHNN | Hệ thống Core Banking tự động nhảy nhóm nợ theo số ngày quá hạn và kết quả tra cứu CIC định kỳ | Preventive / Tự động | Kiểm tra logic hệ số tham số nhảy nhóm nợ của phần mềm Core Banking | Đối chiếu danh sách nợ nhóm 1 tại Chi nhánh với dữ liệu CIC toàn quốc tại cùng thời điểm |

---

## 7.2. RCM NGHIỆP VỤ NGUỒN VỐN & KINH DOANH THỊ TRƯỜNG VỐN (TREASURY)

*Căn cứ quy định: Thông tư 13/2018/TT-NHNN, Basel II/III (Tỷ lệ LCR, NSFR), Chuẩn mực ISDA.*

```markdown
1. MỤC TIÊU KIỂM SOÁT NGHIỆP VỤ TREASURY:
   - Đảm bảo tuân thủ nghiêm ngặt các hạn mức rủi ro thị trường (Hạn mức Stop-loss, VaR, Hạn mức đối tác Counterparty).
   - Phân tách tuyệt đối trách nhiệm giữa Front Office (Kinh doanh), Middle Office (Quản trị rủi ro) và Back Office (Thanh toán).
   - Kiểm soát tính trung thực của các giao dịch phái sinh (Derivatives), kinh doanh ngoại tệ (FX), thị trường liên ngân hàng (MM).
```

### Chi tiết bảng RCM Nghiệp vụ Nguồn vốn:

| Mã Rủi Ro | Quy Trình Nghiệp Vụ | Mô Tả Rủi Ro (Risk Event) | Chốt Kiểm Soát Trọng Yếu (Key Control) | Loại & Tần Suất | Thủ Tục Thử Nghiệm Kiểm Soát (ToE) | Thủ Tục Kiểm Tra Cơ Bản (ToD) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **R-TR01** | Thiết lập Hạn mức Giao dịch (Limit Setting) | Giao dịch vượt hạn mức đối tác (Counterparty Limit) dẫn đến rủi ro thanh toán | Hệ thống Kondor+/Kalypto tự động khóa giao dịch khi tổng trạng thái vượt hạn mức | Preventive / Tự động | Thử nhập lệnh giao dịch vượt hạn mức 1 triệu USD để kiểm tra hệ thống có từ chối không | Kiểm tra Báo cáo hạn mức hàng ngày (Daily Limit Monitoring Report) do Middle Office phát hành |
| **R-TR02** | Thực hiện giao dịch ngoại hối/tiền tệ | Trader thực hiện giao dịch ngầm ngoài hệ thống hoặc gian lận tỷ giá (Off-market rate) | Ghi âm 100% đường điện thoại giao dịch, lưu trữ tin nhắn giao dịch Bloomberg/Reuters Chat | Detective / Liên tục | Kiểm tra ngẫu nhiên các file ghi âm cuộc gọi của Trader tương ứng với các giao dịch lớn | Đối chiếu tỷ giá giao dịch của Trader với dải biên độ tỷ giá Reuters tại đúng phút giây giao dịch |
| **R-TR03** | Xác nhận giao dịch (Deal Confirmation) | Giao dịch bị nhập sai kỳ hạn, sai số tiền hoặc đối tác từ chối thực hiện | Bộ phận Back Office độc lập gửi và nhận điện xác nhận (SWIFT MT300/MT320) trước giờ cut-off | Detective / Hàng ngày | Kiểm tra log điện SWIFT xác nhận có được đối chiếu độc lập bởi cán bộ Back Office không | Kiểm tra danh sách các giao dịch chưa khớp điện (Unconfirmed Deals) quá hạn 48 giờ |
| **R-TR04** | Định giá lại danh mục (Mark-to-Market) | Định giá sai giá trị thị trường của trái phiếu doanh nghiệp để che giấu lỗ | Định giá lại độc lập hàng ngày bởi Middle Office căn cứ theo đường cong lãi suất chuẩn | Detective / Hàng ngày | Kiểm tra nguồn dữ liệu giá thị trường đầu vào dùng để chạy mô hình Mark-to-Market | Tính toán lại độc lập (Recalculate) giá trị PnL của danh mục Trái phiếu tại ngày khóa sổ |
| **R-TR05** | Quản lý thanh khoản (LCR/NSFR) | Vi phạm tỷ lệ dự trữ thanh khoản hoặc tỷ lệ nguồn vốn ngắn hạn cho vay trung dài hạn | Khối Quản trị Rủi ro giám sát và tính toán chỉ số thanh khoản hàng ngày trên Data Warehouse | Detective / Hàng ngày | Kiểm tra thuật toán tổng hợp dòng tiền vào/ra trên Data Warehouse | Tự chạy độc lập kịch bản Stress Testing thanh khoản giả định rút tiền hàng loạt 10% trong 30 ngày |

---

## 7.3. RCM NGHIỆP VỤ QUẢN LÝ KHO QUỸ & TIẾP QUỸ TIỀN MẶT (CASH & VAULT)

*Căn cứ quy định: Thông tư 01/2014/TT-NHNN, Quy trình bảo quản, vận chuyển tiền mặt, tài sản quý.*

```markdown
1. MỤC TIÊU KIỂM SOÁT NGHIỆP VỤ KHO QUỸ:
   - Đảm bảo an toàn tuyệt đối tiền mặt, giấy tờ có giá và tài sản thế chấp lưu giữ tại kho tiền.
   - Tuân thủ nguyên tắc hai người (Dual Control) trong mọi thao tác mở két, kiểm đếm, giao nhận và vận chuyển.
   - Khớp đúng 100% giữa số liệu tồn quỹ sổ sách kế toán với tiền mặt thực tế trong két.
```

### Chi tiết bảng RCM Nghiệp vụ Kho quỹ:

| Mã Rủi Ro | Quy Trình Nghiệp Vụ | Mô Tả Rủi Ro (Risk Event) | Chốt Kiểm Soát Trọng Yếu (Key Control) | Loại & Tần Suất | Thủ Tục Thử Nghiệm Kiểm Soát (ToE) | Thủ Tục Kiểm Tra Cơ Bản (ToD) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **R-KQ01** | Mở và khóa cửa Kho tiền | Một người tự ý giữ cả chìa khóa và mã số két sắt để lén mở két biển thủ tiền | Nguyên tắc 02 người độc lập (Trưởng quỹ giữ chìa khóa, Giám đốc giữ mã khóa bí mật) | Preventive / Mỗi lần mở cửa | Kiểm tra Sổ theo dõi đóng mở kho tiền có đủ chữ ký của cả 02 người có trách nhiệm | Trích xuất dữ liệu thẻ từ/vân tay và camera cửa kho tiền đối chiếu thời gian đóng mở thực tế |
| **R-KQ02** | Khớp số liệu tồn quỹ cuối ngày | Tồn quỹ thực tế thiếu hụt so với sổ sách do thủ quỹ lấy tiền sử dụng cá nhân | Kiểm kê quỹ thực tế cuối mỗi ngày làm việc có sự tham gia của Kế toán trưởng | Detective / Hàng ngày | Kiểm tra Biên bản kiểm kê quỹ cuối ngày có đầy đủ chữ ký 03 bên (GĐ, KTT, Thủ quỹ) | Thực hiện kiểm kê quỹ đột xuất tại thời điểm bắt đầu cuộc kiểm toán nội bộ |
| **R-KQ03** | Hạn mức tồn quỹ kho tiền (Cash Limit) | Chi nhánh giữ tiền mặt vượt hạn mức bảo hiểm quy định, nguy cơ mất an toàn | Hệ thống Core Banking cảnh báo khi số dư tài khoản 1011 vượt hạn mức bảo hiểm | Detective / Liên tục | Kiểm tra phân quyền phê duyệt khi tài khoản tồn quỹ vượt trần bảo hiểm | Trích xuất báo cáo số dư tài khoản 1011 lúc 18h00 hàng ngày đối chiếu với hạn mức được cấp |
| **R-KQ04** | Tiếp quỹ và quản lý tiền tại ATM/CDM | Cán bộ tiếp quỹ gian lận bớt tiền khi nạp vào hộp tiền ATM (Cassette) | Lắp đặt camera ghi hình trực diện thao tác nạp tiền; kiểm kê độc lập khi thanh toán hộp tiền | Detective / Mỗi lần tiếp quỹ | Kiểm tra quy trình niêm phong hộp tiền và biên bản bàn giao giữa các cán bộ áp tải | Đối chiếu báo cáo Nhật ký giao dịch (Journal ATM) với số dư tiền thừa thu hồi từ hộp tiền |
| **R-KQ05** | Vận chuyển tiền mặt trên đường | Xe chở tiền bị cướp hoặc mất mát do không tuân thủ quy chuẩn an toàn | Xe chuyên dùng có định vị GPS, có cảnh sát bảo vệ có vũ trang đi kèm | Preventive / Mỗi chuyến xe | Kiểm tra Giấy lệnh điều xe và Hợp đồng bảo vệ có vũ trang cho các chuyến vận chuyển lớn | Kiểm tra lịch trình giám sát hành trình GPS của xe chở tiền trong thời kỳ kiểm toán |

---

## 7.4. RCM NGHIỆP VỤ AN TOÀN CÔNG NGHỆ THÔNG TIN & NGÂN HÀNG SỐ (IT & DIGITAL BANKING)

*Căn cứ quy định: Thông tư 09/2020/TT-NHNN, Luật An ninh mạng, Tiêu chuẩn PCI-DSS v4.0, ISO 27001.*

```markdown
1. MỤC TIÊU KIỂM SOÁT AN TOÀN CNTT:
   - Đảm bảo tính bảo mật (Confidentiality), tính toàn vẹn (Integrity) và tính sẵn sàng (Availability) của Core Banking.
   - Thực thi nghiêm ngặt nguyên tắc phân tách nhiệm vụ (SoD) và cấp quyền tối thiểu (Least Privilege).
   - Ngăn chặn tấn công mạng, rò rỉ dữ liệu thẻ/tài khoản khách hàng và gian lận thanh toán điện tử.
```

### Chi tiết bảng RCM Nghiệp vụ An toàn CNTT:

| Mã Rủi Ro | Quy Trình Nghiệp Vụ | Mô Tả Rủi Ro (Risk Event) | Chốt Kiểm Soát Trọng Yếu (Key Control) | Loại & Tần Suất | Thủ Tục Thử Nghiệm Kiểm Soát (ToE) | Thủ Tục Kiểm Tra Cơ Bản (ToD) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **R-IT01** | Quản lý Phân quyền Người dùng (IAM) | Nhân viên chuyển phòng ban hoặc nghỉ việc nhưng tài khoản Core Banking vẫn hoạt động | Quy trình định kỳ 03 tháng rà soát phân quyền người dùng (User Access Review) | Detective / Hàng quý | Kiểm tra biên bản rà soát User Access Review gần nhất có phê duyệt của Chủ quản nghiệp vụ | Chạy câu lệnh SQL so sánh danh sách nhân sự đã nghỉ việc (HRMS) với danh sách Active User Core Banking |
| **R-IT02** | Phân tách nhiệm vụ (Segregation of Duties) | Một người vừa có quyền Lập lệnh (Maker) vừa có quyền Duyệt lệnh (Checker) giao dịch | Hệ thống Core Banking chặn cứng tính năng tự duyệt lệnh của chính mình | Preventive / Tự động | Thử tạo giao dịch thử nghiệm và dùng chính tài khoản đó để Approve | Phân tích CSDL tìm kiếm các giao dịch có `created_by` = `approved_by` |
| **R-IT03** | Quản trị Cơ sở dữ liệu (DBA Access) | DBA truy cập trực tiếp CSDL chạy lệnh `UPDATE/DELETE` sửa số dư tài khoản | Sử dụng giải pháp Giám sát hoạt động CSDL (Database Activity Monitoring - DAM / Imperva) | Detective / Liên tục | Kiểm tra hệ thống DAM có cảnh báo khi có lệnh DDL hoặc DML trực tiếp vào bảng số dư | Kiểm tra log audit của PostgreSQL/Oracle đối với các truy cập bằng tài khoản `postgres`/`sysdba` |
| **R-IT04** | Sao lưu & Phục hồi Dữ liệu (Backup & DR) | Hệ thống gặp sự cố thiên tai/mất điện nhưng không khôi phục được dữ liệu | Sao lưu tự động hàng ngày, diễn tập chuyển đổi thảm họa (DR Drill) tối thiểu 01 lần/năm | Detective / Định kỳ | Kiểm tra Báo cáo kết quả diễn tập DR gần nhất có xác nhận RTO (<4h) và RPO (<15p) | Yêu cầu khôi phục thử nghiệm một bản sao lưu (Restore Test) ngẫu nhiên lên môi trường Staging |
| **R-IT05** | Bảo mật API Ngân hàng Mở (Open Banking) | Hacker lợi dụng API lộ lọt thông tin hoặc thực hiện lệnh rút tiền trái phép | Triển khai API Gateway kiểm tra mTLS, OAuth 2.0, Rate Limiting và mã hóa Payload | Preventive / Tự động | Kiểm tra cấu hình API Gateway có bật xác thực 2 chiều mTLS và chữ ký số HMAC không | Kiểm toán viên CNTT thực hiện thử nghiệm tấn công lỗ hổng API (OWASP API Security Top 10) |

---

# 8. HƯỚNG DẪN ĐÓNG VÀ LƯU TRỮ HỒ SƠ KIỂM TOÁN ĐIỆN TỬ (ELECTRONIC AUDIT FILE)

Để đảm bảo tuân thủ Điều 44 Thông tư 13/2018/TT-NHNN và Chuẩn mực IIA Standard 2330 về Lưu trữ hồ sơ làm việc:

```markdown
1. NGUYÊN TẮC KHÓA HỒ SƠ ĐIỆN TỬ (AUDIT FILE CLOSURE):
   - Trong vòng 60 ngày kể từ ngày Báo cáo kiểm toán chính thức (MB-13) được ký duyệt phát hành,
     toàn bộ hồ sơ cuộc kiểm toán trên Phần mềm KTNB 4.0 phải được đóng (Locked).
   - Khi đã khóa, không bất kỳ ai (kể cả Quản trị viên hệ thống - Admin) có thể chỉnh sửa, thêm hoặc xóa
     bớt giấy làm việc (Working Papers), trừ khi có phê duyệt mở lại bằng văn bản của Trưởng Ban Kiểm soát.

2. CẤU TRÚC THƯ MỤC HỒ SƠ LƯU TRỮ CHUẨN TRÊN HỆ THỐNG:
   ENGAGEMENT_ARCHIVE_2026_CN_CHO_LON/
   ├── 01_PLANNING/
   │   ├── MB-01_Khao_sat_rui_ro_signed.pdf
   │   ├── MB-04_Quyet_dinh_kiem_toan_signed.pdf
   │   ├── MB-05_Ke_hoach_chi_tiet_cuoc_KT.docx
   │   └── MB-06_Engagement_RCM_Matrix.xlsx
   ├── 02_FIELDWORK/
   │   ├── MB-07_Credit_Grid_Testing.xlsx
   │   ├── MB-08_Sampling_MUS_Calculation.xlsx
   │   ├── MB-09_Bien_ban_phong_van_xac_minh.pdf
   │   └── EVIDENCE_FILES/ (Ảnh chụp, sao kê trích xuất Core)
   ├── 03_REVIEW_QA/
   │   └── MB-10_Review_Notes_Log.pdf
   ├── 04_REPORTING/
   │   ├── MB-11_Phieu_ghi_nhan_5C_all.pdf
   │   ├── MB-12_Bien_ban_Exit_Meeting_signed.pdf
   │   ├── MB-13_Bao_cao_KTNB_chinh_thuc_signed.pdf
   │   └── MB-14_Bang_diem_xep_hang_KSNB.xlsx
   └── 05_FOLLOW_UP/
       ├── MB-15_Action_Plan_approved.xlsx
       └── MB-16_Closure_Memos/

3. THỜI HẠN BẢO QUẢN:
   - Hồ sơ kiểm toán nội bộ được lưu trữ an toàn tối thiểu 10 (mười) năm theo quy định của Luật Các tổ chức
     tín dụng và quy định về lưu trữ chứng từ ngân hàng.
   - Định kỳ hàng năm, hệ thống tự động kiểm tra tính toàn vẹn (Integrity Hash Check SHA-256) của các
     tệp hồ sơ lưu trữ để chống giả mạo hoặc suy hao dữ liệu.
```

---
*Tài liệu được ban hành và cập nhật tại Thư mục `docs/methodology/` phục vụ công tác chuẩn hóa nghiệp vụ và tích hợp tự động vào Hệ thống Phần mềm KTNB 4.0.*
