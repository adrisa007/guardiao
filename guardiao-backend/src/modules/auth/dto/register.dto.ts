// src/modules/auth/dto/register.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
  IsUUID,
  Length,
} from 'class-validator';

export enum UserRole {
  ROOT = 'ROOT',
  DPO = 'DPO',
  COLABORADOR = 'COLABORADOR',
  PRESTADOR = 'PRESTADOR',
  TITULAR = 'TITULAR',
}

export class RegisterDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Ana Clara Oliveira Santos',
  })
  @IsString({ message: 'O nome deve ser uma string' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nome: string;

  @ApiProperty({
    description: 'E-mail corporativo (único no sistema)',
    example: 'ana.oliveira@empresa.com.br',
  })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @ApiProperty({
    description:
      'Senha forte (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial)',
    example: 'MinhaSenha@2025Segura!',
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

  @ApiProperty({
    description: 'Confirmação da senha (deve ser idêntica)',
    example: 'MinhaSenha@2025Segura!',
  })
  @IsString()
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  passwordConfirmation: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema (definido pelo DPO/ROOT)',
    enum: UserRole,
    example: UserRole.DPO,
  })
  @IsEnum(UserRole, {
    message: `Tipo inválido. Use: ${Object.values(UserRole).join(', ')}`,
  })
  @IsNotEmpty({ message: 'O tipo de usuário é obrigatório' })
  tipo: UserRole;

  @ApiProperty({
    description: 'ID da controladora (empresa) à qual o usuário pertence',
    example: 'ctrl_1234567890abcdef',
  })
  @IsUUID('4', { message: 'ID da controladora deve ser um UUID válido' })
  @IsNotEmpty({ message: 'A controladora é obrigatória' })
  controladoraId: string;

  @ApiPropertyOptional({
    description: 'CPF do usuário (opcional – usado para auditoria e identificação)',
    example: '12345678909',
  })
  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos' })
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Departamento do colaborador (ex: TI, Jurídico, RH)',
    example: 'Tecnologia da Informação',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  departamento?: string;

  @ApiPropertyOptional({
    description: 'Telefone corporativo com DDD',
    example: '(11) 98765-4321',
  })
  @IsOptional()
  @Matches(/^(\(\d{2}\)\s?)?9\d{4}-\d{4}$/, {
    message: 'Telefone inválido. Formato esperado: (11) 98765-4321',
  })
  telefone?: string;
}