import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'ktnb_user',
  password: process.env.DB_PASSWORD || 'ktnb_password',
  database: process.env.DB_NAME || 'ktnb_db',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
  extra: {
    max: 100,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 10000,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
