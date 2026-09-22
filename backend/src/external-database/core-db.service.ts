import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class CoreDbService {
  private readonly logger = new Logger(CoreDbService.name);
  private coreDataSource: DataSource;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log(
      'Initializing Read-Only connection to Core Banking Replica...',
    );
    this.coreDataSource = new DataSource({
      type: 'postgres', // Adjust depending on Bank's Core DB type
      host: this.configService.get<string>('CORE_DB_HOST'),
      port: this.configService.get<number>('CORE_DB_PORT'),
      username: this.configService.get<string>('CORE_DB_USER'),
      password: this.configService.get<string>('CORE_DB_PASS'),
      database: this.configService.get<string>('CORE_DB_NAME'),
      synchronize: false,
      extra: {
        options: '-c default_transaction_read_only=on',
      },
    });
    // await this.coreDataSource.initialize();
  }

  async query(sql: string, params?: any[]) {
    // return await this.coreDataSource.query(sql, params);
    return [];
  }
}
