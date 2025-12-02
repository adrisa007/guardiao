// src/modules/consentimento/entities/consentimento.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsArray,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';

export enum StatusConsentimento {
  ATIVO = 'ATIVO',
  REVOGADO = 'REVOGADO',
  EXPIRADO = 'EXPIRADO',
}

@Exclude() // Exclui tudo por padrão – só expomos o que queremos
export class ConsentimentoEntity {
  @ApiProperty({
    description: 'ID único do consentimento',
    example: 'cons_67a8f9e2b1c3d4e5f6a7b8c9d0e1f2a3',
  })
  @Expose()
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'ID do titular dos dados',
    example: 'tit_1234567890abcdef1234567890abcdef',
  })
  @Expose()
  @IsUUID()
  titularId: string;

  @ApiPropertyOptional({
    description: 'Nome completo do titular (populado via JOIN no service)',
    example: 'Maria Silva Oliveira',
  })
  @Expose()
  @IsString()
  @IsOptional()
  titularNome?: string;

  @ApiPropertyOptional({
    description: 'CPF do titular (mascarado por padrão)',
    example: '***.456.789-**',
  })
  @Expose()
  @IsString()
  @IsOptional()
  titularCpfMascarado?: string;

  @ApiProperty({
    description: 'ID do tipo de consentimento configurado',
    example: 'tipo_9876543210abcdef',
  })
  @Expose()
  @IsUUID()
  tipoConsentimentoId: string;

  @ApiProperty({
    description: 'Nome/código do tipo de consentimento',
    example: 'MARKETING_EMAIL_WHATSAPP',
  })
  @Expose()
  @IsString()
  tipoConsentimentoNome: string;

  @ApiProperty({
    description: 'ID da base legal utilizada',
    example: 'base_1111111111',
  })
  @Expose()
  @IsUUID()
  baseLegalId: string;

  @ApiProperty({
    description: 'Código da base legal (ex: ART7_I, ART11_Ia)',
    example: 'ART7_I',
  })
  @Expose()
  @IsString()
  baseLegalCodigo: string;

  @ApiProperty({
    description: 'Classificação dos dados tratados',
    example: ['DADOS_PESSOAIS', 'DADOS_SENSIVEIS_SAUDE'],
    type: [String],
  })
  @Expose()
  @IsArray()
  @IsString({ each: true })
  classificacaoDados: string[];

  @ApiPropertyOptional({
    description: 'Canal de coleta do consentimento',
    example: 'Formulário Web',
  })
  @Expose()
  @IsString()
  @IsOptional()
  canalColeta?: string;

  @ApiPropertyOptional({
    description: 'Documentos comprobatórios anexados',
    example: ['rg_frente.jpg', 'selfie.jpg'],
    type: [String],
  })
  @Expose()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentosSolicitados?: string[];

  @ApiPropertyOptional({
    description: 'Link ou hash do comprovante PDF gerado',
    example: 'comprovantes/cons_67a8f9e2b1c3d4e5f6a7b8c9d0e1f2a3.pdf',
  })
  @Expose()
  @IsString()
  @IsOptional()
  comprovanteHash?: string;

  @ApiProperty({
    description: 'Data e hora da coleta do consentimento',
    example: '2025-12-01T10:30:45.123Z',
  })
  @Expose()
  @IsDateString()
  dataColeta: string | Date;

  @ApiPropertyOptional({
    description: 'Data da revogação (se aplicável)',
    example: '2025-12-15T14:20:00.000Z',
  })
  @Expose()
  @IsDateString()
  @IsOptional()
  dataRevogacao?: string | Date | null;

  @ApiPropertyOptional({
    description: 'Motivo da revogação',
    example: 'Mudança de preferência do titular',
  })
  @Expose()
  @IsString()
  @IsOptional()
  motivoRevogacao?: string;

  @ApiProperty({
    description: 'Status atual do consentimento',
    enum: StatusConsentimento,
    example: StatusConsentimento.ATIVO,
  })
  @Expose()
  @IsEnum(StatusConsentimento)
  status: StatusConsentimento;

  @ApiProperty({
    description: 'ID do colaborador que coletou o consentimento',
    example: 'usr_abcdef1234567890',
  })
  @Expose()
  @IsUUID()
  colaboradorId: string | null;

  @ApiPropertyOptional({
    description: 'Nome do colaborador operador',
 example: 'Carlos Santos',
  })
  @Expose()
  @IsString()
  @IsOptional()
  colaboradorNome?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-12-01T10:30:45.123Z',
  })
  @Expose()
  @IsDateString()
  createdAt: string | Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-12-01T10:30:45.123Z',
  })
  @Expose()
  @IsDateString()
  updatedAt: string | Date;

  // ==================== CONSTRUTOR AUXILIAR ====================
  constructor(partial: Partial<ConsentimentoEntity>) {
    Object.assign(this, partial);

    // Calcula status automaticamente se não for informado
    if (!this.status === undefined) {
      if (this.dataRevogacao) {
        this.status = StatusConsentimento.REVOGADO;
      } else {
        this.status = StatusConsentimento.ATIVO;
      }
    }
  }
}