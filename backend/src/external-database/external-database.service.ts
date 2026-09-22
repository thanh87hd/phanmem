import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalDatabaseConnection } from './external-database.entity';
import {
  ConnectExternalDbDto,
  CreateExternalDbDto,
  UpdateExternalDbDto,
  TestConnectionDto,
} from './external-database.dto';
import { lookup } from 'node:dns/promises';
import * as ipaddr from 'ipaddr.js';

async function assertSafeHost(host: string): Promise<void> {
  if (!host) return;
  try {
    const addrs = await lookup(host, { all: true });
    if (
      addrs.some((a) => {
        const parsed = ipaddr.parse(a.address);
        return parsed.range() !== 'unicast';
      })
    ) {
      throw new BadRequestException(
        'Bảo mật: Không được phép kết nối đến địa chỉ IP nội bộ hoặc máy chủ cục bộ (SSRF Protection).',
      );
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
  }
}

@Injectable()
export class ExternalDatabaseService {
  private readonly logger = new Logger(ExternalDatabaseService.name);

  constructor(
    @InjectRepository(ExternalDatabaseConnection)
    private readonly connectionRepository: Repository<ExternalDatabaseConnection>,
  ) {}

  // ════════════════════════ CRUD METHODS ════════════════════════

  async create(dto: CreateExternalDbDto): Promise<ExternalDatabaseConnection> {
    this.logger.log(`Creating database connection record: ${dto.name}`);
    const connection = this.connectionRepository.create(dto);
    return await this.connectionRepository.save(connection);
  }

  async findAll(): Promise<ExternalDatabaseConnection[]> {
    return await this.connectionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ExternalDatabaseConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { id },
    });
    if (!connection) {
      throw new HttpException(
        'External database connection config not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return connection;
  }

  async update(
    id: string,
    dto: UpdateExternalDbDto,
  ): Promise<ExternalDatabaseConnection> {
    this.logger.log(`Updating database connection record: ${id}`);
    const connection = await this.findOne(id);
    Object.assign(connection, dto);
    return await this.connectionRepository.save(connection);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting database connection record: ${id}`);
    const connection = await this.findOne(id);
    await this.connectionRepository.remove(connection);
  }

  // ════════════════════════ TESTING METHODS ════════════════════════

  async testConnection(
    dto: TestConnectionDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Testing connection to external ${dto.type} database at ${dto.host}:${dto.port}/${dto.database}`,
    );

    await assertSafeHost(dto.host);

    const dataSourceOptions: any = {
      type: dto.type,
      host: dto.host,
      port: dto.port,
      username: dto.username,
      password: dto.password || '',
      database: dto.database,
      synchronize: false,
      logging: false,
      connectTimeout: 5000, // Timeout fast
    };

    if (dto.type === 'mssql') {
      dataSourceOptions.options = {
        encrypt: false,
        trustServerCertificate: true,
      };
    }

    const tempDataSource = new DataSource(dataSourceOptions);

    try {
      await tempDataSource.initialize();
      this.logger.log(
        `Test connection successful for ${dto.type} at ${dto.host}:${dto.port}`,
      );
      return {
        success: true,
        message: 'Kết nối thành công!',
      };
    } catch (error) {
      this.logger.error(`Test connection failed: ${error.message}`);
      return {
        success: false,
        message: `Kết nối thất bại: ${error.message}`,
      };
    } finally {
      if (tempDataSource.isInitialized) {
        await tempDataSource.destroy();
      }
    }
  }

  // ════════════════════════ QUERY METHODS ════════════════════════

  async querySavedDb(id: string, query: string): Promise<any[]> {
    const connection = await this.findOne(id);

    const connectDto: ConnectExternalDbDto = {
      type: connection.type,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database: connection.database,
      query: query,
    };

    return await this.queryExternalDb(connectDto);
  }

  async queryExternalDb(dto: ConnectExternalDbDto): Promise<any[]> {
    this.logger.log(
      `Attempting to connect to external ${dto.type} database at ${dto.host}:${dto.port}/${dto.database}`,
    );

    await assertSafeHost(dto.host);

    // Validate query to prevent destructive actions (only allow SELECT for analysis)
    const normalizedQuery = dto.query.trim().toLowerCase();
    if (
      !normalizedQuery.startsWith('select') &&
      !normalizedQuery.startsWith('with') &&
      !normalizedQuery.startsWith('show')
    ) {
      throw new HttpException(
        'Only SELECT, SHOW, or WITH queries are allowed for external data analysis to ensure data safety.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cleanQuery = dto.query.trim().replace(/;+$/, '').trim();
    if (
      cleanQuery.includes(';') ||
      /\b(drop|delete|truncate|alter|insert|update|grant|revoke|exec|execute)\b/i.test(
        cleanQuery,
      )
    ) {
      throw new HttpException(
        'Only single-statement read-only queries are permitted (no stacked queries or modification commands).',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Configure dynamic TypeORM DataSource
    const dataSourceOptions: any = {
      type: dto.type,
      host: dto.host,
      port: dto.port,
      username: dto.username,
      password: dto.password || '',
      database: dto.database,
      synchronize: false,
      logging: false,
    };

    // Connection adjustments for specific drivers
    if (dto.type === 'mssql') {
      dataSourceOptions.options = {
        encrypt: false, // Default to false for local testing environments
        trustServerCertificate: true,
      };
    }

    const tempDataSource = new DataSource(dataSourceOptions);

    try {
      // Connect to the external database
      await tempDataSource.initialize();
      this.logger.log(
        `Successfully connected to ${dto.type} database at ${dto.host}:${dto.port}`,
      );

      // Execute query
      const result = await tempDataSource.query(dto.query);
      return result;
    } catch (error) {
      this.logger.error(
        `Database connection or query execution failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to connect or execute query on external database: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Clean up connection to avoid pool exhaustion
      if (tempDataSource.isInitialized) {
        try {
          await tempDataSource.destroy();
          this.logger.log(
            `Connection to external database closed successfully.`,
          );
        } catch (destroyError) {
          this.logger.error(
            `Error closing connection to external database: ${destroyError.message}`,
          );
        }
      }
    }
  }
}
