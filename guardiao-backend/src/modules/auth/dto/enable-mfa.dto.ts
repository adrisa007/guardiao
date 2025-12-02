// src/modules/auth/dto/enable-mfa.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class EnableMfaDto {
  @ApiProperty({
    description: 'Método de autenticação de dois fatores',
    enum: ['totp'],
    example: 'totp',
    default: 'totp',
  })
  @IsString({ message: 'O método deve ser uma string' })
  @IsNotEmpty({ message: 'O método é obrigatório' })
  @IsIn(['totp'], {
    message: 'Método inválido. Atualmente apenas "totp" (Google Authenticator) é suportado',
  })
  method: 'totp' = 'totp';

  @ApiPropertyOptional({
    description: 'E-mail para envio do QR Code (se diferente do cadastrado)',
    example: 'joao.silva@empresa.com.br',
  })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Forçar reativação mesmo se MFA já estiver ativo (gera novo secret)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo force deve ser booleano' })
  force?: boolean = false;

  @ApiPropertyOptional({
    description: 'Nome da aplicação no app autenticador (ex: "Guardião LGPD - João Silva")',
    example: 'Guardião LGPD - João Silva',
  })
  @IsOptional()
  @IsString()
  appName?: string;
}