// src/modules/consentimento/consentimento.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Res,
  HttpStatus,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';

import { ConsentimentoService } from './consentimento.service';
import { CreateConsentimentoDto } from './dto/create-consentimento.dto';
import { UpdateConsentimentoDto } from './dto/update-consentimento.dto';
import { RevokeConsentimentoDto } from './dto/revoke-consentimento.dto';
import { QueryConsentimentoDto } from './dto/query-consentimento.dto';
import { ValidateTipoConsentimentoPipe } from './pipes/validate-tipo-consentimento.pipe';
import { ConsentimentoOwnerGuard } from './guards/consentimento-owner.guard';
import { AuditCriarConsentimento, AuditRevogarConsentimento, AuditAlterarConsentimento, AuditExportarComprovante } from './decorators/consentimento-audit.decorator';

import { AuthGuard } from '@nestjs/passport';

@ApiTags('Consentimentos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('consentimentos')
export class ConsentimentoController {
  constructor(private readonly service: ConsentimentoService) {}

  // ====================== CRIAR ======================
  @Post()
  @AuditCriarConsentimento()
  @UsePipes(ValidateTipoConsentimentoPipe)
  )
  @ApiOperation({ summary: 'Criar novo consentimento' })
  @ApiResponse({ status: 201, description: 'Consentimento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() dto: CreateConsentimentoDto, @Req() req: any) {
    const colaboradorId = req.user.id;
    const result = await this.service.create(dto, colaboradorId);

    return {
      success: true,
      message: 'Consentimento registrado com sucesso',
      data: result,
    };
  }

  // ====================== LISTAR COM PAGINAÇÃO ======================
  @Get()
  @ApiOperation({ summary: 'Listar consentimentos com filtros e paginação' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'titularId', required: false, type: String })
  @ApiQuery({ name: 'tipoConsentimentoId', required: false, type: String })
  async findAll(@Query() query: QueryConsentimentoDto, @Req() req: any) {
    const { id: userId, tipo: userTipo, controladoraId } = req.user;

    const result = await this.service.findAll(query, userId, userTipo, controladoraId);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // ====================== BUSCAR POR ID ======================
  @Get(':id')
  @UseGuards(ConsentimentoOwnerGuard)
  @ApiOperation({ summary: 'Buscar consentimento por ID' })
  @ApiParam({ name: 'id', description: 'ID do consentimento' })
  @ApiResponse({ status: 200, description: 'Consentimento encontrado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);

    return {
      success: true,
      data: result,
    };
  }

  // ====================== ATUALIZAR ======================
  @Patch(':id')
  @UseGuards(ConsentimentoOwnerGuard)
  @AuditAlterarConsentimento()
  @ApiOperation({ summary: 'Atualizar dados do consentimento (ex: canal, anexos)' })
  @ApiResponse({ status: 200, description: 'Atualizado com sucesso' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConsentimentoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const result = await this.service.update(id, dto, user);

    return {
      success: true,
      message: 'Consentimento atualizado',
      data: result,
    };
  }

  // ====================== REVOGAR ======================
  @Delete(':id')
  @UseGuards(ConsentimentoOwnerGuard)
  @AuditRevogarConsentimento()
  @ApiOperation({ summary: 'Revogar consentimento' })
  @ApiBody({ type: RevokeConsentimentoDto })
  @ApiResponse({ status: 200, description: 'Consentimento revogado' })
  async revoke(
    @Param('id') id: string,
    @Body() dto: RevokeConsentimentoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const result = await this.service.revoke(id, dto.motivo, user);

    return {
      success: true,
      message: 'Consentimento revogado com sucesso',
      data: result,
    };
  }

  // ====================== EXPORTAR TODOS (ANPD) ======================
  @Get('export/:formato(csv|json)')
  @AuditExportarComprovante()
  @ApiOperation({ summary: 'Exportar todos os consentimentos da controladora (CSV ou JSON)' })
  @ApiResponse({ status: 200, description: 'Arquivo gerado' })
  async export(
    @Param('formato') formato: 'csv' | 'json',
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { controladoraId } = req.user;
    const buffer = await this.service.exportAll(controladoraId, formato);

    const filename = `consentimentos_export_${new Date().toISOString().split('T')[0]}.${formato}`;

    res.set({
      'Content-Type': formato === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return res.send(buffer);
  }

  // ====================== CONTAGEM ATIVOS (DASHBOARD) ======================
  @Get('dashboard/count-ativos')
  @ApiOperation({ summary: 'Retorna quantidade de consentimentos ativos da controladora' })
  async countAtivos(@Req() req: any) {
    const { controladoraId } = req.user;
    const total = await this.service.countAtivos(controladoraId);

    return {
      success: true,
      data: { total },
    };
  }
}