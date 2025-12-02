// src/modules/auth/entities/user.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';

@Exclude() // Nunca expõe nada por padrão – segurança máxima
export class UserEntity {
  @ApiProperty({
    description: 'ID único do usuário (UUID v4)',
    example: 'usr_1234567890abcdef1234567890abcdef',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Ana Clara Oliveira Santos',
  })
  @Expose()
  nome: string;

  @ApiProperty({
    description: 'E-mail corporativo (único e verificado)',
    example: 'ana.oliveira@empresa.com.br',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema',
    enum: UserRole,
    example: UserRole.DPO,
  })
  @Expose()
  tipo: UserRole;

  @ApiProperty({
    description: 'ID da controladora (empresa) à qual o usuário pertence',
    example: 'ctrl_abcdef1234567890',
  })
  @Expose()
  controladoraId: string;

  @ApiPropertyOptional({
    description: 'Nome da controladora (populado via JOIN)',
    example: 'Minha Empresa S/A',
  })
  @Expose()
  controladoraNome?: string;

  @ApiPropertyOptional({
    description: 'CPF do usuário (apenas números)',
    example: '12345678909',
  })
  @Expose()
  cpf?: string | null;

  @ApiPropertyOptional({
    description: 'Departamento do usuário',
    example: 'Tecnologia da Informação',
  })
  @Expose()
  departamento?: string | null;

  @ApiPropertyOptional({
    description: 'Telefone com DDD',
    example: '(11) 98765-4321',
  })
  @Expose()
  telefone?: string | null;

  @ApiProperty({
    description: 'Status da conta',
    example: true,
  })
  @Expose()
  ativo: boolean;

  @ApiProperty({
    description: 'MFA (autenticação de dois fatores) está ativado?',
    example: true,
  })
  @Expose()
  mfaEnabled: boolean;

  @ApiProperty({
    description: 'Termo de confidencialidade foi assinado?',
    example: true,
  })
  @Expose()
  termoConfidAssinado: boolean;

  @ApiPropertyOptional({
    description: 'Data de validade do termo de confidencialidade',
    example: '2026-12-31T23:59:59Z',
  })
  @Expose()
  termoValidade?: Date | null;

  @ApiProperty({
    description: 'Data do último login',
    example: '2025-12-04T14:30:22Z',
  })
  @Expose()
  ultimoLogin?: Date | null;

  @ApiProperty({
    description: 'Data de criação da conta',
    example: '2025-01-15T09:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-12-04T14:30:22Z',
  })
  @Expose()
  updatedAt: Date;

  // Campos sensíveis NUNCA expostos
  @Exclude()
  senhaHash?: string;

  @Exclude()
  mfaSecret?: string | null;

  @Exclude()
  mfaSecretTemp?: string | null;

  @Exclude()
  bloqueado?: boolean;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}