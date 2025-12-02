// src/modules/auth/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca os roles exigidos na rota ou no controller
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não houver @Roles() → permite acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não houver usuário autenticado → deixa o AuthGuard tratar
    if (!user) {
      return true;
    }

    // Verifica se o usuário tem algum dos papéis exigidos
    const hasRole = requiredRoles.some((role) => user.tipo === role);

    if (!hasRole) {
      throw new ForbiddenException({
        message: 'Acesso negado: você não possui permissão para esta ação',
        requiredRoles,
        userRole: user.tipo,
        error: 'INSUFFICIENT_ROLE',
      });
    }

    return true;
  }
}