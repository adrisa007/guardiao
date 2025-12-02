// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { RolesGuard } from './guards/roles.guard';
import { MfaGuard } from './guards/mfa.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    // Configuração global de variáveis de ambiente
    ConfigModule,

    // Passport (JWT + Refresh)
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT Access Token (15 minutos)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback-jwt-secret-2025-change-immediately',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),

    // JWT Refresh Token (7 dias) – estratégia separada
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_REFRESH_SECRET') || config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),

    // Mailer – para enviar QR Code MFA por e-mail
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('SMTP_HOST') || 'smtp.gmail.com',
          port: config.get<number>('SMTP_PORT') || 587,
          secure: false,
          auth: {
            user: config.get<string>('SMTP_USER') || 'no-reply@guardiao.com.br',
            pass: config.get<string>('SMTP_PASS'),
          },
        },
        defaults: {
          from: '"Guardião LGPD" <no-reply@guardiao.com.br>',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    RolesGuard,
    MfaGuard,
    PrismaService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    RolesGuard,
    MfaGuard,
  ],
})
export class AuthModule {}