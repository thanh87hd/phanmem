import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditReport } from './entities/audit-report.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from 'docx';

@Injectable()
export class AuditReportsExportService {
  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private readonly recRepo: Repository<Recommendation>,
  ) {}

  async generateWord(
    report: AuditReport,
    templateType?: string,
  ): Promise<Buffer> {
    // Get related findings and recommendations
    const { findings, relatedRecs } = await this.getReportContext(report);

    const children: any[] = [];

    // Watermark header if draft
    if (report.status !== 'Issued') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '--- BẢN DỰ THẢO (DÙNG CHO SOÁT XÉT - CHƯA PHÁT HÀNH CHÍNH THỨC) ---',
              bold: true,
              color: 'FF0000',
              size: 20,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      );
      children.push(new Paragraph({ text: '' }));
    }

    // Header Bank & Dept
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN LỘC PHÁT VIỆT NAM',
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'KHỐI KIỂM TOÁN NỘI BỘ',
            bold: true,
            size: 22,
            underline: {},
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    const mode =
      templateType ||
      report.reportTemplateType ||
      (report.engagement?.auditCategory === 'PGDBD_TKBD'
        ? 'MB02B_BDT'
        : report.engagement?.auditCategory === 'HEAD_OFFICE' ||
            report.engagement?.auditCategory === 'THEMATIC'
          ? 'MB03B_HSC'
          : 'MB01B_DVKD');

    const isPostal =
      mode === 'MB02B_BDT' ||
      mode === 'MB02B' ||
      report.engagement?.auditCategory === 'PGDBD_TKBD';
    const isHsc =
      mode === 'MB03B_HSC' ||
      mode === 'MB03B' ||
      mode === 'MB03' ||
      report.engagement?.auditCategory === 'HEAD_OFFICE' ||
      report.engagement?.auditCategory === 'THEMATIC';

    const eng = report.engagement;
    const reportNumber =
      report.reportNo ||
      (eng?.id ? `${eng.id}/2026/BCKT-IA` : `${report.id}/2026/BCKT-IA`);
    const auditeeName =
      report.auditeeUnit ||
      report.branchName ||
      eng?.branchName ||
      report.plan ||
      (isHsc
        ? 'Khối Hội sở chính'
        : isPostal
          ? 'Bưu điện tỉnh / PGDBĐ'
          : 'Chi nhánh / Đơn vị kinh doanh');

    const docMainTitle = isHsc
      ? 'BÁO CÁO KẾT QUẢ KIỂM TOÁN\nNGHIỆP VỤ / QUY TRÌNH / CHUYÊN ĐỀ (MB03B)'
      : isPostal
        ? 'BÁO CÁO KẾT QUẢ KIỂM TOÁN\nHOẠT ĐỘNG CUNG CẤP DỊCH VỤ NGÂN HÀNG TẠI PHÒNG GIAO DỊCH BƯU ĐIỆN (MB02B)'
        : 'BÁO CÁO KIỂM TOÁN\nNGHIỆP VỤ TÍN DỤNG, PHI TÍN DỤNG VÀ QUẢN LÝ PGDBĐ TẠI ĐƠN VỊ KINH DOANH (MB01B)';

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: docMainTitle,
            bold: true,
            size: 26,
            color: '003366',
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: report.title,
            bold: true,
            size: 22,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(new Paragraph({ text: '' }));
    const decisionText = `${report.decisionNo || eng?.decisionNo || '87/2026/QĐ-IA'} ngày ${report.decisionDate || eng?.decisionDate || '---'}`;
    const fieldworkText =
      report.fieldworkPeriod ||
      (eng?.fieldworkStartDate
        ? `Từ ${eng.fieldworkStartDate} đến ${eng.fieldworkEndDate}`
        : 'Theo kế hoạch đã phê duyệt');
    const leadAuditor =
      report.leadAuditorName ||
      eng?.leadAuditorUser?.fullName ||
      report.issuedBy ||
      'Trưởng đoàn kiểm toán';
    const teamMembersText =
      report.teamMembers ||
      (Array.isArray(eng?.teamMembers)
        ? eng.teamMembers
            .map((m: any) => `${m.fullName} (${m.role || 'KTV'})`)
            .join('; ')
        : '---');

    // Metadata Info Table
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Cuộc kiểm toán',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: report.plan || eng?.name || '---',
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Số báo cáo', bold: true, size: 20 }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: reportNumber, bold: true, size: 20 }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Đơn vị được kiểm toán',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: auditeeName, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Quyết định kiểm toán',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: decisionText, size: 20 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Thời gian thực địa',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: fieldworkText, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Trưởng đoàn kiểm toán',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: leadAuditor, bold: true, size: 20 }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Thành viên đoàn',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: teamMembersText, size: 20 })],
                }),
              ],
              columnSpan: 3,
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Ngày phát hành',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: report.date || '---', size: 20 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Chữ ký số (CA)',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: report.isSigned ? 'ĐÃ KÝ SỐ ✔' : 'CHƯA KÝ SỐ ✘',
                      bold: true,
                      color: report.isSigned ? '389E0D' : '808080',
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(infoTable);
    children.push(new Paragraph({ text: '' }));

    // Ratings Table
    const ratingTableTitle = isHsc
      ? 'BẢNG XẾP HẠNG HỆ THỐNG KIỂM SOÁT NỘI BỘ VÀ QUY TRÌNH NGHIỆP VỤ'
      : isPostal
        ? 'BẢNG XẾP HẠNG CHẤT LƯỢNG HOẠT ĐỘNG PGDBĐ VÀ KIỂM SOÁT BƯU ĐIỆN'
        : 'BẢNG XẾP HẠNG HOẠT ĐỘNG KIỂM SOÁT NỘI BỘ VÀ MA TRẬN ĐVKD';

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: ratingTableTitle,
            bold: true,
            size: 22,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );

    const formatRatingColor = (r?: string) => {
      const val = (r || '').toLowerCase();
      if (
        val.includes('không đạt') ||
        val.includes('unsatisfactory') ||
        val.includes('hạng 4') ||
        val.includes('hạng 5')
      )
        return 'FF0000';
      if (
        val.includes('cần cải thiện') ||
        val.includes('improvement') ||
        val.includes('hạng 3')
      )
        return 'D48806';
      return '389E0D';
    };

    const ratingRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'STT', bold: true, size: 20 })],
              }),
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Nghiệp vụ / Hoạt động kiểm soát',
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Xếp hạng kiểm toán',
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '1' })] }),
          new TableCell({
            children: [
              new Paragraph({
                text: 'Nghiệp vụ Tín dụng Khách hàng Cá nhân (KHCN)',
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.branchRatingCreditPersonal || 'Đạt yêu cầu',
                    bold: true,
                    color: formatRatingColor(report.branchRatingCreditPersonal),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '2' })] }),
          new TableCell({
            children: [
              new Paragraph({
                text: 'Nghiệp vụ Tín dụng Khách hàng Doanh nghiệp (KHDN)',
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.branchRatingCreditCorporate || 'Đạt yêu cầu',
                    bold: true,
                    color: formatRatingColor(
                      report.branchRatingCreditCorporate,
                    ),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '3' })] }),
          new TableCell({
            children: [
              new Paragraph({
                text: 'Nghiệp vụ Phi tín dụng, Kế toán & Quản lý Kho quỹ',
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.branchRatingNonCredit || 'Đạt yêu cầu',
                    bold: true,
                    color: formatRatingColor(report.branchRatingNonCredit),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '4' })] }),
          new TableCell({
            children: [
              new Paragraph({
                text: 'Công tác Quản lý Phòng Giao dịch Bưu điện (PGDBĐ)',
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.branchRatingPgdbd || 'Đạt yêu cầu',
                    bold: true,
                    color: formatRatingColor(report.branchRatingPgdbd),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '★', bold: true })],
              }),
            ],
            shading: { fill: 'F9F0EA' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'XẾP HẠNG TỔNG THỂ CHI NHÁNH / ĐƠN VỊ',
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            shading: { fill: 'F9F0EA' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      report.branchOverallRating ||
                      report.auditRating ||
                      'Đạt yêu cầu',
                    bold: true,
                    color: formatRatingColor(
                      report.branchOverallRating || report.auditRating,
                    ),
                    size: 22,
                  }),
                ],
              }),
            ],
            shading: { fill: 'F9F0EA' },
          }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: ratingRows,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Scope & Methodology
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'I. PHẠM VI KIỂM TOÁN',
            bold: true,
            size: 24,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              report.scope ||
              'Kiểm toán toàn diện các mặt hoạt động tín dụng, phi tín dụng, ngân quỹ, quản lý vận hành và tuân thủ quy định pháp luật tại Đơn vị trong thời kỳ kiểm toán được phê duyệt.',
            size: 22,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'II. PHƯƠNG PHÁP KIỂM TOÁN',
            bold: true,
            size: 24,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              report.methodology ||
              'Áp dụng phương pháp kiểm toán trên cơ sở rủi ro (Risk-based Auditing) theo chuẩn mực IIA Quốc tế, kết hợp kiểm tra mẫu chi tiết trên hồ sơ, kiểm tra thực địa tài sản và phỏng vấn cán bộ nghiệp vụ.',
            size: 22,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Executive Summary
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'III. TÓM TẮT KẾT QUẢ VÀ KẾT LUẬN',
            bold: true,
            size: 24,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              report.executiveSummary ||
              'Đoàn kiểm toán đã hoàn tất việc rà soát và đánh giá các quy trình/hoạt động thuộc phạm vi kiểm toán.',
            size: 22,
          }),
        ],
      }),
    );
    if (report.overallConclusion) {
      children.push(new Paragraph({ text: '' }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Kết luận chung:',
              bold: true,
              size: 22,
              underline: {},
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: report.overallConclusion, size: 22 })],
        }),
      );
    }
    children.push(new Paragraph({ text: '' }));

    // Findings section
    if (findings.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'IV. CHI TIẾT CÁC PHÁT HIỆN KIỂM TOÁN',
              bold: true,
              size: 24,
              color: '003366',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        }),
      );

      findings.forEach((f, i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Phát hiện ${i + 1}: [${f.findingCode || `FD-${f.id}`}] ${f.findingTitle}`,
                bold: true,
                size: 22,
              }),
            ],
            heading: HeadingLevel.HEADING_3,
          }),
        );

        const riskColor =
          f.riskLevel === 'Critical' ||
          f.riskLevel === 'High' ||
          f.riskLevel === 'Cao'
            ? 'FF0000'
            : f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình'
              ? 'D48806'
              : '389E0D';

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Mức độ rủi ro: ', bold: true, size: 20 }),
              new TextRun({
                text: f.riskLevel || 'Chưa xếp loại',
                bold: true,
                color: riskColor,
                size: 20,
              }),
              new TextRun({ text: '  |  Nghiệp vụ: ', bold: true, size: 20 }),
              new TextRun({
                text: f.operationType || f.findingCategory || 'Tín dụng',
                size: 20,
              }),
              new TextRun({
                text: '  |  Đối tượng/CIF: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: f.customerName
                  ? `${f.customerName} ${f.cifOrAccount ? `(CIF: ${f.cifOrAccount})` : ''}`
                  : f.cifOrAccount || '---',
                size: 20,
              }),
            ],
          }),
        );

        // 3D Defect Codes
        const internalCode =
          f.legacyInternalDefectCode ||
          f.internalDefectCodeEntity?.code ||
          'Chưa mã hóa';
        const nd340Code =
          f.legacyNd340DefectCode ||
          f.nd340DefectCodeEntity?.code ||
          'Không thuộc diện NĐ 340';
        const nhanSuCode =
          f.legacyNhanSuDefectCode ||
          f.nhanSuDefectCodeEntity?.code ||
          'Không vi phạm nhân sự';
        const fineText = f.actualFineAmount
          ? `${f.actualFineAmount.toLocaleString('vi-VN')} VND`
          : '0 VND';

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• Mã lỗi nội bộ LPBank: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: internalCode,
                size: 20,
                bold: true,
                color: '003366',
              }),
              new TextRun({
                text: '  |  Mã vi phạm NĐ 340: ',
                bold: true,
                size: 20,
              }),
              new TextRun({ text: nd340Code, size: 20 }),
              new TextRun({ text: '  |  Mã Nhân sự: ', bold: true, size: 20 }),
              new TextRun({ text: nhanSuCode, size: 20 }),
            ],
          }),
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• Số tiền phạt vi phạm dự kiến: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: fineText,
                size: 20,
                bold: true,
                color: f.actualFineAmount ? 'FF0000' : '333333',
              }),
            ],
          }),
        );

        // Violating personnel
        const proposer =
          f.legacyProposerOfficer || f.proposerUser?.fullName || '---';
        const appraiser =
          f.legacyAppraiserOfficer || f.appraiserUser?.fullName || '---';
        const leader =
          f.legacyBusinessLeader || f.businessLeaderUser?.fullName || '---';
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• Cán bộ liên quan: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: `Đề xuất: ${proposer} | Thẩm định: ${appraiser} | Phê duyệt: ${leader}`,
                size: 20,
              }),
            ],
          }),
        );

        if (f.condition) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Hiện trạng (Condition): ',
                  bold: true,
                  size: 20,
                }),
                new TextRun({ text: f.condition, size: 20 }),
              ],
            }),
          );
        }
        if (f.criteria) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Cơ sở pháp lý / Quy định vi phạm (Criteria): ',
                  bold: true,
                  size: 20,
                }),
                new TextRun({ text: f.criteria, size: 20 }),
              ],
            }),
          );
        }
        if (f.cause) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Nguyên nhân (Cause): ',
                  bold: true,
                  size: 20,
                }),
                new TextRun({ text: f.cause, size: 20 }),
              ],
            }),
          );
        }
        if (f.consequence) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Hậu quả rủi ro (Consequence): ',
                  bold: true,
                  size: 20,
                }),
                new TextRun({ text: f.consequence, size: 20 }),
              ],
            }),
          );
        }

        // Recommendations linked to this specific finding
        const findingRecs = relatedRecs.filter((r) => r.findingId === f.id);
        if (findingRecs.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Kiến nghị khắc phục của Đoàn kiểm toán:',
                  bold: true,
                  size: 20,
                  underline: {},
                }),
              ],
            }),
          );
          findingRecs.forEach((r, rIdx) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `  - Kiến nghị ${rIdx + 1}: `,
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({ text: r.recommendation, size: 20 }),
                  new TextRun({
                    text: ` [Đơn vị: ${r.legacyDepartment || report.auditeeUnit || 'ĐVKD'} | Hạn SLA: ${r.dueDate || 'Chưa xác định'}]`,
                    size: 18,
                    italics: true,
                    color: '666666',
                  }),
                ],
              }),
            );
          });
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ý kiến giải trình từ Đơn vị: ',
                bold: true,
                size: 20,
                italics: true,
              }),
              new TextRun({
                text:
                  f.auditeeResponse ||
                  'Đơn vị đã thống nhất nội dung phát hiện và cam kết hoàn thành khắc phục đúng thời hạn yêu cầu.',
                size: 20,
                italics: true,
              }),
            ],
          }),
        );
        children.push(new Paragraph({ text: '' }));
      });
    }

    // Recommendation Summary Table
    if (relatedRecs.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'V. BẢNG TỔNG HỢP KIẾN NGHỊ VÀ TRẠNG THÁI SLA',
              bold: true,
              size: 24,
              color: '003366',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        }),
      );

      const tableHeader = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'STT', bold: true, size: 20 })],
              }),
            ],
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Nội dung kiến nghị',
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Đơn vị chịu trách nhiệm',
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Hạn SLA', bold: true, size: 20 }),
                ],
              }),
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Trạng thái SLA', bold: true, size: 20 }),
                ],
              }),
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Tự theo dõi', bold: true, size: 20 }),
                ],
              }),
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
        ],
      });

      const tableRows = [
        tableHeader,
        ...relatedRecs.map((r, idx) => {
          const slaLabel =
            r.slaStatus === 'QuaHan'
              ? 'Quá hạn'
              : r.slaStatus === 'GiaHan'
                ? 'Gia hạn'
                : 'Chưa đến hạn';
          const slaColor =
            r.slaStatus === 'QuaHan'
              ? 'FF0000'
              : r.slaStatus === 'GiaHan'
                ? '0000FF'
                : '389E0D';
          return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: String(idx + 1) })],
              }),
              new TableCell({
                children: [new Paragraph({ text: r.recommendation || '' })],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: r.legacyDepartment || auditeeName }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: r.dueDate || 'Chưa xác định' }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: slaLabel,
                        bold: true,
                        color: slaColor,
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: r.selfMonitored
                          ? `Có (${r.selfMonitorFrequency || '6thang'})`
                          : 'Không',
                        size: 18,
                        color: r.selfMonitored ? '003366' : '666666',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
        }),
      ];

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
      );
      children.push(new Paragraph({ text: '' }));
    }

    // Signatures
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'VI. XÁC NHẬN VÀ CHỮ KÝ BAN HÀNH',
            bold: true,
            size: 24,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    const signaturesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'TRƯỞNG ĐOÀN KIỂM TOÁN',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '(Ký và ghi rõ họ tên)',
                      size: 18,
                      italics: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: '' }),
                new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({ text: leadAuditor, bold: true, size: 20 }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'TRƯỞNG BAN KIỂM TOÁN NỘI BỘ',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '(Ký, đóng dấu hoặc ký số CA)',
                      size: 18,
                      italics: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: '' }),
                new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: report.isSigned
                        ? 'ĐÃ KÝ SỐ CA HỢP LỆ ✔'
                        : '....................................................',
                      bold: true,
                      color: report.isSigned ? '389E0D' : '808080',
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    });

    children.push(signaturesTable);

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    return await Packer.toBuffer(doc);
  }

  async generatePdf(report: AuditReport): Promise<Buffer> {
    const eng = report.engagement;
    const { findings, relatedRecs } = await this.getReportContext(report);

    const PDFDocument = (await import('pdfkit')).default;
    const fs = await import('fs');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Setup fonts
      const fontRegularPath = 'C:/Windows/Fonts/arial.ttf';
      const fontBoldPath = 'C:/Windows/Fonts/arialbd.ttf';
      const fontItalicPath = 'C:/Windows/Fonts/ariali.ttf';

      if (fs.existsSync(fontRegularPath)) {
        doc.registerFont('Arial', fontRegularPath);
        doc.registerFont('Arial-Bold', fontBoldPath);
        doc.registerFont('Arial-Italic', fontItalicPath);
        doc.font('Arial');
      }

      // Header with styling
      doc
        .font('Arial-Bold')
        .fontSize(13)
        .fillColor('#003366')
        .text('NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN LỘC PHÁT VIỆT NAM (LPBANK)', {
          align: 'left',
        });
      doc
        .font('Arial-Bold')
        .fontSize(11)
        .fillColor('#333333')
        .text('KHỐI KIỂM TOÁN NỘI BỘ', { align: 'left' });
      doc.moveDown(1.5);

      // Title
      doc
        .font('Arial-Bold')
        .fontSize(20)
        .fillColor('#003366')
        .text('BÁO CÁO KIỂM TOÁN NỘI BỘ', { align: 'center' });
      doc
        .font('Arial-Italic')
        .fontSize(14)
        .fillColor('#444444')
        .text(report.title, { align: 'center' });
      doc.moveDown(1.5);

      const auditeeName =
        report.auditeeUnit ||
        report.branchName ||
        eng?.branchName ||
        report.plan ||
        'Chi nhánh / ĐVKD';
      const reportNumber =
        report.reportNo ||
        (eng?.id ? `${eng.id}/2026/BCKT-IA` : `${report.id}/2026/BCKT-IA`);
      const leadAuditor =
        report.leadAuditorName ||
        eng?.leadAuditorUser?.fullName ||
        report.issuedBy ||
        'Trưởng đoàn kiểm toán';

      // Metadata Info Box
      const boxY = doc.y;
      doc.rect(40, boxY, 515, 90).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#000000').font('Arial').fontSize(10);
      doc.text(
        `Cuộc kiểm toán: ${report.plan || eng?.name || '---'}`,
        50,
        boxY + 10,
      );
      doc.text(`Số báo cáo: ${reportNumber}`, 320, boxY + 10);
      doc.text(`Đơn vị được KT: ${auditeeName}`, 50, boxY + 28);
      doc.text(
        `Quyết định: ${report.decisionNo || eng?.decisionNo || '87/2026/QĐ-IA'}`,
        320,
        boxY + 28,
      );
      doc.text(`Trưởng đoàn: ${leadAuditor}`, 50, boxY + 46);
      doc.text(`Ngày phát hành: ${report.date || '---'}`, 320, boxY + 46);
      doc.text(
        `Trạng thái: ${report.status === 'Issued' ? 'Đã phát hành chính thức' : 'Bản dự thảo'}`,
        50,
        boxY + 64,
      );
      doc.text(
        `Chữ ký số: ${report.isSigned ? 'ĐÃ KÝ SỐ CA ✔' : 'CHƯA KÝ SỐ ✘'}`,
        320,
        boxY + 64,
      );

      doc.y = boxY + 105;

      // Ratings Section
      doc
        .font('Arial-Bold')
        .fontSize(12)
        .fillColor('#003366')
        .text('BẢNG XẾP HẠNG HOẠT ĐỘNG KIỂM SOÁT NỘI BỘ VÀ MA TRẬN ĐVKD:');
      doc.moveDown(0.4);
      doc.font('Arial').fontSize(10).fillColor('#000000');
      doc.text(
        `1. Nghiệp vụ Tín dụng KHCN: ${report.branchRatingCreditPersonal || 'Đạt yêu cầu'}`,
      );
      doc.text(
        `2. Nghiệp vụ Tín dụng KHDN: ${report.branchRatingCreditCorporate || 'Đạt yêu cầu'}`,
      );
      doc.text(
        `3. Nghiệp vụ Phi tín dụng & Quản lý quỹ: ${report.branchRatingNonCredit || 'Đạt yêu cầu'}`,
      );
      doc.text(
        `4. Nghiệp vụ Quản lý PGDBĐ: ${report.branchRatingPgdbd || 'Đạt yêu cầu'}`,
      );
      doc
        .font('Arial-Bold')
        .text(
          `★ XẾP HẠNG TỔNG THỂ CHI NHÁNH: ${report.branchOverallRating || report.auditRating || 'Đạt yêu cầu'}`,
        );
      doc.moveDown(1.2);

      // Scope
      doc
        .font('Arial-Bold')
        .fontSize(12)
        .fillColor('#003366')
        .text('I. PHẠM VI & PHƯƠNG PHÁP KIỂM TOÁN');
      doc
        .font('Arial')
        .fontSize(10)
        .fillColor('#000000')
        .text(
          report.scope ||
            'Kiểm toán toàn diện các mặt hoạt động tín dụng, phi tín dụng, ngân quỹ và quản lý vận hành.',
          { align: 'justify' },
        );
      doc.moveDown(1);

      // Summary
      doc
        .font('Arial-Bold')
        .fontSize(12)
        .fillColor('#003366')
        .text('II. TÓM TẮT KẾT QUẢ VÀ KẾT LUẬN');
      doc
        .font('Arial')
        .fontSize(10)
        .fillColor('#000000')
        .text(
          report.executiveSummary ||
            'Đoàn kiểm toán đã hoàn tất việc rà soát và đánh giá các quy trình/hoạt động thuộc phạm vi kiểm toán.',
          { align: 'justify' },
        );
      if (report.overallConclusion) {
        doc.moveDown(0.5);
        doc
          .font('Arial-Bold')
          .text('Kết luận chung: ', { continued: true })
          .font('Arial')
          .text(report.overallConclusion, { align: 'justify' });
      }
      doc.moveDown(1.2);

      // Findings
      if (findings.length > 0) {
        doc
          .font('Arial-Bold')
          .fontSize(12)
          .fillColor('#003366')
          .text(
            `III. CHI TIẾT CÁC PHÁT HIỆN KIỂM TOÁN (${findings.length} phát hiện)`,
          );
        doc.moveDown(0.5);

        findings.forEach((f, i) => {
          if (doc.y > 680) doc.addPage();

          doc
            .font('Arial-Bold')
            .fontSize(11)
            .fillColor('#003366')
            .text(
              `Phát hiện ${i + 1}: [${f.findingCode || `FD-${f.id}`}] ${f.findingTitle}`,
            );
          doc.font('Arial').fontSize(9).fillColor('#000000');

          const fine = f.actualFineAmount
            ? `${f.actualFineAmount.toLocaleString('vi-VN')} VND`
            : '0 VND';
          const proposer =
            f.legacyProposerOfficer || f.proposerUser?.fullName || '---';
          const appraiser =
            f.legacyAppraiserOfficer || f.appraiserUser?.fullName || '---';
          const leader =
            f.legacyBusinessLeader || f.businessLeaderUser?.fullName || '---';

          doc.text(
            `Mức độ rủi ro: ${f.riskLevel || 'Medium'} | Nghiệp vụ: ${f.operationType || 'Tín dụng'} | CIF/KH: ${f.customerName || f.cifOrAccount || '---'}`,
          );
          doc.text(
            `Mã lỗi nội bộ: ${f.legacyInternalDefectCode || f.internalDefectCodeEntity?.code || 'Chưa mã hóa'} | Mã NĐ340: ${f.legacyNd340DefectCode || f.nd340DefectCodeEntity?.code || '---'} | Mã Nhân sự: ${f.legacyNhanSuDefectCode || f.nhanSuDefectCodeEntity?.code || '---'}`,
          );
          doc.text(
            `Số tiền phạt dự kiến: ${fine} | Cán bộ: Đề xuất (${proposer}), Thẩm định (${appraiser}), Phê duyệt (${leader})`,
          );
          doc.text(`Hiện trạng: ${f.condition || '---'}`, { align: 'justify' });
          if (f.criteria)
            doc.text(`Cơ sở pháp lý: ${f.criteria}`, { align: 'justify' });
          if (f.cause)
            doc.text(`Nguyên nhân: ${f.cause}`, { align: 'justify' });
          if (f.consequence)
            doc.text(`Hậu quả: ${f.consequence}`, { align: 'justify' });
          doc.text(`Khuyến nghị: ${f.recommendation || '---'}`, {
            align: 'justify',
          });
          doc.text(
            `Giải trình ĐVKD: ${f.auditeeResponse || 'Đơn vị thống nhất nội dung sai phạm và cam kết khắc phục.'}`,
            { align: 'justify', oblique: true },
          );
          doc.moveDown(0.8);
        });
      }

      // Recommendations Summary Table
      if (relatedRecs.length > 0) {
        if (doc.y > 650) doc.addPage();
        doc
          .font('Arial-Bold')
          .fontSize(12)
          .fillColor('#003366')
          .text('IV. BẢNG TỔNG HỢP KIẾN NGHỊ VÀ THEO DÕI SLA');
        doc.moveDown(0.4);
        doc.font('Arial').fontSize(9).fillColor('#000000');
        relatedRecs.forEach((r, idx) => {
          doc.text(
            `${idx + 1}. ${r.recommendation} [Đơn vị: ${r.legacyDepartment || auditeeName} | Hạn: ${r.dueDate || 'Chưa xác định'} | SLA: ${r.slaStatus || 'Chưa đến hạn'}]`,
          );
        });
        doc.moveDown(1.5);
      }

      // Signatures
      if (doc.y > 680) doc.addPage();
      const sigY = doc.y;
      doc
        .font('Arial-Bold')
        .fontSize(11)
        .text('TRƯỞNG ĐOÀN KIỂM TOÁN', 80, sigY);
      doc.text('TRƯỞNG BAN KIỂM TOÁN NỘI BỘ', 340, sigY);
      doc
        .font('Arial-Italic')
        .fontSize(9)
        .text('(Ký và ghi rõ họ tên)', 100, sigY + 15);
      doc.text('(Ký, đóng dấu / Ký số)', 370, sigY + 15);

      doc
        .font('Arial-Bold')
        .fontSize(10)
        .text(leadAuditor, 80, sigY + 65);
      doc
        .font('Arial')
        .fontSize(9)
        .text(report.isSigned ? 'ĐÃ KÝ SỐ CA ✔' : '...', 350, sigY + 65);

      doc.end();
    });
  }

  private async getReportContext(report: AuditReport): Promise<{
    findings: AuditFinding[];
    relatedRecs: Recommendation[];
  }> {
    const findings = report.engagementId
      ? await this.findingRepo.find({
          where: { engagementId: report.engagementId },
          relations: [
            'internalDefectCodeEntity',
            'nd340DefectCodeEntity',
            'nhanSuDefectCodeEntity',
            'proposerUser',
            'appraiserUser',
            'businessLeaderUser',
            'personnel',
          ],
          order: { id: 'ASC' },
        })
      : [];

    const allRecs = await this.recRepo.find();
    const relatedRecs = allRecs.filter(
      (r) => r.findingId && findings.some((f) => f.id === r.findingId),
    );

    if (
      report.recommendationsList &&
      Array.isArray(report.recommendationsList)
    ) {
      report.recommendationsList.forEach((r: any, idx: number) => {
        if (
          !relatedRecs.some(
            (existing) =>
              existing.recommendation === (r.content || r.recommendation) ||
              existing.id === r.id,
          )
        ) {
          relatedRecs.push({
            id: r.id || -(idx + 1),
            recommendation: r.content || r.recommendation || '',
            legacyDepartment:
              r.responsibleParty ||
              r.legacyDepartment ||
              report.auditeeUnit ||
              report.branchName ||
              'Chi nhánh / ĐVKD',
            dueDate: r.deadline || r.dueDate || '30 ngày kể từ ngày ban hành',
            slaStatus:
              r.status === 'Closed'
                ? 'ChuaDenHan'
                : r.slaStatus || 'ChuaDenHan',
            selfMonitored: true,
            selfMonitorFrequency: '6thang',
          } as any);
        }
      });
    }

    return { findings, relatedRecs };
  }
}
