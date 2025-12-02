// src/modules/consentimento/interfaces/consentimento.repository.interface.ts
import { ConsentimentoEntity } from '../entities/consentimento.entity';
import { CreateConsentimentoDto } from '../dto/create-consentimento.dto';
import { UpdateConsentimentoDto } from '../dto/update-consentimento.dto';
import { QueryConsentimentoDto } from '../dto/query-consentimento.dto';

export interface PaginatedConsentimentoResult {
  data: ConsentimentoEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ConsentimentoRepositoryInterface {
  /**
   * Cria um novo consentimento
   */
  create(
    dto: CreateConsentimentoDto,
    colaboradorId: string | null,
  ): Promise<ConsentimentoEntity>;

  /**
   * Busca todos os consentimentos com filtro e paginação
   */
  findAll(
    query: QueryConsentimentoDto,
    userId: string,
    userTipo: string,
    controladoraId?: string,
  ): Promise<PaginatedConsentimentoResult>;

  /**
   * Busca um consentimento por ID (com joins completos)
   */
  findOne(id: string): Promise<ConsentimentoEntity | null>;

  /**
   * Busca consentimentos de um titular específico
   */
  findByTitularId(
    titularId: string,
    ativo?: boolean,
  ): Promise<ConsentimentoEntity[]>;

  /**
   * Busca consentimentos por tipo de consentimento
   */
  findByTipoConsentimentoId(
    tipoId: string,
    ativo?: boolean,
  ): Promise<ConsentimentoEntity[]>;

  /**
   * Atualiza um consentimento existente
   */
  update(
    id: string,
    dto: UpdateConsentimentoDto,
  ): Promise<ConsentimentoEntity>;

  /**
   * Revoga um consentimento (soft delete + motivo)
   */
  revoke(
    id: string,
    motivo: string,
    revogadoPor: string,
  ): Promise<ConsentimentoEntity>;

  /**
   * Remove permanentemente (apenas ROOT e com justificativa ANPD)
   */
  remove(id: string): Promise<void>;

  /**
   * Conta total de consentimentos ativos por controladora
   */
  countAtivos(controladoraId: string): Promise<number>;

  /**
   * Exporta todos os consentimentos para relatório ANPD (CSV/JSON)
   */
  exportAll(
    controladoraId: string,
    formato: 'csv' | 'json',
  ): Promise<string | Buffer>;

  /**
   * Verifica se o usuário tem permissão sobre o consentimento
   */
  userHasAccess(
    consentimentoId: string,
    userId: string,
    userTipo: string,
    controladoraId?: string,
  ): Promise<boolean>;
}