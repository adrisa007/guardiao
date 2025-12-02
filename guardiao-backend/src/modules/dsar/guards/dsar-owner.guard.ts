// src/modules/dsar/guards/dsar-owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DsarOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // vem do JWT Strategy
    const dsarId = request.params.id;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (!dsarId) {
      throw new NotFoundException('ID da solicitação DSAR não informado');
    }

    // Busca a DSAR com dados mínimos (otimizado)
    const dsar = await this.prisma.dsarRequest.findUnique({
      where: { id: dsarId },
      select: {
        id: true,
        titularId: true,
        status: true,
      },
    });

    if (!dsar) {
      throw new NotFoundException(`Solicitação DSAR ${dsarId} não encontrada`);
    }

    // REGRAS DE ACESSO – 100% conforme LGPD
    const isDpoOrRoot = ['DPO', 'ROOT'].includes(user.tipo);
    const isTitular = dsar.titularId === user.id;

    // DPO e ROOT têm acesso total
    if (isDpoOrRoot) {
      return true;
    }

    // Titular só pode ver suas próprias solicitações
    if (isTitular) {
      return true;
    }

    // Qualquer outro caso = proibido
    throw new ForbiddenException(
      'Você não tem permissão para acessar esta solicitação DSAR. ' +
        'Apenas o titular da solicitação ou o DPO/Encarregado podem visualizar.',
    );
  }
}