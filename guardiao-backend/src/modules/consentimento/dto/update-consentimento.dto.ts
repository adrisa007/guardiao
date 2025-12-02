import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentimentoDto } from './create-consentimento.dto';

export class UpdateConsentimentoDto extends PartialType(CreateConsentimentoDto) {}