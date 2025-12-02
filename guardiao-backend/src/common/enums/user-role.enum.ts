// src/common/enums/user-role.enum.ts
export enum UserRole {
  ROOT = 'ROOT',                    // Acesso total (admin do sistema)
  DPO = 'DPO',                      // Encarregado de Proteção de Dados
  COLABORADOR = 'COLABORADOR',      // Funcionário interno
  PRESTADOR = 'PRESTADOR',          // Operador externo
  TITULAR = 'TITULAR',              // Titular dos dados
}