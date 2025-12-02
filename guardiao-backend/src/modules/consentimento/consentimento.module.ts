// src/modules/consentimento/consentimento.module.ts
import { Module, Scope } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConsentimentoController } from './consentimento.controller';
import { ConsentimentoService } from './consentimento.service';
import { ConsentimentoRepository } from './repositories/consentimento.repository';
import { ValidateTipoConsentimentoPipe } from './pipes/validate-tipo-consentimento.pipe';
import { ConsentimentoOwnerGuard } from './guards/consentimento-owner.guard';
import { ConsentimentoAuditInterceptor } from './interceptors/consentimento-audit.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ConsentimentoController],
  providers: [
    ConsentimentoService,

    // Repository Pattern – injetado como classe concreta
    ConsentimentoRepository,

    // Pipes
    ValidateTipoConsentimentoPipe,

    // Guards
    ConsentimentoOwnerGuard,

    // Prisma (global)
    PrismaService,

    // Interceptor de auditoria GLOBAL para este módulo
    {
      provide: APP_INTERCEPTOR,
      scope: Scope.REQUEST,
      useClass: ConsentimentoAuditInterceptor,
    },
  ],
  exports: [
    ConsentimentoService,
    ConsentimentoRepository,
    ValidateTipoConsentimentoPipe,
  ],
})
export class ConsentimentoModule {}