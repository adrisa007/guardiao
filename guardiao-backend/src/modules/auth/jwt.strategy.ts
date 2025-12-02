// src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret-mude-imediatamente-2025',
      passReqToCallback: false,
    });
  }

  /**
   * Validação completa do JWT (executada em TODAS as rotas protegidas)
   * @param payload Conteúdo do JWT (sub, email, tipo, etc.)
   */
  async validate(payload: {
    sub: string;
    email: string;
    tipo: string;
    controladoraId?: string;
    iat?: number;
    exp?: number;
  }) {
    // 1. Busca o usuário no banco com dados críticos
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        nome: true,
        tipo: true,
        controladoraId: true,
        ativo: true,
        termoConfidAssinado: true,
        termoValidade: true,
        bloqueado: true,
      },
    });

    // 2. Validações de segurança obrigatórias
    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException('Conta desativada');
    }

    if (usuario.bloqueado) {
      throw new ForbiddenException('Conta bloqueada por administrador');
    }

    // 3. Verifica termo de confidencialidade (obrigatório pela LGPD)
    if (!usuario.termoConfidAssinado) {
      throw new ForbiddenException('Termo de confidencialidade não assinado');
    }

    if (usuario.termoValidade && new Date(usuario.termoValidade) < new Date()) {
      throw new ForbiddenException('Termo de confidencialidade vencido');
    }

    // 4. Retorna o usuário limpo para req.user
    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipo: usuario.tipo,
      controladoraId: usuario.controladoraId || null,
    };
  }
}