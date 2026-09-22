import {
  Controller,
  Get,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  getHealth() {
    return {
      status: 'ok',
      service: 'ktnb-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('health/liveness')
  @Public()
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage().rss,
    };
  }

  @Get('health/readiness')
  @Public()
  async getReadiness() {
    const checks: Record<string, any> = {
      database: 'down',
      cache: 'down',
    };
    let isHealthy = true;

    // 1. Check PostgreSQL Database connection
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch (err: any) {
      isHealthy = false;
      checks.database = `down: ${err.message}`;
    }

    // 2. Check Cache
    try {
      await this.cacheManager.set('health_check_ping', 'pong', 5000);
      const val = await this.cacheManager.get('health_check_ping');
      if (val === 'pong') {
        checks.cache = 'up';
      } else {
        checks.cache = 'degraded';
      }
    } catch (err: any) {
      checks.cache = `warning: ${err.message}`;
    }

    const result = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!isHealthy) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
