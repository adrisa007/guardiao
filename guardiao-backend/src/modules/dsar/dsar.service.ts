// src/modules/dsar/dsar.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateDsarDto } from './dto/create-dsar.dto';
import { UpdateDsarStatusDto } from './dto/update-dsar-status.dto';
import { QueryDsarDto } from './dto/query-dsar.dto';
import { DsarEntity, StatusDsar } from './entities/dsar.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DsarService {
  private readonly logger = new Logger(DsarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // ===============================
  // 1. CRIAR SOLICITAÇÃO DSAR
  // ===============================
  async create(dto: CreateDsarDto, titularId?: string) {
    // Gera protocolo sequencial único
    const ano = new Date().getFullYear();
    const contador = (await this.prisma.dsarRequest.count()) + 1;
    const protocolo = `DSAR-${ano}-${String(contador).padStart(6, '0')}`;

    // Calcula prazo legal (15 dias corridos)
    const dataPrevistaResposta = new Date();
    dataPrevistaResposta.setDate(dataPrevistaResposta.getDate() + 15);

    const dsar = await this.prisma.dsarRequest.create({
      data: {
        protocolo,
        tipoDireito: dto.tipo,
        titularId: titularId || null,
        titularNome: dto.nome.trim(),
        titularCpf: dto.cpf.replace(/\D/g, ''),
        titularEmail: dto.email.toLowerCase(),
        titularTelefone: dto.telefone?.replace(/\D/g, '') || null,
        descricao: dto.descricao?.trim() || null,
        status: StatusDsar.ABERTO,
        dataPrevistaResposta,
      },
    });

    this.logger.log(`Nova DSAR criada: ${protocolo} – ${dto.tipo}`);

    // E-mail automático para o DPO
    await this.sendEmailToDpo(dsar);

    return {
      protocolo,
      dataPrevistaResposta: dataPrevistaResposta.toISOString(),
      message: 'Solicitação enviada com sucesso!',
    };
  }

  // ===============================
  // 2. LISTAR POR TITULAR
  // ===============================
  async findByTitular(titularId: string, query: QueryDsarDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.dsarRequest.findMany({
        where: { titularId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dsarRequest.count({ where: { titularId } }),
    ]);

    return {
      data: data.map((d) => this.mapToEntity(d)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // ===============================
  // 3. LISTAR TODAS (DPO)
  // ===============================
  async findAll(query: QueryDsarDto) {
    const { page = 1, limit = 20, status, tipo, cpf } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (tipo) where.tipoDireito = tipo;
    if (cpf) where.titularCpf = { contains: cpf.replace(/\D/g, '') };

    const [data, total] = await Promise.all([
      this.prisma.dsarRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { anexos: true } } },
      }),
      this.prisma.dsarRequest.count({ where }),
    ]);

    return {
      data: data.map((d) => this.mapToEntity(d)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===============================
  // 4. BUSCAR UMA DSAR
  // ===============================
  async findOne(id: string): Promise<DsarEntity> {
    const dsar = await this.prisma.dsarRequest.findUnique({
      where: { id },
    });

    if (!dsar) {
      throw new NotFoundException(`DSAR ${id} não encontrada`);
    }

    return this.mapToEntity(dsar);
  }

  // ===============================
  // 5. ATUALIZAR STATUS (DPO)
  // ===============================
  async updateStatus(id: string, dto: UpdateDsarStatusDto, dpoId: string) {
    const dsar = await this.findOne(id);

    if (dsar.status === StatusDsar.RESPONDIDO || dsar.status === StatusDsar.ARQUIVADO) {
      throw new BadRequestException('Esta solicitação já foi respondida ou arquivada');
    }

    const updated = await this.prisma.dsarRequest.update({
      where: { id },
      data: {
        status: dto.status,
        respostaDpo: dto.respostaDpo,
        anexoUrl: dto.anexoUrl || null,
        anexoPath: dto.anexoPath || null,
        motivoIndeferimento: dto.motivoIndeferimento || null,
        respondidoPorId: dpoId,
        dataResposta: new Date(),
      },
    });

    this.logger.log(`DSAR ${id} atualizada para ${dto.status} por DPO ${dpoId}`);

    // E-mail automático ao titular
    await this.sendResponseEmail(updated);

    return this.mapToEntity(updated);
  }

  // ===============================
  // 6. DOWNLOAD DO ANEXO
  // ===============================
  async getResponseFile(id: string) {
    const dsar = await this.findOne(id);

    if (!dsar.anexoPath && !dsar.anexoUrl) {
      throw new NotFoundException('Nenhum anexo disponível');
    }

    if (dsar.anexoPath) {
      const filePath = path.resolve(dsar.anexoPath);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Arquivo não encontrado no servidor');
      }

      return {
        buffer: fs.readFileSync(filePath),
        filename: path.basename(filePath),
        contentType: this.getContentType(filePath),
      };
    }

    // Se for URL externa (ex: S3, Cloudinary)
    return {
      url: dsar.anexoUrl,
      filename: `resposta-dsar-${dsar.protocolo}.pdf`,
    };
  }

  // ===============================
  // HELPERS PRIVADOS
  // ===============================
  private async sendEmailToDpo(dsar: any) {
    await this.mailer.sendMail({
      to: 'dpo@empresa.com.br',
      subject: `Nova DSAR – ${dsar.protocolo}`,
      template: './new-dsar-notification',
      context: { dsar },
    });
  }

  private async sendResponseEmail(dsar: any) {
    await this.mailer.sendMail({
      to: dsar.titularEmail,
      subject: `Resposta DSAR – ${dsar.protocolo}`,
      template: './email-response',
      context: {
        titularNome: dsar.titularNome,
        protocolo: dsar.protocolo,
        status: dsar.status,
        respostaDpo: dsar.respostaDpo,
        anexoUrl: dsar.anexoUrl,
      },
      attachments: dsar.anexoPath ? [{ path: dsar.anexoPath }] : [],
    });
  }

  private getContentType(filepath: string): string {
    const ext = path.extname(filepath).toLowerCase();
    const types: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.json': 'application/json',
    };
    return types[ext] || 'application/octet-stream';
  }

  private mapToEntity(data: any): DsarEntity {
    const entity = new DsarEntity();
    Object.assign(entity, data);
    return entity;
  }
}