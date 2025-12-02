// src/modules/consentimento/consentimento.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConsentimentoController } from './consentimento.controller';
import { ConsentimentoService } from './consentimento.service';
import { AuthGuard } from '@nestjs/passport';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ValidateTipoConsentimentoPipe } from './pipes/validate-tipo-consentimento.pipe';
import { ConsentimentoOwnerGuard } from './guards/consentimento-owner.guard';

// Mock do usuário autenticado (vem do JwtStrategy)
const mockUser = {
  id: 'usr_1234567890abcdef',
  email: 'dpo@empresa.com.br',
  nome: 'João DPO',
  tipo: 'DPO',
  controladoraId: 'ctrl_1111111111',
};

const mockConsentimento = {
  id: 'cons_abcdef1234567890',
  titularId: 'tit_9876543210',
  titularNome: 'Maria Silva',
  titularCpfMascarado: '***.456.789-**',
  tipoConsentimentoId: 'tipo_1111111111',
  tipoConsentimentoNome: 'MARKETING_EMAIL',
  baseLegalId: 'base_2222222222',
  baseLegalCodigo: 'ART7_I',
  classificacaoDados: ['DADOS_PESSOAIS'],
  canalColeta: 'Formulário Web',
  dataColeta: new Date().toISOString(),
  status: 'ATIVO',
  colaboradorId: mockUser.id,
  colaboradorNome: 'João DPO',
  comprovanteHash: 'sha256:abc123...',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ConsentimentoController (e2e)', () => {
  let app: INestApplication;
  let service: ConsentimentoService;

  const mockConsentimentoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
  };

  // Mock do AuthGuard (sempre permite)
  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock do OwnerGuard (sempre permite nos testes)
  const mockOwnerGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentimentoController],
      providers: [
        {
          provide: ConsentimentoService,
          useValue: mockConsentimentoService,
        },
        {
          provide: ValidateTipoConsentimentoPipe,
          useValue: { transform: (value) => value }, // bypass
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(ConsentimentoOwnerGuard)
      .useValue(mockOwnerGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/consentimentos (POST) - Criar consentimento', () => {
    it('deve criar consentimento com sucesso', async () => {
      const createDto = {
        titularId: 'tit_9876543210',
        tipoConsentimentoId: 'tipo_1111111111',
        baseLegalId: 'base_2222222222',
        classificacaoDados: ['DADOS_PESSOAIS'],
        canalColeta: 'Formulário Web',
      };

      mockConsentimentoService.create.mockResolvedValue(mockConsentimento);

      return request(app.getHttpServer())
        .post('/consentimentos')
        .set('Authorization', 'Bearer fake-jwt')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockConsentimento.id);
          expect(res.body.data.titularNome).toBe('Maria Silva');
        });
    });

    it('deve falhar se titularId estiver faltando', () => {
      return request(app.getHttpServer())
        .post('/consentimentos')
        .set('Authorization', 'Bearer fake-jwt')
        .send({ tipoConsentimentoId: 'tipo_1111111111' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('titularId');
        });
    });
  });

  describe('/consentimentos (GET) - Listar com paginação', () => {
    it('deve retornar lista paginada', async () => {
      mockConsentimentoService.findAll.mockResolvedValue({
        data: [mockConsentimento],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      return request(app.getHttpServer())
        .get('/consentimentos')
        .set('Authorization', 'Bearer fake-jwt')
        .query({ page: 1, limit: 20 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.meta.total).toBe(1);
        });
    });
  });

  describe('/consentimentos/:id (GET) - Buscar um', () => {
    it('deve retornar consentimento por ID', async () => {
      mockConsentimentoService.findOne.mockResolvedValue(mockConsentimento);

      return request(app.getHttpServer())
        .get(`/consentimentos/${mockConsentimento.id}`)
        .set('Authorization', 'Bearer fake-jwt')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(mockConsentimento.id);
          expect(res.body.data.status).toBe('ATIVO');
        });
    });

    it('deve retornar 404 se não encontrado', async () => {
      mockConsentimentoService.findOne.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/consentimentos/invalido-123')
        .set('Authorization', 'Bearer fake-jwt')
        .expect(404);
    });
  });

  describe('/consentimentos/:id (PATCH) - Atualizar', () => {
    it('deve atualizar canalColeta com sucesso', async () => {
      const updated = { ...mockConsentimento, canalColeta: 'WhatsApp' };
      mockConsentimentoService.update.mockResolvedValue(updated);

      return request(app.getHttpServer())
        .patch(`/consentimentos/${mockConsentimento.id}`)
        .set('Authorization', 'Bearer fake-jwt')
        .send({ canalColeta: 'WhatsApp' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.canalColeta).toBe('WhatsApp');
        });
    });
  });

  describe('/consentimentos/:id (DELETE) - Revogar', () => {
    it('deve revogar com motivo', async () => {
      const revogado = { ...mockConsentimento, status: 'REVOGADO', motivoRevogacao: 'Pedido do titular' };
      mockConsentimentoService.revoke.mockResolvedValue(revogado);

      return request(app.getHttpServer())
        .delete(`/consentimentos/${mockConsentimento.id}`)
        .set('Authorization', 'Bearer fake-jwt')
        .send({ motivo: 'Pedido do titular' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('REVOGADO');
          expect(res.body.data.motivoRevogacao).toBe('Pedido do titular');
        });
    });
  });

  it('deve proteger rotas sem JWT', async () => {
    return request(app.getHttpServer())
      .get('/consentimentos')
      .expect(401);
  });
});