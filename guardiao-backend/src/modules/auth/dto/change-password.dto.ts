// src/modules/auth/dto/change-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  Validate,
} from 'class-validator';

// Validador customizado para confirmar que as duas senhas são iguais
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(passwordConfirmation: any, args: ValidationArguments) {
    const object = args.object as any;
    return passwordConfirmation === object.password;
  }

  defaultMessage(args: ValidationArguments) {
    return 'As senhas não coincidem';
  }
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'MinhaSenha@2025',
  })
  @IsString({ message: 'A senha atual deve ser uma string' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória' })
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha (mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial)',
    example: 'NovaSenhaSuperSegura123!',
  })
  @IsString({ message: 'A nova senha deve ser uma string' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'A nova senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&)',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Confirmação da nova senha (deve ser idêntica à nova senha)',
    example: 'NovaSenhaSuperSegura123!',
  })
  @IsString({ message: 'A confirmação da senha deve ser uma string' })
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  @Validate(MatchPasswordConstraint, {
    message: 'As senhas não coincidem',
  })
  passwordConfirmation: string;
}