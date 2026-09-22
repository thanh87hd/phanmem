import { Injectable, Logger } from '@nestjs/common';
import { KriAlertsService } from '../risk-indicators/kri-alerts.service';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';

@Injectable()
export class KriService {
  private readonly logger = new Logger(KriService.name);

  constructor(private readonly kriAlertsService: KriAlertsService) {}

  createKriAlert(dto: any): Promise<KriAlert> {
    return this.kriAlertsService.createKriAlert(dto);
  }

  createKriBulk(dtoList: any[]): Promise<KriAlert[]> {
    return this.kriAlertsService.createKriBulk(dtoList);
  }

  findAllKriAlerts(): Promise<KriAlert[]> {
    return this.kriAlertsService.findAllKriAlerts();
  }

  findActiveKriAlerts(): Promise<KriAlert[]> {
    return this.kriAlertsService.findActiveKriAlerts();
  }

  uploadKriBulkFiles(
    files: any[],
    metadata: {
      reportMonth?: number;
      reportYear?: number;
      auditUniverseId?: number;
      departmentCode?: string;
    },
  ) {
    return this.kriAlertsService.uploadKriBulkFiles(files, metadata);
  }

  uploadKriPerFile(files: any[], filesMetadataRaw: string) {
    return this.kriAlertsService.uploadKriPerFile(files, filesMetadataRaw);
  }

  parseKriFile(file: any): Promise<any[]> {
    return this.kriAlertsService.parseKriFile(file);
  }

  getKriPeriodReport(filters: {
    year?: number;
    fromMonth?: number;
    toMonth?: number;
    auditUniverseId?: number;
    departmentCode?: string;
  }) {
    return this.kriAlertsService.getKriPeriodReport(filters);
  }

  compareKriPeriods(
    period1: { year: number; month: number },
    period2: { year: number; month: number },
    filters?: {
      auditUniverseId?: number;
      departmentCode?: string;
    },
  ) {
    return this.kriAlertsService.compareKriPeriods(period1, period2, filters);
  }

  getKriBatches() {
    return this.kriAlertsService.getKriBatches();
  }

  getKriOptions() {
    return this.kriAlertsService.getKriOptions();
  }
}
