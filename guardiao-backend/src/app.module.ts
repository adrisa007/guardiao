// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HelmetMiddleware } from 'nest-helmet';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Módulos oficiais
import { AuthModule } from './modules/auth/auth.module';
import { ConsentimentoModule } from './modules/consentimento/consentimento.module';
import { DsarModule } from './modules/dsar/dsar.module';
import { TitularModule } from './modules/titular/titular.module';
import { PrestadorModule } from './modules/prestador/prestador.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RelatorioModule } from './modules/relatorio/relatorio.module';

// Guards globais
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

// Interceptors globais
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // Configuração global (variáveis de ambiente)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Proteção contra ataques de força bruta
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL') || 60000,
        limit: config.get('THROTTLE_LIMIT') || 100,
      }),
    }),

    // Tarefas agendadas (backup, limpeza, alertas)
    ScheduleModule.forRoot(),

    // Módulos do sistema
    AuthModule,
    ConsentimentoModule,
    DsarModule,
    TitularModule,
    PrestadorModule,
    DashboardModule,
    RelatorioModule,
  ],
  controllers: [],
  providers: [
    PrismaService,

    // Filtro global de exceções
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Interceptors globais
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Guard de rate limit (protege contra bots)
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },

    },

    // Guard de roles (DPO, ROOT, TITULAR, etc.)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Helmet – Segurança HTTP headers (obrigatório ANPD 2025)
    consumer
      .apply(HelmetMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}