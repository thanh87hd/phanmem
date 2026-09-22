import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { SystemManagementModule } from '../system-management/system-management.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getRequiredJwtSecret } from '../common/security/jwt-secret';
import { PasswordChangeRequest } from './entities/password-change-request.entity';
import { SessionActivity } from './entities/session-activity.entity';
import { SessionTimeoutInterceptor } from './interceptors/session-timeout.interceptor';

import { RolesModule } from '../roles/roles.module';
import { KeycloakService } from './keycloak.service';
import { LdapService } from './ldap.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordChangeRequest, SessionActivity]),
    UsersModule,
    RolesModule,
    AuditTrailModule,
    SystemManagementModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '8h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakService,
    LdapService,
    JwtStrategy,
    RolesGuard,
    JwtAuthGuard,
    SessionTimeoutInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionTimeoutInterceptor,
    },
  ],
  exports: [
    AuthService,
    KeycloakService,
    LdapService,
    RolesGuard,
    JwtAuthGuard,
    SessionTimeoutInterceptor,
  ],
})
export class AuthModule {}
