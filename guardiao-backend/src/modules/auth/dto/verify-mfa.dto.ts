// src/modules/auth/dto/verify-mfa.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({
    description: 'Código de 6 dígitos gerado pelo aplicativo autenticador (Google Authenticator, Authy, etc.)',
    example: '123456',
  })
  @IsString({ message: 'O código MFA deve ser uma string' })
  @IsNotEmpty({ message: 'O código MFA é obrigatório' })
  @Length(6, 6, { message: 'O código MFA deve ter exatamente 6 dígitos' })
  @Matches(/^\d{6}$/, {
    message: 'O código MFA deve conter apenas números (6 dígitos)',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Usar código de backup (formato XXXX-XXXX-XXXX) quando o usuário perdeu acesso ao app',
    example: 'A1B2-C3D4-E5F6',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Código de backup inválido. Formato esperado: A1B2-C3D4-E5F6',
  })
  backupCode?: string;

  @ApiPropertyOptional({
    description: 'ID da sessão MFA (retornado no login quando mfaRequired = true)',
    example: 'sess_mfa_abc123xyz',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Forçar verificação mesmo se já estiver ativo (útil em recuperação de conta)',
    example: false,
    default: false,
  })
  @IsOptional()
  force?: boolean = false;
}