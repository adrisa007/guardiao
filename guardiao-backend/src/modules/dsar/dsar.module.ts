// src/modules/dsar/dsar.module.ts
import { Module } from '@nestjs/common';
import { DsarController } from './dsar.controller';
import { DsarService } from './dsar.service';
import { PrismaService } from '../../prisma/prisma.service';

// Pipes
import { ValidateDsarTypePipe } from './pipes/validate-dsar-type.pipe';

// Guards
import { DsarOwnerGuard } from './guards/dsar-owner.guard';

// Interceptors (auditoria automática)
import { DsarAuditInterceptor } from './interceptors/dsar-audit.interceptor';

// Mailer (e-mail automático ao titular)
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    // Configuração do Mailer (e-mail automático de resposta DSAR)
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'no-reply@guardiao.com.br',
          pass: process.env.SMTP_PASS || 'sua-senha-aqui',
        },
      },
      defaults: {
        from: '"Guardião LGPD" <no-reply@guardiao.com.br>',
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [DsarController],
  providers: [
    DsarService,
    PrismaService,
    ValidateDsarTypePipe,
    DsarOwnerGuard,

    // Auditoria automática em todas as rotas do módulo
    {
      provide: 'APP_INTERCEPTOR',
      useClass: DsarAuditInterceptor,
    },
  ],
  exports: [
    DsarService,
    ValidateDsarTypePipe,
    DsarOwnerGuard,
  ],
})
export class DsarModule {}