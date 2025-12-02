import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryConsentimentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titularId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipoConsentimentoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value) || 20)
  limit?: number = 20;
}