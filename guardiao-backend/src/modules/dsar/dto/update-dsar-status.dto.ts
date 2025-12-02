// src/modules/dsar/dto/update-dsar-status.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsDateString,
  Length,
} from 'class-validator';

export enum StatusDsar {
  ABERTO = 'ABERTO',
  EM_ANALISE = 'EM_ANALISE',
  AGUARDANDO_COMPLEMENTO = 'AGUARDANDO_COMPLEMENTO',
  RESPONDIDO = 'RESPONDIDO',
  INDEFERIDO = 'INDEFERIDO',
  CANCELADO = 'CANCELADO',
  ARQUIVADO = 'ARQUIVADO',
}

export class UpdateDsarStatusDto {
  @ApiProperty({
    description: 'Novo status da solicitação DSAR',
    enum: StatusDsar,
    example: StatusDsar.RESPONDIDO,
  })
  @IsEnum(StatusDsar, {
    message: `Status inválido. Use: ${Object.values(StatusDsar).join(', ')}`,
  })
  @IsNotEmpty({ message: 'O status é obrigatório' })
  status: StatusDsar;

  @ApiProperty({
    description: 'Resposta oficial do DPO/Encarregado para o titular',
    example: 'Prezado(a), conforme solicitado, seguem em anexo todos os seus dados pessoais tratados por esta empresa.',
  })
  @IsString()
  @IsNotEmpty({ message: 'A resposta do DPO é obrigatória quando o status for RESPONDIDO ou INDEFERIDO' })
  @Length(20, 2000, {
    message: 'A resposta deve ter entre 20 e 2000 caracteres',
  })
  respostaDpo: string;

  @ApiPropertyOptional({
    description: 'URL pública ou caminho do arquivo anexado (PDF, ZIP, JSON) com os dados solicitados',
    example: 'https://storage.guardiao.com.br/dsar/resposta-2025-00147.pdf',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL do anexo inválida' })
  anexoUrl?: string;

  @ApiPropertyOptional({
    description: 'Caminho interno do arquivo no servidor (para download autenticado)',
    example: '/uploads/dsar/resposta-2025-00147.zip',
  })
  @IsOptional()
  @IsString()
  anexoPath?: string;

  @ApiPropertyOptional({
    description: 'Data em que a resposta foi enviada ao titular (padrão: data atual)',
    example: '2025-12-10T14:30:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de resposta inválida' })
  dataResposta?: string;

  @ApiPropertyOptional({
    description: 'Motivo do indeferimento (obrigatório quando status = INDEFERIDO)',
    example: 'A solicitação não foi acompanhada de documento de identificação válido.',
  })
  @IsOptional()
  @IsString()
  @Length(10, 500)
  motivoIndeferimento?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário DPO que respondeu a solicitação (auditoria)',
    example: 'usr_dpo_123456',
  })
  @IsOptional()
  @IsString()
  respondidoPorId?: string;
}