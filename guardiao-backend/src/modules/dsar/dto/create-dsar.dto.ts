// src/modules/dsar/dto/create-dsar.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

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

export class CreateDsarDto {
  @ApiProperty({
    description: 'Tipo de direito solicitado pelo titular (Art. 18 da LGPD)',
    enum: TipoDireitoLGPD,
    example: TipoDireitoLGPD.ACESSO_AOS_DADOS,
  })
  @IsEnum(TipoDireitoLGPD, {
    message:
      'Tipo inválido. Use um dos valores: CONFIRMACAO_EXISTENCIA, ACESSO_AOS_DADOS, CORRECAO_DE_DADOS, ANONIMIZACAO_BLOQUEIO_ELIMINACAO, PORTABILIDADE, INFORMACAO_SOBRE_COMPARTILHAMENTO, REVOGACAO_CONSENTIMENTO, RECLAMACAO_ANPD, OPOSICAO_TRATAMENTO_IRREGULAR',
  })
  @IsNotEmpty({ message: 'O tipo de direito é obrigatório' })
  tipo: TipoDireitoLGPD;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da solicitação (ex: quais dados corrigir)',
    example: 'Quero eliminar todos os meus dados de marketing e newsletter',
  })
  @IsOptional()
  @IsString()
  @Length(10, 1000, {
    message: 'A descrição deve ter entre 10 e 1000 caracteres',
  })
  descricao?: string;

  @ApiProperty({
    description: 'E-mail do titular (usado para enviar resposta e protocolo)',
    example: 'maria.silva@email.com.br',
  })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Nome completo do titular',
    example: 'Maria Silva Santos Oliveira',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome completo é obrigatório' })
  @Length(3, 150)
  nome: string;

  @ApiProperty({
    description: 'CPF do titular (apenas números)',
    example: '12345678909',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf: string;

  @ApiPropertyOptional({
    description: 'Telefone com DDD (opcional, mas recomendado para contato rápido)',
    example: '(11) 98765-4321',
  })
  @IsOptional()
  @Matches(/^(\(\d{2}\)\s?)?9\d{4}-\d{4}$/, {
    message: 'Telefone inválido. Use formato (11) 98765-4321',
  })
  telefone?: string;

  @ApiPropertyOptional({
    description: 'ID do titular no sistema (se já cadastrado e autenticado)',
  })
  @IsOptional()
  @IsString()
  titularId?: string;
}