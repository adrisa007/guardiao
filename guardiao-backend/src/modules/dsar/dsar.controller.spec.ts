// src/modules/dsar/dsar.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DsarController } from './dsar.controller';
import { DsarService } from './dsar.service';
import { ValidateDsarTypePipe } from './pipes/validate-dsar-type.pipe';
import { DsarOwnerGuard } from './guards/dsar-owner.guard';
import { AuthGuard } from '@nestjs/passport';
import { TipoDireitoLGPD } from './entities/dsar.entity';

const mockUser = {
  id: 'usr_dpo_123',
  tipo: 'DPO',
  controladoraId: 'ctrl_001',
  email: 'dpo@teste.com',
};

const mockDsarResponse = {
  success: true,
  message: 'Solicitação recebida com sucesso!',
  protocolo: 'DSAR-2025-000147',
  prazoLegal: '15 dias corridos',
  tipo: TipoDireitoLGPD.ACESSO_AOS_DADOS,
};

describe('DsarController - Unit Tests', () => {
  let controller: DsarController;
  let service: DsarService;

  const mockDsarService = {
    create: jest.fn(),
    findByTitular: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
    getResponseFile: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };
  const mockOwnerGuard = { canActivate: jest.fn(() => true) };
  const mockValidatePipe = { transform: jest.fn((value) => value) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DsarController],
      providers: [
        { provide: DsarService, useValue: mockDsarService },
        { provide: ValidateDsarTypePipe, useValue: mockValidatePipe },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(DsarOwnerGuard)
      .useValue(mockOwnerGuard)
      .compile();

    controller = module.get<DsarController>(DsarController);
    service = module.get<DsarService>(DsarService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('deve criar DSAR com sucesso (titular autenticado)', async () => {
      const dto = {
        tipo: TipoDireitoLGPD.ACESSO_AOS_DADOS,
        email: 'maria@email.com',
        nome: 'Maria Silva',
        cpf: '12345678909',
      };

      mockDsarService.create.mockResolvedValue(mockDsarResponse);

      const req = { user: mockUser };
      const result = await controller.create(dto as any, req as any);

      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toEqual({
        success: true,
        message: 'Solicitação criada com sucesso',
        ...mockDsarResponse,
      });
    });

    it('deve criar DSAR com sucesso (titular não autenticado)', async () => {
      const dto = {
        tipo: TipoDireitoLGPD.PORTABILIDADE,
        email: 'jose@email.com',
        nome: 'José Santos',
        cpf: '98765432100',
        titularId: 'tit_123456',
      };

      mockDsarService.create.mockResolvedValue(mockDsarResponse);

      const req = { user: null };
      const result = await controller.create(dto as any, req as any);

      expect(service.create).toHaveBeenCalledWith(dto, 'tit_123456');
      expect(result.success).toBe(true);
    });
  });

  describe('findMy()', () => {
    it('deve listar solicitações do titular autenticado', async () => {
      const mockList = {
        success: true,
        data: [{ protocolo: 'DSAR-2025-000147', status: 'RESPONDIDO' }],
        meta: { total: 1, page: 1, limit: 10 },
      };

      mockDsarService.findByTitular.mockResolvedValue(mockList);

      const req = { user: { id: 'tit_123456' } };
      const result = await controller.findMy(req as any, { page: 1, limit: 10 });

      expect(service.findByTitular).toHaveBeenCalledWith('tit_123456', { page: 1, limit: 10 });
      expect(result).toEqual(mockList);
    });
  });

  describe('findAll()', () => {
    it('deve listar todas as DSARs (DPO)', async () => {
      const mockAdminList = {
        success: true,
        data: [],
        meta: { total: 42 },
      };

      mockDsarService.findAll.mockResolvedValue(mockAdminList);

      const result = await controller.findAll({ status: 'ABERTO' });

      expect(service.findAll).toHaveBeenCalledWith({ status: 'ABERTO' });
      expect(result).toEqual(mockAdminList);
    });
  });

  describe('update()', () => {
    it('deve atualizar status da DSAR (DPO)', async () => {
      const updateDto = {
        status: 'RESPONDIDO',
        respostaDpo: 'Dados enviados em anexo.',
        anexoUrl: 'https://storage.guardiao.com.br/dsar-147.pdf',
      };

      const mockUpdated = { success: true, data: { protocolo: 'DSAR-2025-000147', status: 'RESPONDIDO' } };
      mockDsarService.updateStatus.mockResolvedValue(mockUpdated);

      const result = await controller.update('dsar_123', updateDto);

      expect(service.updateStatus).toHaveBeenCalledWith('dsar_123', updateDto);
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('downloadResponse()', () => {
    it('deve retornar arquivo de resposta', async () => {
      const mockFile = { success: true, url: 'https://storage.guardiao.com.br/...' };
      mockDsarService.getResponseFile.mockResolvedValue(mockFile);

      const result = await controller.downloadResponse('dsar_123');

      expect(service.getResponseFile).toHaveBeenCalledWith('dsar_123');
      expect(result).toEqual(mockFile);
    });
  });
});