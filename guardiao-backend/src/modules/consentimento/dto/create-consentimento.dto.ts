import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConsentimentoDto {
  @ApiProperty({ description: 'ID do titular' })
  @IsUUID()
  titularId: string;

  @ApiProperty({ description: 'ID do tipo de consentimento' })
  @IsUUID()
  tipoConsentimentoId: string;

  @ApiProperty({ description: 'ID da base legal' })
  @IsUUID()
  baseLegalId: string;

  @ApiProperty({ example: ['MARKETING', 'PERFIL'] })
  @IsArray()
  @IsString({ each: true })
  classificacaoDados: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canalColeta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  documentosSolicitados?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  anexoProva?: string;
}