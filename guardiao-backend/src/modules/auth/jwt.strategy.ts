// src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret-change-immediately-2025',
      passReqToCallback: false,
    });
  }

  /**
   * Validação completa do JWT – executada em TODAS as rotas protegidas
   * Verifica: existência, ativação, termo de confidencialidade, bloqueio
   */
  async validate(payload: {
    sub: string;
    email: string;
    tipo: string;
    controladoraId?: string;
    iat?: number;
    exp?: number;
  }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        nome: true,
        tipo: true,
        controladoraId: true,
        ativo: true,
        bloqueado: true,
        termoConfidAssinado: true,
        termoValidade: true,
      },
    });

    // 1. Usuário não encontrado
    if (!usuario) {
      throw new UnauthorizedException('Token inválido: usuário não encontrado');
    }

    // 2. Conta desativada
    if (!usuario.ativo) {
      throw new UnauthorizedException('Conta desativada');
    }

    // 3. Conta bloqueada por administrador
    if (usuario.bloqueado) {
      throw new ForbiddenException('Conta bloqueada por administrador');
    }

    // 4. Termo de confidencialidade obrigatório (LGPD Art. 46)
    if (!usuario.termoConfidAssinado) {
      throw new ForbiddenException('Termo de confidencialidade não assinado');
    }

    if (usuario.termoValidade && new Date(usuario.termoValidade) < new Date()) {
      throw new ForbiddenException('Termo de confidencialidade vencido');
    }

    // Retorna usuário limpo para req.user
    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipo: usuario.tipo,
      controladoraId: usuario.controladoraId || null,
    };
  }
}