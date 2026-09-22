import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Param,
  UseGuards,
  Res,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { SystemManagementService } from './system-management.service';
import { SecurityConfigService } from './security-config.service';
import { IntegrationService } from './integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import * as fs from 'fs';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';
import * as express from 'express';

@Controller('system-management')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(Action.Manage, 'SystemManagement'))
export class SystemManagementController {
  constructor(
    private readonly systemService: SystemManagementService,
    private readonly securityConfigService: SecurityConfigService,
    private readonly integrationService: IntegrationService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Get('log-stats')
  async getLogStats() {
    return this.systemService.getLogStats();
  }

  // ==================== BACKUP ====================

  @Post('backup')
  async createBackup(@CurrentUser() user: JwtPayload) {
    const result = await this.systemService.createBackup(
      user.userId,
      user.username,
    );
    return { message: 'Đã tạo bản sao lưu thành công', ...result };
  }

  @Get('backups')
  async getBackups() {
    return this.systemService.getBackupList();
  }

  @Get('backup-stats')
  async getBackupStats() {
    return this.systemService.getBackupStats();
  }

  // ==================== DOWNLOAD ====================

  @Get('backups/download')
  async downloadBackup(@Query('fileName') fileName: string, @Res() res: any) {
    const filePath = this.systemService.getBackupFilePath(fileName);
    return res
      .type('application/sql')
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      )
      .send(fs.createReadStream(filePath));
  }

  // ==================== UPLOAD ====================

  @Post('backups/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    }),
  )
  async uploadBackup(
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.systemService.uploadBackup(
      file,
      user.userId,
      user.username,
    );
    return { message: 'Đã upload file backup thành công', ...result };
  }

  // ==================== RESTORE ====================

  @Post('backups/restore')
  async restoreBackup(
    @Body() body: { fileName: string; adminPassword: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.systemService.restoreBackup(
      body.fileName,
      body.adminPassword,
      user.userId,
      user.username,
    );
  }

  // ==================== DELETE ====================

  @Delete('backups/:fileName')
  async deleteBackup(
    @Param('fileName') fileName: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.systemService.deleteBackup(
      fileName,
      user.userId,
      user.username,
    );
  }

  // ==================== SECURITY CONFIG (PCI DSS / ISO 27001) ====================

  @Get('security-config')
  async getSecurityConfig() {
    return this.securityConfigService.findAll();
  }

  @Patch('security-config')
  async updateSecurityConfig(
    @Body() body: { updates: { key: string; value: string }[] },
    @CurrentUser() user: JwtPayload,
  ) {
    // Log each change to audit trail
    for (const update of body.updates) {
      const oldConfig = await this.securityConfigService.getConfig(update.key);
      await this.auditTrailService.log({
        action: 'UPDATE',
        resource: 'security_config',
        resourceId: update.key,
        userId: user.userId,
        username: user.username,
        oldValue: { key: update.key, value: oldConfig?.value },
        newValue: { key: update.key, value: update.value },
      });
    }

    await this.securityConfigService.updateMultiple(body.updates);
    return { message: 'Đã cập nhật cấu hình bảo mật thành công' };
  }

  @Post('security-config/preset/pci-dss')
  async applyPciDssPreset(@CurrentUser() user: JwtPayload) {
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'security_config',
      resourceId: 'PRESET',
      userId: user.userId,
      username: user.username,
      newValue: { preset: 'PCI_DSS_v4.0' },
    });
    await this.securityConfigService.applyPciDssPreset();
    return { message: 'Đã áp dụng chuẩn PCI DSS v4.0 thành công' };
  }

  @Post('security-config/preset/iso-27001')
  async applyIso27001Preset(@CurrentUser() user: JwtPayload) {
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'security_config',
      resourceId: 'PRESET',
      userId: user.userId,
      username: user.username,
      newValue: { preset: 'ISO_27001_2022' },
    });
    await this.securityConfigService.applyIso27001Preset();
    return { message: 'Đã áp dụng chuẩn ISO 27001:2022 thành công' };
  }

  @Get('security-config/compliance')
  async checkCompliance() {
    return this.securityConfigService.checkCompliance();
  }

  // ==================== SMTP CONFIG ====================

  @Get('smtp-config')
  getSmtpConfig() {
    return this.integrationService.getSmtpConfig();
  }

  @Post('smtp-config')
  async saveSmtpConfig(@Body() body: any, @CurrentUser() user: JwtPayload) {
    const result = this.integrationService.saveSmtpConfig(body);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'smtp_config',
      resourceId: 'smtp',
      userId: user.userId,
      username: user.username,
      newValue: {
        host: body.host,
        port: body.port,
        user: body.user,
        enabled: body.enabled,
      },
    });
    return result;
  }

  @Post('smtp-config/test')
  async testSmtpConfig(@Body() body: any) {
    const result = await this.integrationService.testSmtpConfig(body);
    if (!result.success) {
      throw new Error(result.message);
    }
    return result;
  }

  // ==================== SSO PROVIDERS ====================

  @Get('sso-providers')
  getSsoProviders() {
    return this.integrationService.findAllSsoProviders();
  }

  @Post('sso-providers')
  async createSsoProvider(@Body() body: any, @CurrentUser() user: JwtPayload) {
    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'sso_provider',
      resourceId: body.name,
      userId: user.userId,
      username: user.username,
      newValue: { name: body.name, type: body.type, host: body.host },
    });
    return this.integrationService.createSsoProvider(body);
  }

  @Patch('sso-providers/:id')
  async updateSsoProvider(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'sso_provider',
      resourceId: id,
      userId: user.userId,
      username: user.username,
      newValue: body,
    });
    return this.integrationService.updateSsoProvider(+id, body);
  }

  @Delete('sso-providers/:id')
  async deleteSsoProvider(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.auditTrailService.log({
      action: 'DELETE',
      resource: 'sso_provider',
      resourceId: id,
      userId: user.userId,
      username: user.username,
    });
    return this.integrationService.deleteSsoProvider(+id);
  }

  @Post('sso-providers/:id/test')
  async testSsoProvider(@Param('id') id: string) {
    const result = await this.integrationService.testSsoConnection(+id);
    if (!result.success) {
      throw new Error(result.message);
    }
    return result;
  }
}
