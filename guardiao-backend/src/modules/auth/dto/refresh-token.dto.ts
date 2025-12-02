// src/modules/auth/dto/refresh-token.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token recebido no login (httpOnly cookie ou body)',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  @IsString({ message: 'O refresh_token deve ser uma string' })
  @IsNotEmpty({ message: 'O refresh_token é obrigatório' })
  @Matches(/^[0-9a-f]{8-]{36}$/, {
    message: 'Formato do refresh_token inválido',
  })
  refresh_token: string;

  @ApiPropertyOptional({
    description: 'Dispositivo ou identificador do cliente (opcional – usado para auditoria)',
    example: 'Chrome 129 - Windows 11',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'IP do cliente (opcional – usado para detecção de sessão roubada)',
    example: '189.45.123.67',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}$/, {
    message: 'IP inválido',
  })
  ipAddress?: string;
}