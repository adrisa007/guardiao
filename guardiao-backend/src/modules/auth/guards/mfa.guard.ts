// src/modules/auth/guards/mfa.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não houver usuário autenticado (JWT inválido), deixa o AuthGuard tratar
    if (!user) {
      return true;
    }

    // Verifica se o usuário tem MFA habilitado
    const hasMfaEnabled = user.mfaEnabled === true;

    // Se MFA não estiver habilitado, permite acesso
    if (!hasMfaEnabled) {
      return true;
    }

    // Verifica se o código MFA já foi validado nesta sessão
    const mfaVerified = request.headers['x-mfa-verified'] === 'true' ||
                        request.session?.mfaVerified === true;

    if (mfaVerified) {
      return true;
    }

    // MFA habilitado, mas não verificado nesta sessão → bloqueia
    throw new UnauthorizedException({
      mfaRequired: true,
      message: 'Autenticação de dois fatores necessária',
      error: 'MFA_REQUIRED',
    });
  }
}