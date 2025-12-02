// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { PrismaService } from '../../prisma/prisma.service';

// Configuração JWT (válida para Vercel, Cloud Run, Docker, etc.)
const jwtFactory = {
  secret: process.env.JWT_SECRET || 'fallback-secret-mude-imediatamente-2025',
  signOptions: {
    expiresIn: '15m', // access token curto
  },
};

const jwtRefreshFactory = {
  secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  signOptions: {
    expiresIn: '7d', // refresh token longo
  },
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Access Token (15 minutos)
    JwtModule.registerAsync({
      useFactory: () => jwtFactory,
    }),

    // Refresh Token (7 dias) – estratégia separada
    JwtModule.registerAsync({
      useFactory: () => jwtRefreshFactory,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    PrismaService, // Prisma global
  ],
  exports: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    PassportModule,
  ],
})
export class AuthModule {}