import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeConsentimentoDto {
  @ApiProperty({ description: 'Motivo da revogação' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}