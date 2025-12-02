// src/modules/dsar/dsar.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';

import { DsarService } from './dsar.service';
import { CreateDsarDto } from './dto/create-dsar.dto';
import { UpdateDsarStatusDto } from './dto/update-dsar-status.dto';
import { QueryDsarDto } from './dto/query-dsar.dto';

import { AuthGuard } from '@nestjs/passport';
import { DsarOwnerGuard } from './guards/dsar-owner.guard';
import { ValidateDsarTypePipe } from './pipes/validate-dsar-type.pipe';

@ApiTags('Portal DSAR – Direitos do Titular')
@Controller('dsar')
export class DsarController {
  constructor(private readonly dsarService: DsarService) {}

  // ===============================
  // 1. TITULAR CRIA SOLICITAÇÃO
  // ===============================
  @Post()
  @UsePipes(ValidateDsarTypePipe)
  @ApiOperation({ summary: 'Titular cria nova solicitação de direito (com ou sem login)' })
  @ApiResponse({ status: 201, description: 'Solicitação criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() dto: CreateDsarDto, @Req() req: any) {
    const titularId = req.user?.id || dto.titularId;
    const result = await this.dsarService.create(dto, titularId);

    return {
      success: true,
      message: 'Solicitação recebida com sucesso! Você receberá atualizações por e-mail.',
      protocolo: result.protocolo,
      prazoLegal: '15 dias corridos',
      dataPrevistaResposta: result.dataPrevistaResposta,
    };
  }

  // ===============================
  // 2. TITULAR LISTA SUAS SOLICITAÇÕES
  // ===============================
  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Titular vê todas as suas solicitações' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async findMy(@Req() req: any, @Query() query: QueryDsarDto) {
    const titularId = req.user.id;
    const result = await this.dsarService.findByTitular(titularId, query);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // ===============================
  // 3. DPO LISTA TODAS AS SOLICITAÇÕES
  // ===============================
  @Get()
  @UseGuards(AuthGuard('jwt'), DsarOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPO lista todas as solicitações (com filtros)' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'tipo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(@Query() query: QueryDsarDto) {
    const result = await this.dsarService.findAll(query);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // ===============================
  // 4. DPO CONSULTA DETALHE DE UMA SOLICITAÇÃO
  // ===============================
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), DsarOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPO ou Titular consulta detalhe da solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  async findOne(@Param('id') id: string) {
    const result = await this.dsarService.findOne(id);

    return {
      success: true,
      data: result,
    };
  }

  // ===============================
  // 5. DPO RESPONDE / ATUALIZA STATUS
  // ===============================
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), DsarOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPO responde solicitação (envia anexo + muda status)' })
  @ApiResponse({ status: 200, description: 'Resposta enviada com sucesso' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDsarStatusDto,
    @Req() req: any,
  ) {
    const dpoId = req.user.id;
    const result = await this.dsarService.updateStatus(id, dto, dpoId);

    return {
      success: true,
      message: 'Resposta enviada com sucesso! Titular notificado por e-mail.',
      data: result,
    };
  }

  // ===============================
  // 6. TITULAR BAIXA ANEXO DA RESPOSTA
  // ===============================
  @Get(':id/response')
  @UseGuards(AuthGuard('jwt'), DsarOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Titular baixa arquivo da resposta (PDF/ZIP/JSON)' })
  @ApiResponse({ status: 200, description: 'Arquivo enviado' })
  @Header('Content-Type', 'application/octet-stream')
  @Header('Content-Disposition', 'attachment')
  async downloadResponse(@Param('id') id: string, @Res() res: Response) {
    const file = await this.dsarService.getResponseFile(id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    return res.send(file.buffer);
  }
}