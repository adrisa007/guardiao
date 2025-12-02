// src/modules/auth/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth Module (e2e) – Integração Completa', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  // Dados de teste
  const testDpo = {
    id: 'usr_e2e_dpo_001',
    email: 'dpo.e2e@guardiao.com.br',
    nome: 'DPO E2E',
    tipo: 'DPO',
    controladoraId: 'ctrl_e2e_001',
    senhaHash: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get(PrismaService);

    await app.init();

    // === LIMPEZA E SETUP DO BANCO ===
    await prisma.$executeRaw`TRUNCATE TABLE "Usuario", "Controladora" RESTART IDENTITY CASCADE;`;

    // Cria controladora
    await prisma.controladora.create({
      data: { id: testDpo.controladoraId, razaoSocial: 'E2E Controladora', cnpj: '12345678000199' },
    });

    // Cria DPO com senha hasheada
    testDpo.senhaHash = await bcrypt.hash('Senha@2025E2E', 12);
    await prisma.usuario.create({
      data: {
        id: testDpo.id,
        email: testDpo.email,
        nome: testDpo.nome,
        senhaHash: testDpo.senhaHash,
        tipo: testDpo.tipo,
        controladoraId: testDpo.controladoraId,
        ativo: true,
        termoConfidAssinado: true,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('/auth/login (POST) → deve fazer login com sucesso', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testDpo.email,
        password: 'Senha@2025E2E',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.access_token).toBeDefined();
    expect(response.body.user.email).toBe(testDpo.email);
    expect(response.body.user.tipo).toBe('DPO');

    // Salva tokens para próximos testes
    accessToken = response.body.access_token;
    refreshToken = response.headers['set-cookie'][0].match(/refresh_token=([^;]+)/)[1];
  });

  it('/auth/me (GET) → deve retornar dados do usuário logado', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testDpo.id);
        expect(res.body.data.tipo).toBe('DPO');
      });
  });

  it('/auth/refresh (POST) → deve renovar token com sucesso', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.access_token).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('refresh_token');
  });

  it('/auth/mfa/enable (POST) → deve habilitar MFA e retornar QR Code', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/mfa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.qrCode).toContain('data:image/png;base64');
    expect(response.body.data.secret).toMatch(/^[A-Z2-7]{16}$/);
    expect(response.body.data.backupCodes).toHaveLength(10);
  });

  it('/auth/me/password (PATCH) → deve alterar senha', async () => {
    await request(app.getHttpServer())
      .patch('/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Senha@2025E2E',
        password: 'NovaSenha@2025E2E!',
        passwordConfirmation: 'NovaSenha@2025E2E!',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Senha alterada com sucesso');
      });
  });

  it('/auth/logout (POST) → deve fazer logout e limpar cookie', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.headers['set-cookie'][0]).toContain('refresh_token=;');
      });
  });

  it('deve bloquear acesso sem JWT', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });
});