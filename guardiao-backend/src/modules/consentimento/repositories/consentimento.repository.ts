// src/modules/consentimento/repositories/consentimento.repository.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConsentimentoEntity } from '../entities/consentimento.entity';
import { CreateConsentimentoDto } from '../dto/create-consentimento.dto';
import { UpdateConsentimentoDto } from '../dto/update-consentimento.dto';
import { QueryConsentimentoDto } from '../dto/query-consentimento.dto';
import { ConsentimentoRepositoryInterface, PaginatedConsentimentoResult } from '../interfaces/consentimento.repository.interface';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ConsentimentoRepository implements ConsentimentoRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  // ====================== CREATE ======================
  async create(
    dto: CreateConsentimentoDto & { _validatedTipoConsentimento?: any },
    colaboradorId: string | null,
  ): Promise<ConsentimentoEntity> {
    const comprovanteHash = this.gerarHashComprovante(dto);

    const data = await this.prisma.consentimento.create({
      data: {
        titularId: dto.titularId,
        colaboradorId,
        tipoConsentimentoId: dto.tipoConsentimentoId,
        baseLegalId: dto.baseLegalId,
        canalColeta: dto.canalColeta,
        classificacaoDados: dto.classificacaoDados,
        documentosSolicitados: dto.documentosSolicitados || [],
        localArmazenamento: dto.localArmazenamento,
        anexoProva: dto.anexoProva,
        comprovanteHash,
        dataColeta: new Date(),
        ativo: true,
      },
      include: {
        titular: { select: { nome: true, cpf: true } },
        tipoConsentimento: { select: { nome: true, codigo: true } },
        baseLegal: { select: { codigo: true } },
        colaborador: { select: { nome: true } },
      },
    });

    return this.mapToEntity(data);
  }

  // ====================== FIND ALL + PAGINAÇÃO ======================
  async findAll(
    query: QueryConsentimentoDto,
    userId: string,
    userTipo: string,
    controladoraId?: string,
  ): Promise<PaginatedConsentimentoResult> {
    const where: Prisma.ConsentimentoWhereInput = {
      ativo: true,
    };

    // Filtros opcionais
    if (query.titularId) where.titularId = query.titularId;
    if (query.tipoConsentimentoId) where.tipoConsentimentoId = query.tipoConsentimentoId;
    if (query.dataInicio || query.dataFim) {
      where.dataColeta = {};
      if (query.dataInicio) where.dataColeta.gte = new Date(query.dataInicio);
      if (query.dataFim) where.dataColeta.lte = new Date(query.dataFim);
    }

    // Restrição por controladora (segurança crítica)
    if (userTipo !== 'ROOT') {
      where.titular = { controladoraId: controladoraId };
    }

    const [data, total] = await Promise.all([
      this.prisma.consentimento找到了.findMany({
        where,
        include: {
          titular: { select: { nome: true, cpf: true } },
          tipoConsentimento: { select: { nome: true } },
          baseLegal: { select: { codigo: true } },
          colaborador: { select: { nome: true } },
        },
        orderBy: { dataColeta: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.consentimento.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToEntity(item)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page < Math.ceil(total / query.limit),
        hasPrev: query.page > 1,
      },
    };
  }

  // ====================== FIND ONE ======================
  async findOne(id: string): Promise<ConsentimentoEntity | null> {
    const data = await this.prisma.consentimento.findUnique({
      where: { id },
      include: {
        titular: { select: { nome: true, cpf: true } },
        tipoConsentimento: { select: { nome: true, codigo: true } },
        baseLegal: { select: { codigo: true } },
        colaborador: { select: { nome: true } },
      },
    });

    return data ? this.mapToEntity(data) : null;
  }

  // ====================== FIND BY TITULAR ======================
  async findByTitularId(titularId: string, ativo = true): Promise<ConsentimentoEntity[]> {
    const data = await this.prisma.consentimento.findMany({
      where: { titularId, ativo },
      include: {
        tipoConsentimento: { select: { nome: true } },
        baseLegal: { select: { codigo: true } },
      },
      orderBy: { dataColeta: 'desc' },
    });

    return data.map((item) => this.mapToEntity(item));
  }

  // ====================== UPDATE ======================
  async update(id: string, dto: UpdateConsentimentoDto): Promise<ConsentimentoEntity> {
    const updated = await this.prisma.consentimento.update({
      where: { id },
      data: {
        ...dto,
        comprovanteHash: dto.anexoProva ? this.gerarHashComprovante(dto) : undefined,
      },
      include: {
        titular: { select: { nome: true, cpf: true } },
        tipoConsentimento: true,
        baseLegal: true,
        colaborador: true,
      },
    });

    return this.mapToEntity(updated);
  }

  // ====================== REVOKE ======================
  async revoke(id: string, motivo: string, revogadoPor: string): Promise<ConsentimentoEntity> {
    const revoked = await this.prisma.consentimento.update({
      where: { id },
      data: {
        dataRevogacao: new Date(),
        motivoRevogacao: motivo,
        ativo: false,
        // Auditoria automática via trigger no banco ou interceptor
      },
      include: {
        titular: { select: { nome: true, cpf: true } },
        tipoConsentimento: true,
        baseLegal: true,
      },
    });

    return this.mapToEntity(revoked);
  }

  // ====================== REMOVE (ROOT ONLY) ======================
  async remove(id: string): Promise<void> {
    await this.prisma.consentimento.delete({ where: { id } });
  }

  // ====================== COUNT ATIVOS ======================
  async countAtivos(controladoraId: string): Promise<number> {
    return this.prisma.consentimento.count({
      where: { ativo: true, titular: { controladoraId } },
    });
  }

  // ====================== EXPORT ======================
  async exportAll(controladoraId: string, formato: 'csv' | 'json' = 'json'): Promise<string | Buffer> {
    const data = await this.prisma.consentimento.findMany({
      where: { titular: { controladoraId } },
      include: {
        titular: { select: { nome: true, cpf: true } },
        tipoConsentimento: { select: { nome: true } },
        baseLegal: { select: { codigo: true } },
      },
    });

    if (formato === 'json') {
      return JSON.stringify(data.map((d) => this.mapToEntity(d)), null, 2);
    }

    // CSV simples
    const headers = [
      'id',
      'titular_nome',
      'titular_cpf',
      'tipo_consentimento',
      'base_legal',
      'data_coleta',
      'status',
    ];
    const rows = data.map((d) => [
      d.id,
      d.titular?.nome || '',
      d.titular?.cpf || '',
      d.tipoConsentimento?.nome || '',
      d.baseLegal?.codigo || '',
      d.dataColeta.toISOString(),
      d.ativo ? 'ATIVO' : 'REVOGADO',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return Buffer.from(csv, 'utf-8');
  }

  // ====================== USER HAS ACCESS ======================
  async userHasAccess(
    consentimentoId: string,
    userId: string,
    userTipo: string,
    controladoraId?: string,
  ): Promise<boolean> {
    const consentimento = await this.prisma.consentimento.findUnique({
      where: { id: consentimentoId },
      select: {
        titular: { select: { usuarioId: true, controladoraId: true } },
        colaboradorId: true,
      },
    });

    if (!consentimento) return false;

    if (userTipo === 'ROOT') return true;
    if (userTipo === 'DPO' && controladoraId === consentimento.titular?.controladoraId) return true;
    if (userTipo === 'COLABORADOR' && consentimento.colaboradorId === userId) return true;
    if (userTipo === 'TITULAR' && consentimento.titular?.usuarioId === userId) return true;

    return false;
  }

  // ====================== HELPERS ======================
  private gerarHashComprovante(dto: any): string {
    const str = `${dto.titularId}-${dto.tipoConsentimentoId}-${Date.now()}-${Math.random()}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  private mapToEntity(data: any): ConsentimentoEntity {
    return new ConsentimentoEntity({
      ...data,
      titularNome: data.titular?.nome,
      titularCpfMascarado: data.titular?.cpf ? `***.${data.titular.cpf.slice(3, 9)}-**` : undefined,
      tipoConsentimentoNome: data.tipoConsentimento?.nome || data.tipoConsentimento?.codigo,
      baseLegalCodigo: data.baseLegal?.codigo,
      colaboradorNome: data.colaborador?.nome || 'Sistema',
      status: data.ativo ? 'ATIVO' : 'REVOGADO',
    });
  }
}