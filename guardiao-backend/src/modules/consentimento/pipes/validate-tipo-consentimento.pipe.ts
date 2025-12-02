// src/modules/consentimento/pipes/validate-tipo-consentimento.pipe.ts
import {
  PipeTransform,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ValidateTipoConsentimentoPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se o tipoConsentimentoId existe, está ativo e pertence à mesma controladora do usuário
   * Usado em @Body() dto: CreateConsentimentoDto ou UpdateConsentimentoDto
   */
  async transform(value: any) {
    // Se o DTO tem tipoConsentimentoId, valida
    if (!value || typeof value !== 'object' || !value.tipoConsentimentoId) {
      throw new BadRequestException('tipoConsentimentoId é obrigatório');
    }

    const tipoId = value.tipoConsentimentoId;

    if (!this.isValidUUID(tipoId)) {
      throw new BadRequestException('tipoConsentimentoId deve ser um UUID válido');
    }

    // Busca o tipo de consentimento com a controladora
    const tipoConsentimento = await this.prisma.tipoConsentimento.findUnique({
      where: { id: tipoId },
      select: {
        id: true,
        ativo: true,
        controladoraId: true,
        nome: true,
        codigo: true,
        exigeProvaFisica: true,
        baseLegalPadrao: true,
      },
    });

    if (!tipoConsentimento) {
      throw new NotFoundException(
        `Tipo de consentimento com ID ${tipoId} não encontrado`,
      );
    }

    if (!tipoConsentimento.ativo) {
      throw new ForbiddenException(
        `O tipo de consentimento "${tipoConsentimento.nome}" está inativo e não pode ser usado`,
      );
    }

    // === VALIDAÇÃO CRÍTICA: MESMA CONTROLADORA ===
    // O usuário logado vem do request (injetado pelo JwtStrategy)
    const request = (this as any).context?.switchToHttp()?.getRequest();
    const user = request?.user;

    if (!user || !user.controladoraId) {
      throw new BadRequestException('Usuário não autenticado ou sem controladora');
    }

    if (tipoConsentimento.controladoraId !== user.controladoraId) {
      throw new ForbiddenException(
        'Você não tem permissão para usar tipos de consentimento de outra controladora',
      );
    }

    // === VALIDAÇÕES ADICIONAIS DE CONFORMIDADE LGPD ===

    // Se exige prova física e não foi enviada anexoProva → bloqueia
    if (tipoConsentimento.exigeProvaFisica && !value.anexoProva) {
      throw new BadRequestException(
        `O tipo "${tipoConsentimento.nome}" exige comprovante físico (anexoProva obrigatório)`,
      );
    }

    // Se não tem base legal padrão e não foi informada → bloqueia
    if (!tipoConsentimento.baseLegalPadrao && !value.baseLegalId) {
      throw new BadRequestException(
        `O tipo "${tipoConsentimento.nome}" exige que a base legal seja informada manualmente`,
      );
    }

    // Anexa informações úteis no DTO para uso posterior no service
    value._validatedTipoConsentimento = {
      id: tipoConsentimento.id,
      nome: tipoConsentimento.nome,
      codigo: tipoConsentimento.codigo,
      exigeProvaFisica: tipoConsentimento.exigeProvaFisica,
      baseLegalPadrao: tipoConsentimento.baseLegalPadrao,
    };

    return value;
  }

  // Helper simples para validar UUID
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}