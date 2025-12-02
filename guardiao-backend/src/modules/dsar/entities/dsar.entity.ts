// src/modules/dsar/entities/dsar.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

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

export enum StatusDsar {
  ABERTO = 'ABERTO',
  EM_ANALISE = 'EM_ANALISE',
  AGUARDANDO_COMPLEMENTO = 'AGUARDANDO_COMPLEMENTO',
  RESPONDIDO = 'RESPONDIDO',
  INDEFERIDO = 'INDEFERIDO',
  CANCELADO = 'CANCELADO',
  ARQUIVADO = 'ARQUIVADO',
}

export class DsarEntity implements Prisma.DsarRequestUncheckedCreateInput {
  @ApiProperty({ description: 'ID único da solicitação', example: 'dsar_abc123xyz' })
  id: string;

  @ApiProperty({ description: 'Protocolo visível ao titular', example: 'DSAR-2025-000147' })
  protocolo: string;

  @ApiProperty({ enum: TipoDireitoLGPD, description: 'Direito solicitado (Art. 18 LGPD)' })
  tipoDireito: TipoDireitoLGPD;

  @ApiProperty({ description: 'ID do titular no sistema' })
  titularId: string;

  @ApiProperty({ description: 'Nome completo do titular' })
  titularNome: string;

  @ApiProperty({ description: 'CPF do titular (11 dígitos)' })
  titularCpf: string;

  @ApiProperty({ description: 'E-mail do titular' })
  titularEmail: string;

  @ApiPropertyOptional({ description: 'Telefone do titular' })
  titularTelefone?: string | null;

  @ApiPropertyOptional({ description: 'Descrição detalhada da solicitação' })
  descricao?: string | null;

  @ApiProperty({ enum: StatusDsar, default: StatusDsar.ABERTO })
  status: StatusDsar = StatusDsar.ABERTO;

  @ApiPropertyOptional({ description: 'Resposta oficial enviada pelo DPO' })
  respostaDpo?: string | null;

  @ApiPropertyOptional({ description: 'URL pública do anexo (PDF, ZIP, JSON)' })
  anexoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Caminho interno do arquivo (para download autenticado)' })
  anexoPath?: string | null;

  @ApiPropertyOptional({ description: 'Motivo do indeferimento (obrigatório se INDEFERIDO)' })
  motivoIndeferimento?: string | null;

  @ApiPropertyOptional({ description: 'ID do DPO que respondeu' })
  respondidoPorId?: string | null;

  @ApiPropertyOptional({ description: 'Nome do DPO que respondeu' })
  respondidoPorNome?: string | null;

  @ApiProperty({ description: 'Data de criação da solicitação' })
  createdAt: Date | string;

  @ApiPropertyOptional({ description: 'Data em que foi respondida' })
  dataResposta?: Date | string | null;

  @ApiPropertyOptional({ description: 'Data de arquivamento (após 5 anos)' })
  arquivadoEm?: Date | string | null;

  // === Campos calculados (não persistem no banco) ===
  @ApiProperty({ description: 'Quantos dias corridos desde a abertura', example: 6 })
  diasDesdeAbertura?: number;

  @ApiProperty({ description: 'Se o prazo de 15 dias foi atendido', example: true })
  prazoAtendido?: boolean;

  @ApiProperty({ description: 'Prazo final legal (15 dias corridos)', example: '2025-12-19T23:59:59Z' })
  prazoFinal?: string;
}