import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsResult } from './entities/analytics-result.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsResult)
    private readonly resultRepo: Repository<AnalyticsResult>,
  ) {}

  async executeScript(type: string, file?: any) {
    let data: any[] = [];
    let message = '';
    let parsedRows: any[] = [];

    if (file) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(file.path);
        const sheetName = workbook.worksheets[0]?.name || '';
        parsedRows = [];
        const ws = workbook.getWorksheet(sheetName);
        if (ws) {
          let headers: string[] = [];
          ws.eachRow((row, rIdx) => {
            const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
            if (rIdx === 1) {
              headers = vals.map((v) =>
                v !== null && v !== undefined ? (v as any).toString() : '',
              );
            } else {
              const obj: any = {};
              headers.forEach((h, i) => (obj[h] = vals[i]));
              parsedRows.push(obj);
            }
          });
        }
      } catch (err) {
        throw new BadRequestException(
          'Không thể đọc file. Vui lòng đảm bảo định dạng Excel/CSV hợp lệ.',
        );
      }
    }

    if (!parsedRows || parsedRows.length === 0) {
      throw new BadRequestException('File dữ liệu trống hoặc không hợp lệ.');
    }

    // Hàm hỗ trợ tự động tìm cột số tiền
    const findAmountColumn = (row: any) => {
      const keys = Object.keys(row);
      const keywords = [
        'amount',
        'tien',
        'tiền',
        'sotien',
        'giatri',
        'value',
        'balance',
        'số dư',
      ];
      for (const k of keys) {
        const lowerK = k.toLowerCase();
        if (keywords.some((kw) => lowerK.includes(kw))) {
          return k;
        }
      }
      // Nếu không tìm thấy bằng từ khóa, lấy cột số đầu tiên
      for (const k of keys) {
        if (typeof row[k] === 'number') return k;
      }
      return null;
    };

    if (type === 'duplicates') {
      const duplicatesMap = new Map<string, any[]>();

      parsedRows.forEach((row) => {
        // Tạo chữ ký dòng (bỏ qua các ID tự tăng để tránh sai sót)
        const signatureObj = { ...row };
        delete signatureObj['id'];
        delete signatureObj['STT'];
        delete signatureObj['stt'];
        delete signatureObj['No'];
        const signature = JSON.stringify(signatureObj);

        if (!duplicatesMap.has(signature)) {
          duplicatesMap.set(signature, []);
        }
        duplicatesMap.get(signature)!.push(row);
      });

      const dups = Array.from(duplicatesMap.values()).filter(
        (group) => group.length > 1,
      );

      dups.forEach((group) => {
        group.forEach((r) => {
          data.push({ ...r, issue: `Trùng lặp ${group.length} lần` });
        });
      });

      if (data.length > 0) {
        message = `Tìm thấy ${data.length} dòng giao dịch có dấu hiệu trùng lặp hoàn toàn trên tổng số ${parsedRows.length} dòng.`;
      } else {
        message = `Không tìm thấy giao dịch trùng lặp nào trong ${parsedRows.length} dòng dữ liệu.`;
      }
    } else if (type === 'benford') {
      const amountCol = findAmountColumn(parsedRows[0] || {});
      if (!amountCol) {
        throw new BadRequestException(
          'Không tìm thấy cột chứa dữ liệu Số tiền để phân tích Định luật Benford.',
        );
      }

      const digitCounts: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
      };
      let validCount = 0;

      parsedRows.forEach((row) => {
        const val = row[amountCol];
        if (val) {
          const match = String(val).match(/[1-9]/); // Chữ số khác 0 đầu tiên
          if (match) {
            digitCounts[Number(match[0])]++;
            validCount++;
          }
        }
      });

      if (validCount === 0) {
        throw new BadRequestException(
          'Cột số tiền không chứa dữ liệu hợp lệ để phân tích.',
        );
      }

      const benfordExpected: Record<number, number> = {
        1: 30.1,
        2: 17.6,
        3: 12.5,
        4: 9.7,
        5: 7.9,
        6: 6.7,
        7: 5.8,
        8: 5.1,
        9: 4.6,
      };

      for (let i = 1; i <= 9; i++) {
        const actualRate = (digitCounts[i] / validCount) * 100;
        const expectedRate = benfordExpected[i];
        const diff = Math.abs(actualRate - expectedRate);
        // Ngưỡng bất thường là sai lệch tuyệt đối > 5%
        const status = diff > 5.0 ? 'Bất thường' : 'Bình thường';

        data.push({
          digit: i,
          expectedRate: expectedRate.toFixed(1) + '%',
          actualRate: actualRate.toFixed(1) + '%',
          difference: diff.toFixed(1) + '%',
          status: status,
        });
      }

      const anomalies = data.filter((d) => d.status === 'Bất thường').length;
      if (anomalies > 0) {
        message = `Phát hiện ${anomalies} chữ số có tần suất lệch chuẩn so với định luật Benford (cột phân tích: "${amountCol}").`;
      } else {
        message = `Phân phối chữ số hoàn toàn khớp với định luật Benford (cột phân tích: "${amountCol}"). Không phát hiện bất thường.`;
      }
    } else {
      message = `Kịch bản phân tích chạy thành công, quét ${parsedRows.length} dòng dữ liệu.`;
      data = parsedRows.slice(0, 10); // Lấy mẫu 10 dòng đầu
    }

    // Lưu kết quả vào DB
    const result = this.resultRepo.create({
      scenarioType: type,
      message,
      data,
    });
    await this.resultRepo.save(result);

    return {
      success: true,
      message,
      data,
      resultId: result.id,
    };
  }

  async getHistory() {
    return this.resultRepo.find({ order: { executedAt: 'DESC' } });
  }
}
