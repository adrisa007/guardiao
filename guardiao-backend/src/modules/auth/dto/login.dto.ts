// src/modules/auth/dto/login.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  Length,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail do usuário (case-insensitive)',
    example: 'joao.silva@empresa.com.br',
  })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @ApiProperty({
    description:
      'Senha do usuário (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial)',
    example: 'SenhaSuperSegura2025!',
  })
  @IsString({ message: 'A senha deve ser uma string' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&)',
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'Código MFA (6 dígitos) – obrigatório se o usuário tiver MFA ativo',
    example: '123456',
  })
  @IsOptional()
  @IsString({ message: 'O código MFA deve ser uma string' })
  @Length(6, 6, { message: 'O código MFA deve ter exatamente 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'O código MFA deve conter apenas números' })
  mfaCode?: string;

  @ApiPropertyOptional({
    description: 'Código de backup (usado quando o usuário perde acesso ao app autenticador)',
    example: 'A1B2-C3D4-E5F6',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Código de backup inválido. Formato esperado: A1B2-C3D4-E5F6',
  })
  backupCode?: string;

  @ApiPropertyOptional({
    description: 'Manter sessão ativa por 30 dias (remember me)',
    example: false,
    default: false,
  })
  @IsOptional()
  rememberMe?: boolean = false;
}