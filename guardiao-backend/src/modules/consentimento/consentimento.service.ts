// src/modules/consentimento/consentimento.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConsentimentoRepository } from './repositories/consentimento.repository';
import { CreateConsentimentoDto } from './dto/create-consentimento.dto';
import { UpdateConsentimentoDto } from './dto/update-consentimento.dto';
import { QueryConsentimentoDto } from './dto/query-consentimento.dto';
import { ConsentimentoEntity } from './entities/consentimento.entity';

interface AuthenticatedUser {
  id: string;
  tipo: string;
  controladoraId?: string;
}

@Injectable()
export class ConsentimentoService {
  private readonly logger = new Logger(ConsentimentoService.name);

  constructor(private readonly repository: ConsentimentoRepository) {}

  /**
   * Cria um novo consentimento
   */
  async create(
    dto: CreateConsentimentoDto & { _validatedTipoConsentimento?: any },
    colaboradorId: string,
  ): Promise<ConsentimentoEntity> {
    this.logger.log(`Criando consentimento para titular ${dto.titularId} por colaborador ${colaboradorId}`);

    // Validação extra (caso o pipe tenha sido bypassado)
    if (!dto.titularId || !dto.tipoConsentimentoId || !dto.baseLegalId) {
      throw new BadRequestException('titularId, tipoConsentimentoId e baseLegalId são obrigatórios');
    }

    const consentimento = await this.repository.create(dto, colaboradorId);

    this.logger.log(`Consentimento criado com sucesso: ${consentimento.id} | Hash: ${consentimento.comprovanteHash}`);

    return consentimento;
  }

  /**
   * Lista consentimentos com filtros e paginação
   */
  async findAll(
    query: QueryConsentimentoDto,
    userId: string,
    userTipo: string,
    controladoraId?: string,
  ) {
    this.logger.log(`Listando consentimentos - usuário: ${userId} (${userTipo})`);

    return this.repository.findAll(query, userId, userTipo, controladoraId);
  }

  /**
   * Busca um consentimento por ID
   */
  async findOne(id: string): Promise<ConsentimentoEntity> {
    const consentimento = await this.repository.findOne(id);

    if (!consentimento) {
      throw new NotFoundException(`Consentimento com ID ${id} não encontrado`);
    }

    return consentimento;
  }

  /**
   * Busca todos os consentimentos de um titular
   */
  async findByTitularId(titularId: string, ativo = true): Promise<ConsentimentoEntity[]> {
    return this.repository.findByTitularId(titularId, ativo);
  }

  /**
   * Atualiza um consentimento existente
   */
  async update(
    id: string,
    dto: UpdateConsentimentoDto,
    user: AuthenticatedUser,
  ): Promise<ConsentimentoEntity> {
    this.logger.log(`Atualizando consentimento ${id} por usuário ${user.id}`);

    // Verifica existência
    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Consentimento ${id} não encontrado`);
    }

    // Verifica permissão
    const hasAccess = await this.repository.userHasAccess(id, user.id, user.tipo, user.controladoraId);
    if (!hasAccess) {
      throw new ForbiddenException('Você não tem permissão para alterar este consentimento');
    }

    // Impede alteração de campos críticos após criação
    if ('titularId' in dto || 'tipoConsentimentoId' in dto || 'baseLegalId' in dto) {
      throw new ForbiddenException('Não é permitido alterar titular, tipo ou base legal após criação');
    }

    return this.repository.update(id, dto);
  }

  /**
   * Revoga um consentimento
   */
  async revoke(
    id: string,
    motivo: string,
    user: AuthenticatedUser,
  ): Promise<ConsentimentoEntity> {
    if (!motivo || motivo.trim().length < 5) {
      throw new BadRequestException('O motivo da revogação é obrigatório e deve ter pelo menos 5 caracteres');
    }

    this.logger.warn(`Revogação solicitada para consentimento ${id} por ${user.id} - Motivo: ${motivo}`);

    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Consentimento ${id} não encontrado`);
    }

    if (existing.status === 'REVOGADO') {
      throw new BadRequestException('Este consentimento já foi revogado');
    }

    const hasAccess = await this.repository.userHasAccess(id, user.id, user.tipo, user.controladoraId);
    if (!hasAccess) {
      throw new ForbiddenException('Você não tem permissão para revogar este consentimento');
    }

    const revogado = await this.repository.revoke(id, motivo.trim(), user.id);

    this.logger.warn(`Consentimento ${id} revogado com sucesso`);

    return revogado;
  }

  /**
   * Remove permanentemente (APENAS ROOT + justificativa ANPD)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (user.tipo !== 'ROOT') {
      throw new ForbiddenException('Apenas usuários ROOT podem remover permanentemente consentimentos');
    }

    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Consentimento ${id} não encontrado`);
    }

    this.logger.error(`REMOCAO PERMANENTE de consentimento ${id} por ROOT ${user.id}`);

    await this.repository.remove(id);
  }

  /**
   * Conta consentimentos ativos da controladora
   */
  async countAtivos(controladoraId: string): Promise<number> {
    return this.repository.countAtivos(controladoraId);
  }

  /**
   * Exporta todos os consentimentos (para relatório ANPD)
   */
  async exportAll(controladoraId: string, formato: 'csv' | 'json' = 'json'): Promise<string | Buffer> {
    this.logger.log(`Exportando todos os consentimentos da controladora ${controladoraId} em ${formato.toUpperCase()}`);

    return this.repository.exportAll(controladoraId, formato);
  }
}