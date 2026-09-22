import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { DefectCode, DefectDimension } from '../entities/defect-code.entity';
import { DefectCodeChangeLog } from '../entities/defect-code-changelog.entity';
import { getExcelCellString } from '../../common/utils/excel.util';

@Injectable()
export class DefectClassifierService {
  private readonly logger = new Logger(DefectClassifierService.name);

  constructor(
    @InjectRepository(DefectCode)
    private readonly defectCodeRepo: Repository<DefectCode>,
    @InjectRepository(DefectCodeChangeLog)
    private readonly defectCodeChangeLogRepo: Repository<DefectCodeChangeLog>,
  ) {}

  async exportDefectCodes(): Promise<Buffer> {
    const codes = await this.defectCodeRepo.find({
      order: { dimension: 'ASC', code: 'ASC' },
    });

    const data = codes.map((c) => ({
      'Phân loại (Dimension)': c.dimension,
      'Phiên bản (Version)': c.version,
      'Mã Lỗi (L3 Code)': c.code,
      'Mô tả chi tiết': c.description,
      'Mã L2': c.l2Code,
      'Mô tả L2': c.l2Desc,
      'Mã L1': c.l1Code,
      'Mô tả L1': c.l1Desc,
      'Mức rủi ro': c.riskLevel || '',
      'Phạt TB (NĐ340)': c.avgFine || '',
      'Phạt Tối đa (NĐ340)': c.maxFine || '',
      'Trạng thái': c.isActive ? 'Active' : 'Inactive',
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
      data.forEach((item) => ws.addRow(item));
    }
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async issueNewDefectCode(dto: any, username: string) {
    const {
      dimension,
      l1Code,
      l2Code,
      description,
      riskLevel,
      reason,
      parentL3Code,
    } = dto;
    if (!l1Code || !l2Code || !description || !reason) {
      throw new Error(
        'Thiếu thông tin bắt buộc (l1Code, l2Code, description, reason).',
      );
    }

    const currentVersionCount = await this.defectCodeChangeLogRepo.count();
    const newVersion = `1.${currentVersionCount + 1}`;

    const siblings = await this.defectCodeRepo.find({
      where: { dimension: dimension as DefectDimension, l2Code },
    });

    let newL3Code = '';

    if (parentL3Code) {
      const variantRegex = new RegExp(`^${parentL3Code}([a-z])$`);
      let maxVariantCharCode = 96;
      for (const sibling of siblings) {
        const match = sibling.code.match(variantRegex);
        if (match) {
          const charCode = match[1].charCodeAt(0);
          if (charCode > maxVariantCharCode) maxVariantCharCode = charCode;
        }
      }
      newL3Code = `${parentL3Code}${String.fromCharCode(maxVariantCharCode + 1)}`;
    } else {
      const numRegex = /K(\d+)[a-z]*$/;
      let maxNum = 0;
      for (const sibling of siblings) {
        const match = sibling.code.match(numRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = (maxNum + 1).toString().padStart(2, '0');
      newL3Code = `${l2Code}K${nextNum}`;
    }

    const l2Record = siblings.find((s) => s.l2Code === l2Code);

    const newCode = this.defectCodeRepo.create({
      dimension: dimension as DefectDimension,
      l1Code,
      l1Desc: l2Record?.l1Desc || '',
      l2Code,
      l2Desc: l2Record?.l2Desc || '',
      code: newL3Code,
      description,
      riskLevel: riskLevel || 0,
      version: newVersion,
      isActive: true,
    });
    await this.defectCodeRepo.save(newCode);

    const changeLog = this.defectCodeChangeLogRepo.create({
      version: newVersion,
      reason,
      affectedCategories: `${dimension} - ${l2Code}`,
      createdBy: username,
      generatedCodes: JSON.stringify([newL3Code]),
    });
    await this.defectCodeChangeLogRepo.save(changeLog);

    return {
      success: true,
      newCode: newL3Code,
      version: newVersion,
    };
  }
}
