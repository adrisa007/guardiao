// src/modules/consentimento/decorators/consentimento-audit.decorator.ts
import {
  SetMetadata,
  CustomDecorator,
  applyDecorators,
  UseInterceptors,
} from '@nestjs/common';
import { ConsentimentoAuditInterceptor } from '../interceptors/consentimento-audit.interceptor';

// Chave usada no metadata do NestJS
export const CONSENTIMENTO_AUDIT_KEY = 'consentimento_audit';

/**
 * @ConsentimentoAudit()
 * 
 * Decorador que ativa a auditoria completa de consentimento.
 * 
 * Funcionalidades gravadas automaticamente na tabela auditoria_global:
 *  - Criação de consentimento
 *  - Revogação
 *  - Alteração de dados
 *  - Exportação de comprovante
 * 
 * Exemplo de uso:
 * 
 * @ConsentimentoAudit('CRIACAO')
 * @Post()
 * create(@Body() dto: CreateConsentimentoDto) { ... }
 * 
 * @param operacao Tipo da operação (CRIACAO | REVOGACAO | ALTERACAO | EXPORTACAO)
 * @param incluirDadosTitular Inclui CPF/e-mail do titular no log (default: false)
 */
export const ConsentimentoAudit = (
  operacao: 'CRIACAO' | 'REVOGACAO' | 'ALTERACAO' | 'EXPORTACAO' | 'LEITURA',
  incluirDadosTitular = false,
): CustomDecorator<string> => {
  return applyDecorators(
    SetMetadata(CONSENTIMENTO_AUDIT_KEY, {
      operacao,
      incluirDadosTitular,
      timestamp: new Date().toISOString(),
    }),
    UseInterceptors(ConsentimentoAuditInterceptor),
  );
};

/**
 * Versões pré-configuradas mais usadas
 */
export const AuditCriarConsentimento = () => ConsentimentoAudit('CRIACAO', true);
export const AuditRevogarConsentimento = () => ConsentimentoAudit('REVOGACAO', true);
export const AuditAlterarConsentimento = () => ConsentimentoAudit('ALTERACAO', false);
export const AuditExportarComprovante = () => ConsentimentoAudit('EXPORTACAO', true);
export const AuditVisualizarConsentimento = () => ConsentimentoAudit('LEITURA', false);