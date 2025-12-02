// src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  tipo: string;
  controladoraId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-jwt-secret-2025-mude-imediatamente',
      passReqToCallback: false,
    });
  }

  /**
   * Validação completa do JWT – executada em TODAS as rotas protegidas
   * Verifica: existência, ativação, bloqueio, termo de confidencialidade e MFA
   */
  async validate(payload: JwtPayload) {
    try {
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
          mfaSecret: true,
        },
      });

      // 1. Usuário não encontrado
      if (!usuario) {
        this.logger.warn(`JWT inválido: usuário ${payload.sub} não encontrado`);
        throw new UnauthorizedException('Token inválido');
      }

      // 2. Conta desativada
      if (!usuario.ativo) {
        this.logger.warn(`Acesso bloqueado: usuário ${usuario.email} está desativado`);
        throw new UnauthorizedException('Conta desativada');
      }

      // 3. Conta bloqueada por administrador
      if (usuario.bloqueado) {
        this.logger.warn(`Acesso bloqueado: usuário ${usuario.email} está bloqueado`);
        throw new ForbiddenException('Conta bloqueada por administrador');
      }

      // 4. Termo de confidencialidade obrigatório (LGPD Art. 46)
      if (!usuario.termoConfidAssinado) {
        this.logger.warn(`Termo pendente: usuário ${usuario.email} não assinou o termo`);
        throw new ForbiddenException('Termo de confidencialidade não assinado');
      }

      if (usuario.termoValidade && new Date(usuario.termoValidade) < new Date()) {
        this.logger.warn(`Termo vencido: usuário ${usuario.email}`);
        throw new ForbiddenException('Termo de confidencialidade vencido');
      }

      // 5. Retorna usuário limpo para req.user
      return {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
        controladoraId: usuario.controladoraId || null,
        mfaEnabled: !!usuario.mfaSecret,
      };
    } catch (error) {
      this.logger.error(`Erro na validação JWT: ${error.message}`, error.stack);
      throw error instanceof UnauthorizedException || error instanceof ForbiddenException
        ? error
        : new UnauthorizedException('Token inválido');
    }
  }
}