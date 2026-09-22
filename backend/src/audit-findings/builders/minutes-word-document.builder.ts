import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from 'docx';
import { MinutesExportContext } from './minutes-export.types';

export class MinutesWordDocumentBuilder {
  static async build(ctx: MinutesExportContext): Promise<Buffer> {
    const { minute, engagement, mode } = ctx;
    const { findings, samples } = ctx;

    const ptdSamples = samples.filter(
      (s) =>
        s.operationType === 'PTD' ||
        s.businessProcess?.includes('quỹ') ||
        s.businessProcess?.includes('PGDBĐ') ||
        s.damagedAcqtSeries ||
        s.userCrossEnv,
    );
    const creditSamples = samples.filter(
      (s) => s.operationType === 'TD' || (s.loanAmount && s.loanAmount > 0),
    );
    const postalSamples = samples.filter(
      (s) =>
        s.postalAgencyCode ||
        s.reconciliationCashDiff ||
        s.reportDelayDays ||
        s.operationType === 'TKBĐ',
    );

    const children: any[] = [];

    // 1. Header Quốc hiệu & Tiêu ngữ
    const isPostal =
      mode === 'MB04_PGDBD' || engagement?.auditCategory === 'PGDBD_TKBD';
    const docTitle =
      mode === 'MB04_CHI_TIET'
        ? 'BIÊN BẢN KIỂM TOÁN CHI TIẾT'
        : mode === 'MB04_TONG_HOP'
          ? 'BIÊN BẢN KIỂM TOÁN TỔNG HỢP\nV/v: Thông qua kết quả kiểm toán tại đơn vị (Họp Exit Meeting)'
          : mode === 'MB04_TD'
            ? 'BIÊN BẢN TỔNG HỢP KẾT QUẢ KIỂM TOÁN\nNGHIỆP VỤ TÍN DỤNG'
            : mode === 'MB04_PTD'
              ? 'BIÊN BẢN TỔNG HỢP KẾT QUẢ KIỂM TOÁN\nNGHIỆP VỤ PHI TÍN DỤNG VÀ QUẢN LÝ PGDBĐ'
              : mode === 'MB04_PGDBD'
                ? 'BIÊN BẢN KIỂM TOÁN\nV/v: Xác nhận nội dung kiểm toán nghiệp vụ cung cấp dịch vụ ngân hàng tại BPGDBĐ'
                : 'BIÊN BẢN KIỂM TOÁN TỔNG HỢP';

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'KHỐI KIỂM TOÁN NỘI BỘ',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Đoàn kiểm toán',
                      italics: true,
                      size: 19,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Số: ${minute.minuteNo || '01/2026/BBKT/ĐKT'}`,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Độc lập - Tự do - Hạnh phúc',
                      bold: true,
                      size: 19,
                      underline: {},
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Ngày ${minute.issueDate || new Date().toISOString().split('T')[0]}`,
                      italics: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(headerTable);
    children.push(new Paragraph({ text: '' }));

    // 2. Tiêu đề Biên bản
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: docTitle,
            bold: true,
            size: 26,
            color: '003366',
          }),
        ],
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Tại: ${minute.auditedUnitName || minute.title || engagement?.branchName || 'Đơn vị kinh doanh'}`,
            bold: true,
            italics: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Phần I: Căn cứ pháp lý & Thông tin đoàn
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'I. CĂN CỨ THỰC HIỆN & THÀNH PHẦN LÀM VIỆC',
            bold: true,
            size: 22,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `- Căn cứ Quyết định số: ${minute.decisionNumber || engagement?.decisionNo || '...'} của Ban Tổng Giám đốc / Khối Kiểm toán nội bộ về việc thành lập Đoàn kiểm toán.`,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `- Thời gian kiểm toán thực địa: ${minute.fieldworkPeriod || 'Theo kế hoạch đã phê duyệt'}.`,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `- Đơn vị được kiểm toán: ${minute.auditedUnitName || engagement?.branchName || 'Đơn vị kinh doanh'}.`,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Bảng thành viên đoàn kiểm toán
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '1. Thành phần Đoàn kiểm toán:',
            bold: true,
            size: 20,
          }),
        ],
      }),
    );

    const teamRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'STT', bold: true, size: 18 })],
              }),
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Họ và tên', bold: true, size: 18 }),
                ],
              }),
            ],
            width: { size: 40, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Chức danh trong đoàn',
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ];

    teamRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '1' })] }),
          new TableCell({
            children: [
              new Paragraph({
                text:
                  minute.leadAuditorName ||
                  engagement?.legacyLeadAuditor ||
                  'Trưởng đoàn',
              }),
            ],
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Trưởng đoàn kiểm toán' })],
          }),
        ],
      }),
    );

    if (engagement?.teamMembers && Array.isArray(engagement.teamMembers)) {
      engagement.teamMembers.forEach((m, idx) => {
        if (m.fullName && m.fullName !== minute.leadAuditorName) {
          teamRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: (idx + 2).toString() })],
                }),
                new TableCell({
                  children: [new Paragraph({ text: m.fullName })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: m.role || 'Thành viên đoàn - KTV' }),
                  ],
                }),
              ],
            }),
          );
        }
      });
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: teamRows,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Đánh giá và xếp hạng chất lượng KSNB
    const highRiskCount = findings.filter(
      (f) => f.riskLevel === 'High' || f.riskLevel === 'Cao',
    ).length;
    const medRiskCount = findings.filter(
      (f) => f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình',
    ).length;
    const lowRiskCount = findings.filter(
      (f) => f.riskLevel === 'Low' || f.riskLevel === 'Thấp',
    ).length;

    const overallRating =
      highRiskCount >= 3 || findings.length >= 10
        ? 'KHÔNG ĐẠT (Unsatisfactory)'
        : highRiskCount > 0 || medRiskCount >= 4 || findings.length >= 5
          ? 'CẦN CẢI THIỆN (Needs Improvement)'
          : 'ĐẠT (Satisfactory)';

    // Đại diện đơn vị (nếu là cuộc họp Exit Meeting)
    if (mode === 'MB04_TONG_HOP' || minute.meetingLocation) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '2. Đại diện Đơn vị được kiểm toán (Thành phần họp Exit Meeting):',
              bold: true,
              size: 20,
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `- Địa điểm họp: ${minute.meetingLocation || 'Trụ sở Đơn vị được kiểm toán'}.`,
            }),
          ],
        }),
      );
      const repLines = (
        minute.unitRepresentativesText ||
        '1. Giám đốc ĐVKD\n2. Kế toán trưởng\n3. Trưởng các phòng ban nghiệp vụ'
      )
        .split('\n')
        .filter((l: string) => l.trim().length > 0);
      repLines.forEach((line: string) => {
        children.push(new Paragraph({ text: line }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    // Bảng đánh giá và xếp hạng KSNB
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'II. ĐÁNH GIÁ VÀ XẾP HẠNG HỆ THỐNG KIỂM SOÁT NỘI BỘ (KSNB)',
            bold: true,
            size: 22,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `- Tổng số phát hiện ghi nhận: ${findings.length} (Rủi ro Cao: ${highRiskCount}, Rủi ro Trung bình: ${medRiskCount}, Rủi ro Thấp: ${lowRiskCount}).`,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `- Kết quả xếp hạng chất lượng: `,
          }),
          new TextRun({
            text: overallRating,
            bold: true,
            color: overallRating.includes('KHÔNG ĐẠT')
              ? 'CC0000'
              : overallRating.includes('CẢI THIỆN')
                ? 'D97706'
                : '008000',
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Phần III: Bảng 1 - Tổng hợp kết quả kiểm toán
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'III. BẢNG 1: MA TRẬN TỔNG HỢP PHÁT HIỆN KIỂM TOÁN CHI TIẾT',
            bold: true,
            size: 22,
          }),
        ],
      }),
    );

    const findingRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'STT', bold: true, size: 17 })],
              }),
            ],
            width: { size: 4, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Mã phát hiện', bold: true, size: 17 }),
                ],
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
                    text: 'Mã lỗi 3 chiều\n(Nội bộ / 340 / NS)',
                    bold: true,
                    size: 17,
                  }),
                ],
              }),
            ],
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Nội dung phát hiện / Sai sót',
                    bold: true,
                    size: 17,
                  }),
                ],
              }),
            ],
            width: { size: 24, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Số tiền phạt\ndự kiến',
                    bold: true,
                    size: 17,
                  }),
                ],
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
                    text: 'Cán bộ liên quan\n(ĐX/TĐ/Duyệt)',
                    bold: true,
                    size: 17,
                  }),
                ],
              }),
            ],
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Rủi ro', bold: true, size: 17 }),
                ],
              }),
            ],
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Kiến nghị xử lý',
                    bold: true,
                    size: 17,
                  }),
                ],
              }),
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'E6E6E6' },
          }),
        ],
      }),
    ];

    findings.forEach((f, idx) => {
      const internalCode =
        f.legacyInternalDefectCode || f.internalDefectCodeEntity?.code || '---';
      const nd340Code =
        f.legacyNd340DefectCode || f.nd340DefectCodeEntity?.code || '---';
      const nhanSuCode =
        f.legacyNhanSuDefectCode || f.nhanSuDefectCodeEntity?.code || '---';
      const fineStr = f.actualFineAmount
        ? `${f.actualFineAmount.toLocaleString('vi-VN')} đ`
        : '0 đ';
      const proposer =
        f.legacyProposerOfficer || f.proposerUser?.fullName || '---';
      const appraiser =
        f.legacyAppraiserOfficer || f.appraiserUser?.fullName || '---';
      const leader =
        f.legacyBusinessLeader || f.businessLeaderUser?.fullName || '---';

      findingRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: (idx + 1).toString(), size: 16 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: f.findingCode || `FD-${f.id}`,
                      bold: true,
                      size: 16,
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
                      text: `NB: ${internalCode}`,
                      bold: true,
                      size: 16,
                      color: '003366',
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `340: ${nd340Code}`, size: 15 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `NS: ${nhanSuCode}`, size: 15 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: f.findingTitle || '',
                      bold: true,
                      size: 16,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: f.condition ? `Hiện trạng: ${f.condition}` : '',
                      size: 15,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: f.criteria ? `Căn cứ: ${f.criteria}` : '',
                      italics: true,
                      size: 14,
                      color: '555555',
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
                      text: fineStr,
                      size: 16,
                      bold: !!f.actualFineAmount,
                      color: f.actualFineAmount ? 'FF0000' : '000000',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `ĐX: ${proposer}`, size: 15 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `TĐ: ${appraiser}`, size: 15 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Duyệt: ${leader}`, size: 15 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: f.riskLevel || 'Trung bình',
                      size: 16,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: f.recommendation || '', size: 15 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: findingRows,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Phần III: Phụ lục 5A - Chi tiết sai sót theo từng mảng nghiệp vụ
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PHỤ LỤC 5A: CHI TIẾT CÁC SAI SÓT, TỒN TẠI THEO TỪNG MẢNG NGHIỆP VỤ',
            bold: true,
            size: 22,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );

    if (ptdSamples.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '1. Mảng nghiệp vụ Phi Tín dụng & Vận hành kho quỹ:',
              bold: true,
              size: 20,
            }),
          ],
        }),
      );

      const ptdRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'STT', bold: true, size: 18 }),
                  ],
                }),
              ],
              width: { size: 5, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Đơn vị / Chi nhánh',
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Nghiệp vụ', bold: true, size: 18 }),
                  ],
                }),
              ],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Nội dung sai sót chi tiết',
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Số lượng sai sót',
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Mức rủi ro', bold: true, size: 18 }),
                  ],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      ptdSamples.forEach((s, idx) => {
        ptdRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: (idx + 1).toString() })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: s.branchCode || s.managingBranchName || '',
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: s.businessProcess || 'Phi tín dụng' }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: s.condition || s.detailedRisk || '' }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ text: s.errorCountText || '1' })],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: s.residualRisk || 'Trung bình' }),
                ],
              }),
            ],
          }),
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: ptdRows,
        }),
      );
      children.push(new Paragraph({ text: '' }));
    }

    if (creditSamples.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '2. Mảng nghiệp vụ Tín dụng & Hồ sơ vay vốn:',
              bold: true,
              size: 20,
            }),
          ],
        }),
      );

      const creditRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'STT', bold: true, size: 18 }),
                  ],
                }),
              ],
              width: { size: 5, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Mã CIF / Tên KH',
                      bold: true,
                      size: 18,
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
                    new TextRun({ text: 'Dư nợ (tỷ)', bold: true, size: 18 }),
                  ],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Nội dung sai sót',
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
              width: { size: 35, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Rủi ro còn lại',
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      creditSamples.forEach((s, idx) => {
        creditRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: (idx + 1).toString() })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: `${s.cifOrAccount || ''} - ${s.customerName || ''}`,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: s.loanAmount ? s.loanAmount.toString() : '-',
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text:
                      s.postExplanationNote ||
                      s.preExplanationNote ||
                      s.detailedRisk ||
                      '',
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: s.residualRisk || 'Trung bình' }),
                ],
              }),
            ],
          }),
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: creditRows,
        }),
      );
      children.push(new Paragraph({ text: '' }));
    }

    // Phần IV: Phụ lục 5B - Bảng tổng hợp cá nhân liên quan
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PHỤ LỤC 5B: BẢNG TỔNG HỢP CÁ NHÂN LIÊN QUAN ĐẾN CÁC PHÁT HIỆN KIỂM TOÁN',
            bold: true,
            size: 22,
            color: '003366',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );

    const personnelRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'STT', bold: true, size: 18 })],
              }),
            ],
            width: { size: 5, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Họ và tên cán bộ',
                    bold: true,
                    size: 18,
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
                  new TextRun({ text: 'Mã phát hiện', bold: true, size: 18 }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Vai trò / Trách nhiệm',
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Ký xác nhận', bold: true, size: 18 }),
                ],
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ];

    let pIdx = 1;
    findings.forEach((f) => {
      if (f.personnel && f.personnel.length > 0) {
        f.personnel.forEach((p) => {
          personnelRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: pIdx.toString() })],
                }),
                new TableCell({
                  children: [new Paragraph({ text: p.fullName || '' })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: f.findingCode || `FD-${f.id}` }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: `${p.responsibilityLevel || ''} - ${p.violationRole || ''}`,
                    }),
                  ],
                }),
                new TableCell({ children: [new Paragraph({ text: '' })] }),
              ],
            }),
          );
          pIdx++;
        });
      }
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: personnelRows,
      }),
    );
    // Ý kiến giải trình và Cam kết của Đơn vị được kiểm toán
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'IV. Ý KIẾN CỦA ĐƠN VỊ ĐƯỢC KIỂM TOÁN VÀ CAM KẾT KHẮC PHỤC',
            bold: true,
            size: 22,
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
            text: '1. Ý kiến của Ban Lãnh đạo Đơn vị được kiểm toán:',
            bold: true,
            size: 20,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              minute.auditeeFeedback ||
              'Đơn vị đã rà soát và cơ bản nhất trí với các tồn tại được Đoàn Kiểm toán nội bộ chỉ ra trong Biên bản. Chi nhánh đã chỉ đạo các phòng ban nghiệp vụ liên quan kiểm tra, khắc phục ngay các sai sót hồ sơ chứng từ.',
            italics: true,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '2. Cam kết thời hạn khắc phục chỉnh sửa:',
            bold: true,
            size: 20,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              minute.commitmentNotes ||
              'Chi nhánh cam kết phân công các cán bộ chịu trách nhiệm trực tiếp và liên đới khẩn trương khắc phục triệt để các tồn tại, báo cáo tiến độ và gửi hồ sơ chứng minh về Khối KTNB theo đúng thời hạn quy định.',
            italics: true,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Chữ ký xác nhận
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'ĐẠI DIỆN ĐƠN VỊ ĐƯỢC KIỂM TOÁN',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '(Ký, ghi rõ họ tên và đóng dấu)',
                      italics: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: '\n\n\n\n' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: minute.auditedUnitName || 'Giám đốc ĐVKD',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
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
                      italics: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: '\n\n\n\n' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: minute.leadAuditorName || 'Trưởng đoàn',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(signatureTable);

    const doc = new Document({
      sections: [{ children }],
    });

    return Packer.toBuffer(doc);
  }
}
