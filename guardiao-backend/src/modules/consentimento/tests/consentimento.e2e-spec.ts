// src/modules/consentimento/consentimento.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';

describe('ConsentimentoController (e2e) - Integração Completa', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let createdConsentimentoId: string;

  // Dados de teste reutilizáveis
  const testControladora = { id: 'ctrl_test_e2e_001', razaoSocial: 'Teste E2E Ltda', cnpj: '12345678000199' };
  const testDpo = { id: 'usr_dpo_e2e_001', email: 'dpo.e2e@teste.com', tipo: 'DPO', controladoraId: testControladora.id };
  const testTitular = { id: 'tit_e2e_001', cpf: '12345678909', nome: 'Titular E2E' };
  const testTipoConsentimento = { id: 'tipo_e2e_001', nome: 'MARKETING_E2E', codigo: 'MKT999', controladoraId: testControladora.id, ativo: true };
  const testBaseLegal = { id: 'base_e2e_001', codigo: 'ART7_I', descricao: 'Consentimento explícito' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    prisma = app.get(PrismaService);

    await app.init();

    // === LIMPEZA E SETUP DO BANCO ===
    await prisma.$executeRaw`TRUNCATE TABLE "Consentimento", "Usuario", "Controladora", "Titular", "TipoConsentimento", "BaseLegal" RESTART IDENTITY CASCADE;`;

    // Cria controladora
    await prisma.controladora.create({ data: testControladora });

    // Cria DPO com senha hasheada
    await prisma.usuario.create({
      data: {
        ...testDpo,
        nome: 'DPO E2E',
        senhaHash: await bcrypt.hash('Senha@123', 12),
        ativo: true,
      },
    });

    // Cria titular
    await prisma.titular.create({
      data: {
        ...testTitular,
        controladoraId: testControladora.id,
      },
    });

    // Cria tipo e base legal
    await prisma.tipoConsentimento.create({ data: testTipoConsentimento });
    await prisma.baseLegal.create({ data: testBaseLegal });

    // === LOGIN PARA GERAR JWT ===
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testDpo.email, password: 'Senha@123' });

    jwtToken = loginResponse.body.access_token;
    expect(jwtToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('/consentimentos (POST) → deve criar consentimento com sucesso', async () => {
    const response = await request(app.getHttpServer())
      .post('/consentimentos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        titularId: testTitular.id,
        tipoConsentimentoId: testTipoConsentimento.id,
        baseLegalId: testBaseLegal.id,
        classificacaoDados: ['DADOS_PESSOAIS'],
        canalColeta: 'Formulário Web E2E',
        documentosSolicitados: ['selfie.jpg'],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.titularNome).toBe(testTitular.nome);
    expect(response.body.data.tipoConsentimentoNome).toContain('MARKETING_E2E');
    expect(response.body.data.comprovanteHash).toMatch(/^sha256:/);

    createdConsentimentoId = response.body.data.id;
  });

  it('/consentimentos (GET) → deve listar com paginação', async () => {
    const response = await request(app.getHttpServer())
      .get('/consentimentos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.totalPages).toBe(1);
  });

  it('/consentimentos?titularId=... (GET) → filtro por titular', async () => {
    const response = await request(app.getHttpServer())
      .get('/consentimentos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({ titularId: testTitular.id })
      .expect(200);

    expect(response.body.data.every((c: any) => c.titularId === testTitular.id)).toBe(true);
  });

  it('/consentimentos/:id (GET) → deve retornar um consentimento', async () => {
    const response = await request(app.getHttpServer())
      .get(`/consentimentos/${createdConsentimentoId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body.data.id).toBe(createdConsentimentoId);
    expect(response.body.data.canalColeta).toBe('Formulário Web E2E');
  });

  it('/consentimentos/:id (PATCH) → deve atualizar canalColeta', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/consentimentos/${createdConsentimentoId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ canalColeta: 'WhatsApp Business' })
      .expect(200);

    expect(response.body.data.canalColeta).toBe('WhatsApp Business');
  });

  it('/consentimentos/:id (DELETE) → deve revogar com motivo', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/consentimentos/${createdConsentimentoId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ motivo: 'Revogação solicitada pelo titular via portal' })
      .expect(200);

    expect(response.body.data.status).toBe('REVOGADO');
    expect(response.body.data.motivoRevogacao).toBe('Revogação solicitada pelo titular via portal');
    expect(response.body.data.dataRevogacao).toBeDefined();
  });

  it('/consentimentos/:id (GET) → após revogação deve mostrar status REVOGADO', async () => {
    const response = await request(app.getHttpServer())
      .get(`/consentimentos/${createdConsentimentoId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body.data.status).toBe('REVOGADO');
    expect(response.body.data.ativo).toBe(false);
  });

  it('deve bloquear acesso sem JWT', async () => {
    await request(app.getHttpServer())
      .get('/consentimentos')
      .expect(401);
  });

  it('deve bloquear criação com tipoConsentimentoId inválido', async () => {
    await request(app.getHttpServer())
      .post('/consentimentos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        titularId: testTitular.id,
        tipoConsentimentoId: 'invalido-123',
        baseLegalId: testBaseLegal.id,
        classificacaoDados: ['DADOS_PESSOAIS'],
      })
      .expect(400);
  });
});