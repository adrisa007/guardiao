// src/modules/consentimento/guards/consentimento-owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ConsentimentoOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // vem do JwtStrategy
    const consentimentoId = request.params?.id;

    if (!consentimentoId) {
      throw new NotFoundException('ID do consentimento não informado');
    }

    // 1. Busca o consentimento com as relações necessárias
    const consentimento = await this.prisma.consentimento.findUnique({
      where: { id: consentimentoId },
      select: {
        titularId: true,
        colaboradorId: true,
        titular: {
          select: {
            usuarioId: true,
            controladoraId: true,
          },
        },
      },
    });

    if (!consentimento) {
      throw new NotFoundException('Consentimento não encontrado');
    }

    const controladoraId = consentimento.titular?.controladoraId;
    const titularUsuarioId = consentimento.titular?.usuarioId;

    // 2. Regras de permissão (exatamente como usado em produção 2025)

    // ROOT tem acesso total
    if (user.tipo === 'ROOT') {
      return true;
    }

    // DPO da mesma controladora tem acesso total
    if (user.tipo === 'DPO' && user.controladoraId === controladoraId) {
      return true;
    }

    // COLABORADOR que coletou o consentimento pode alterar/revogar
    if (
      user.tipo === 'COLABORADOR' &&
      consentimento.colaboradorId === user.id
    ) {
      return true;
    }

    // Titular pode visualizar e revogar SEUS PRÓPRIOS consentimentos
    if (
      user.tipo === 'TITULAR' &&
      titularUsuarioId === user.id
    ) {
      // Titular só pode ver/revogar, nunca alterar dados sensíveis
      const method = request.method;
      if (method === 'GET' || method === 'DELETE') {
        return true;
      }
      // PATCH ou PUT negado para titular
      throw new ForbiddenException(
        'Titular não tem permissão para alterar consentimentos',
      );
    }

    // PRESTADOR ou FUNCIONARIO_PRESTADOR: só leitura se for da mesma controladora
    if (
      ['PRESTADOR', 'FUNCIONARIO_PRESTADOR'].includes(user.tipo) &&
      user.controladoraId === controladoraId
    ) {
      if (request.method === 'GET') {
        return true;
      }
      throw new ForbiddenException('Prestador tem apenas permissão de leitura');
    }

    // Qualquer outro caso: acesso negado
    throw new ForbiddenException(
      'Você não tem permissão para acessar este consentimento',
    );
  }
}