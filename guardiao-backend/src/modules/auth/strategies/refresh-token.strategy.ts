// src/modules/auth/strategies/refresh-token.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

interface RefreshTokenPayload {
  sub: string;
  jti: string; // ID único do token (para blacklist)
  iat: number;
  exp: number;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(RefreshTokenStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Primeiro tenta do cookie httpOnly
        (request) => request?.cookies?.refresh_token,
        // 2. Depois do body (para APIs mobile)
        ExtractJwt.fromBodyField('refresh_token'),
        // 3. Por último do header (compatibilidade)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 
                   configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Permite acesso ao request completo
    });
  }

  /**
   * Validação do refresh token
   * Executado apenas na rota /auth/refresh
   */
  async validate(request: any, payload: RefreshTokenPayload) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        throw new UnauthorizedException('Refresh token não encontrado');
      }

      // 1. Verifica se o token está na blacklist (Redis em produção)
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Refresh token na blacklist: ${payload.jti}`);
        throw new UnauthorizedException('Token revogado');
      }

      // 2. Busca o usuário
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          tipo: true,
          controladoraId: true,
          ativo: true,
          bloqueado: true,
        },
      });

      if (!usuario || !usuario.ativo || usuario.bloqueado) {
        throw new UnauthorizedException('Usuário inválido ou desativado');
      }

      // 3. Anexa dados ao request para uso no controller/service
      request.refreshTokenPayload = payload;
      request.refreshTokenRaw = token;

      return {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        controladoraId: usuario.controladoraId,
      };
    } catch (error) {
      this.logger.error(`Erro na validação do refresh token: ${error.message}`);
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  // Extrai o token de qualquer fonte
  private extractToken(request: any): string | null {
    return (
      request.cookies?.refresh_token ||
      request.body?.refresh_token ||
      request.headers?.authorization?.replace('Bearer ', '') ||
      null
    );
  }

  // Em produção: integrar com Redis
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    // Implementação com Redis (exemplo):
    // const exists = await this.redis.get(`blacklist:refresh:${token}`);
    // return !!exists;

    // Versão em memória (desenvolvimento)
    const blacklist = (global as any).refreshTokenBlacklist || new Set<string>();
    return blacklist.has(token);
  }
}