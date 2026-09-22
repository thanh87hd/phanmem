import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming JwtAuthGuard exists in typical Nest apps

@Controller('framework')
@UseGuards(JwtAuthGuard)
export class FrameworkController {
  constructor(private readonly frameworkService: FrameworkService) {}

  // Metadata Endpoints
  @Post('metadata')
  createMetadata(@Body() dto: any) {
    return this.frameworkService.createMetadata(dto);
  }

  @Get('metadata')
  getAllMetadata() {
    return this.frameworkService.getAllMetadata();
  }

  @Get('metadata/:resourceName')
  getMetadataByName(@Param('resourceName') resourceName: string) {
    return this.frameworkService.getMetadataByName(resourceName);
  }

  @Put('metadata/:resourceName')
  updateMetadata(
    @Param('resourceName') resourceName: string,
    @Body() dto: any,
  ) {
    return this.frameworkService.updateMetadata(resourceName, dto);
  }

  // Dynamic Data Endpoints
  @Post('data/:resourceName')
  createData(
    @Param('resourceName') resourceName: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    const userRole =
      typeof req.user?.role === 'string'
        ? req.user.role
        : req.user?.role?.name || 'User';
    return this.frameworkService.createData(
      resourceName,
      data,
      userRole,
      req.user?.userId,
    );
  }

  @Get('data/:resourceName')
  getAllData(@Param('resourceName') resourceName: string, @Request() req: any) {
    const userRole =
      typeof req.user?.role === 'string'
        ? req.user.role
        : req.user?.role?.name || 'User';
    return this.frameworkService.getAllData(resourceName, userRole);
  }

  @Get('data/:resourceName/:id')
  getDataById(
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userRole =
      typeof req.user?.role === 'string'
        ? req.user.role
        : req.user?.role?.name || 'User';
    return this.frameworkService.getDataById(resourceName, id, userRole);
  }

  @Put('data/:resourceName/:id')
  updateData(
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    const userRole =
      typeof req.user?.role === 'string'
        ? req.user.role
        : req.user?.role?.name || 'User';
    return this.frameworkService.updateData(resourceName, id, data, userRole);
  }

  @Delete('data/:resourceName/:id')
  deleteData(
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userRole =
      typeof req.user?.role === 'string'
        ? req.user.role
        : req.user?.role?.name || 'User';
    return this.frameworkService.deleteData(resourceName, id, userRole);
  }
}
