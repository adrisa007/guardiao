// src/modules/dsar/pipes/validate-dsar-type.pipe.ts
import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

export enum TipoDireitoLGPD {
  CONFIRMACAO_EXISTENCIA = 'CONFIRMACAO_EXISTENCIA',
  ACESSO_AOS_DADOS = 'ACESSO_AOS_DADOS',
  CORRECAO_DE_DADOS = 'CORRECAO_DE_DADOS',
  ANONIMIZACAO_BLOQUEIO_ELIMINACAO = 'ANONIMIZACAO_BLOQUEIO_ELIMINACAO',
  PORTABILIDADE = 'PORTABILIDADE',
  INFORMACAO_SOBRE_COMPARTILHAMENTO = 'INFORMACAO_SOBRE_COMPARTILHAMENTO',
  REVOGACAO_CONSENTIMENTO = 'REVOGACAO_CONSENTIMENTO',
  RECLAMACAO_ANPD = 'RECLAMACAO_ANPD',
  OPOSICAO_TRATAMENTO_IRREGULAR = 'OPOSICAO_TRATAMENTO_IRREGULAR',
}

@Injectable()
export class ValidateDsarTypePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const { data: fieldName } = metadata;

    // Se o campo for tipo ou tipoDireito (flexível para diferentes DTOs)
    const tipoRaw = value.tipo || value.tipoDireito;

    if (!tipoRaw) {
      throw new BadRequestException(`O campo "${fieldName || 'tipo'}" é obrigatório`);
    }

    const tipo = tipoRaw.toString().toUpperCase().trim();

    // Verifica se o tipo está no enum oficial
    if (!Object.values(TipoDireitoLGPD).includes(tipo as TipoDireitoLGPD)) {
      throw new BadRequestException(
        `Tipo de direito inválido: "${tipo}". ` +
          `Valores permitidos: ${Object.values(TipoDireitoLGPD).join(', ')}`,
      );
    }

    // Normaliza e retorna o valor válido
    value.tipo = tipo as TipoDireitoLGPD;
    if (value.tipoDireito) {
      value.tipoDireito = tipo as TipoDireitoLGPD;
    }

    // Validações específicas por tipo (conforme ANPD 2025)
    this.validateByType(tipo as TipoDireitoLGPD, value);

    return value;
  }

  private validateByType(tipo: TipoDireitoLGPD, value: any): void {
    switch (tipo) {
      case TipoDireitoLGPD.CORRECAO_DE_DADOS:
        if (!value.descricao || value.descricao.trim().length < 10) {
          throw new BadRequestException(
            'Para correção de dados, é obrigatório descrever detalhadamente quais dados estão incorretos',
          );
        }
        break;

      case TipoDireitoLGPD.ANONIMIZACAO_BLOQUEIO_ELIMINACAO:
        if (!value.descricao || value.descricao.trim().length < 15) {
          throw new BadRequestException(
            'Para anonimização, bloqueio ou eliminação, é necessário justificar o pedido',
          );
        }
        break;

      case TipoDireitoLGPD.PORTABILIDADE:
        if (!value.formato || !['JSON', 'CSV', 'XML'].includes(value.formato?.toUpperCase())) {
          throw new BadRequestException(
            'Para portabilidade, informe o formato desejado (JSON, CSV ou XML)',
          );
        }
        break;

      case TipoDireitoLGPD.RECLAMACAO_ANPD:
        throw new BadRequestException(
          'Este direito deve ser exercido diretamente na ANPD (www.gov.br/anpd)',
        );

      default:
        break;
    }
  }
}