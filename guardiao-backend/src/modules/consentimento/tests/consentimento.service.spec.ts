// src/modules/consentimento/consentimento.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConsentimentoService } from './consentimento.service';
import { ConsentimentoRepository } from './repositories/consentimento.repository';
import { ValidateTipoConsentimentoPipe } from './pipes/validate-tipo-consentimento.pipe';
import { ConsentimentoOwnerGuard } from './guards/consentimento-owner.guard';
import { HttpException, NotFoundException, ForbiddenException } from '@nestjs/common';

const mockUser = {
  id: 'usr_dpo_123',
  tipo: 'DPO',
  controladoraId: 'ctrl_001',
};

const mockConsentimento = {
  id: 'cons_abcdef123456',
  titularId: 'tit_123456',
  titularNome: 'Maria Silva',
  tipoConsentimentoId: 'tipo_001',
  tipoConsentimentoNome: 'MARKETING_EMAIL',
  baseLegalId: 'base_001',
  baseLegalCodigo: 'ART7_I',
  classificacaoDados: ['DADOS_PESSOAIS'],
  canalColeta: 'Formulário Web',
  dataColeta: new Date(),
  status: 'ATIVO',
  colaboradorId: mockUser.id,
  colaboradorNome: 'João DPO',
  comprovanteHash: 'sha256:abc123def456...',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ConsentimentoService - Unit Tests', () => {
  let service: ConsentimentoService;
  let repository: ConsentimentoRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByTitularId: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    remove: jest.fn(),
    countAtivos: jest.fn(),
    userHasAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentimentoService,
        {
          provide: ConsentimentoRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConsentimentoService>(ConsentimentoService);
    repository = module.get<ConsentimentoRepository>(ConsentimentoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('deve criar consentimento com sucesso', async () => {
      const dto = {
        titularId: 'tit_123456',
        tipoConsentimentoId: 'tipo_001',
        baseLegalId: 'base_001',
        classificacaoDados: ['DADOS_PESSOAIS'],
        canalColeta: 'Formulário Web',
        _validatedTipoConsentimento: { nome: 'MARKETING_EMAIL' },
      };

      mockRepository.create.mockResolvedValue(mockConsentimento);

      const result = await service.create(dto as any, mockUser.id);

      expect(repository.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toEqual(mockConsentimento);
      expect(result.comprovanteHash).toMatch(/^sha256:/);
    });

    it('deve lançar erro se repository falhar', async () => {
      const dto = { titularId: 'tit_123' };
      mockRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(dto as any, mockUser.id)).rejects.toThrow(HttpException);
    });
  });

  describe('findAll()', () => {
    it('deve retornar lista paginada', async () => {
      const query = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [mockConsentimento],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
      };

      mockRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query, mockUser.id, mockUser.tipo, mockUser.controladoraId);

      expect(repository.findAll).toHaveBeenCalledWith(query, mockUser.id, mockUser.tipo, mockUser.controladoraId);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne()', () => {
    it('deve retornar consentimento quando encontrado', async () => {
      mockRepository.findOne.mockResolvedValue(mockConsentimento);

      const result = await service.findOne('cons_abcdef123456');

      expect(result).toEqual(mockConsentimento);
    });

    it('deve lançar NotFoundException se não encontrado', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid_id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('deve atualizar e retornar consentimento atualizado', async () => {
      const updateDto = { canalColeta: 'WhatsApp' };
      const updated = { ...mockConsentimento, canalColeta: 'WhatsApp' };

      mockRepository.findOne.mockResolvedValue(mockConsentimento);
      mockRepository.userHasAccess.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update('cons_abcdef123456', updateDto, mockUser);

      expect(repository.update).toHaveBeenCalledWith('cons_abcdef123456', updateDto);
      expect(result.canalColeta).toBe('WhatsApp');
    });

    it('deve lançar ForbiddenException se usuário não tiver acesso', async () => {
      mockRepository.findOne.mockResolvedValue(mockConsentimento);
      mockRepository.userHasAccess.mockResolvedValue(false);

      await expect(
        service.update('cons_abcdef123456', { canalColeta: 'Email' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revoke()', () => {
    it('deve revogar com motivo e retornar status REVOGADO', async () => {
      const motivo = 'Solicitação do titular';
      const revogado = { ...mockConsentimento, status: 'REVOGADO', motivoRevogacao: motivo, ativo: false };

      mockRepository.findOne.mockResolvedValue(mockConsentimento);
      mockRepository.userHasAccess.mockResolvedValue(true);
      mockRepository.revoke.mockResolvedValue(revogado);

      const result = await service.revoke('cons_abcdef123456', motivo, mockUser);

      expect(repository.revoke).toHaveBeenCalledWith('cons_abcdef123456', motivo, mockUser.id);
      expect(result.status).toBe('REVOGADO');
      expect(result.motivoRevogacao).toBe(motivo);
    });

    it('deve impedir revogação sem acesso', async () => {
      mockRepository.findOne.mockResolvedValue(mockConsentimento);
      mockRepository.userHasAccess.mockResolvedValue(false);

      await expect(
        service.revoke('cons_abcdef123456', 'Motivo qualquer', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove()', () => {
    it('deve permitir remoção apenas para ROOT', async () => {
      const rootUser = { ...mockUser, tipo: 'ROOT' };

      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('cons_abcdef123456', rootUser)).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalled();
    });

    it('deve bloquear remoção para DPO/COLABORADOR', async () => {
      await expect(service.remove('cons_abcdef123456', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('countAtivos()', () => {
    it('deve retornar número de consentimentos ativos', async () => {
      mockRepository.countAtivos.mockResolvedValue(42);

      const result = await service.countAtivos(mockUser.controladoraId);

      expect(result).toBe(42);
      expect(repository.countAtivos).toHaveBeenCalledWith(mockUser.controladoraId);
    });
  });
});