// src/modules/auth/interceptors/auth-audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../../prisma/prisma/prisma.service';

export enum AuthAuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_MFA_REQUIRED = 'LOGIN_MFA_REQUIRED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  MFA_FAILED = 'MFA_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_BLOCKED = 'USER_BLOCKED',
  LOGOUT = 'LOGOUT',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
}

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthAuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.connection?.remoteAddress;
    const userAgent = request.get('user-agent') || 'unknown';
    const userId = request.user?.id || null;

    const now = new Date();

    return next.handle().pipe(
      tap({
        next: async (data => {
          // Sucesso – determina ação com base na rota
          let action: AuthAuditAction;
          let detalhes = {};

          if (url.endsWith('/auth/login') && response.statusCode === 200) {
            if (data?.mfaRequired) {
              action = AuthAuditAction.LOGIN_MFA_REQUIRED;
            } else {
              action = AuthAuditAction.LOGIN_SUCCESS;
            }
          } else if (url.endsWith('/auth/register') && method === 'POST') {
            action = AuthAuditAction.USER_REGISTERED;
            detalhes = { novoUsuarioId: data?.data?.id };
          } else if (url.endsWith('/auth/mfa/verify') && method === 'POST') {
            action = AuthAuditAction.MFA_VERIFIED;
          } else if (url.endsWith('/auth/me/password') && method === 'PATCH') {
            action = AuthAuditAction.PASSWORD_CHANGED;
          } else if (url.endsWith('/auth/logout')) {
            action = AuthAuditAction.LOGOUT;
          } else if (url.endsWith('/auth/refresh')) {
            action = AuthAuditAction.REFRESH_TOKEN;
          } else {
            return; // Não registra ações não críticas
          }

          this.registrarAuditoria(action, userId, ip, userAgent, detalhes);
        },
        error: async (error) => {
          // Falhas críticas de autenticação
          if (url.includes('/auth/login') && error.status === 401) {
            this.registrarAuditoria(AuthAuditAction.LOGIN_FAILED, userId, ip, userAgent, {
              erro: error.message,
            });
          } else if (url.includes('/auth/mfa/verify') && error.status === 401) {
            this.registrarAuditoria(AuthAuditAction.MFA_FAILED, userId, ip, userAgent, {
              erro: 'Código inválido',
            });
          }
        },
      }),
    );
  }

  private async registrarAuditoria(
    action: AuthAuditAction,
    userId: string | null,
    ip: string,
    userAgent: string,
    detalhes: any = {},
  ) {
    try {
      await this.prisma.auditoriaGlobal.create({
        data: {
          usuarioId: userId,
          tabelaAfetada: 'Usuario',
          acao: action,
          dadosAntes: null,
          dadosDepois: JSON.stringify({
            action,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            ...detalhes,
          }),
          ipAddress: ip,
          timestamp: new Date(),
          hashRegistro: this.gerarHashAuditoria(action, userId, ip),
        },
      });
    } catch (error) {
      this.logger.error('Falha ao registrar auditoria de autenticação', error.stack);
    }
  }

  private gerarHashAuditoria(action: string, userId: string | null, ip: string): string {
    const str = `${action}|${userId || 'anonymous'}|${ip}|${Date.now()}`;
    return require('crypto').createHash('sha256').update(str).digest('hex');
  }
}