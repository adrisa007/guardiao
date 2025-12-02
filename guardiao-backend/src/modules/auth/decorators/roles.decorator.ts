// src/modules/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * @Roles(UserRole.DPO, UserRole.ROOT)
 * 
 * Decorador para restringir acesso a rotas por papel (RBAC)
 * Usado junto com RolesGuard
 * 
 * Exemplos:
 * @Roles(UserRole.DPO)           → apenas DPO
 * @Roles(UserRole.ROOT)          → apenas ROOT
 * @Roles(UserRole.DPO, UserRole.ROOT) → DPO ou ROOT
 * @Roles(UserRole.TITULAR)       → apenas o próprio titular (verifica owner)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator => {
  return SetMetadata(ROLES_KEY, roles);
};