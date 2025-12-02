// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../prisma/prisma.service';

// Mock do usuário autenticado
const mockUser = {
  id: 'usr_1234567890abcdef',
  email: 'dpo@empresa.com.br',
  nome: 'João DPO',
  tipo: 'DPO',
  controladoraId: 'ctrl_001',
  mfaEnabled: true,
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    invalidateRefreshToken: jest.fn(),
    changePassword: jest.fn(),
    enableMfa: jest.fn(),
    verifyAndActivateMfa: jest.fn(),
    disableMfa: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-access-token'),
    verify: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MailerService, useValue: mockMailerService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/auth/login (POST)', () => {
    it('deve fazer login com sucesso (sem MFA)', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        user: mockUser,
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dpo@empresa.com.br', password: 'Senha@2025' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user.email).toBe('dpo@empresa.com.br');
          expect(res.headers['set-cookie'][0]).toContain('refresh_token');
        });
    });

    it('deve exigir MFA quando ativo', async () => {
      mockAuthService.login.mockResolvedValue({
        mfaRequired: true,
        message: 'Código MFA necessário',
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dpo@empresa.com.br', password: 'Senha@2025' })
        .expect(200)
        .expect((res) => {
          expect(res.body.mfaRequired).toBe(true);
          expect(res.body.message).toBe('Código MFA necessário');
        });
    });
  });

  describe('/auth/register (POST)', () => {
    it('deve registrar novo usuário (DPO/ROOT)', async () => {
      mockAuthService.register.mockResolvedValue({
        id: 'usr_new123',
        nome: 'Novo Usuário',
        email: 'novo@empresa.com.br',
        tipo: 'COLABORADOR',
      });

      return request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          nome: 'Novo Usuário',
          email: 'novo@empresa.com.br',
          password: 'Senha@2025',
          passwordConfirmation: 'Senha@2025',
          tipo: 'COLABORADOR',
          controladoraId: 'ctrl_001',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe('novo@empresa.com.br');
        });
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('deve renovar token com sucesso', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=valid-refresh-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.headers['set-cookie'][0]).toContain('refresh_token');
        });
    });
  });

  describe('/auth/me (GET)', () => {
    it('deve retornar dados do usuário logado', async () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-jwt')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockUser.id);
        });
    });
  });

  describe('/auth/mfa/enable (POST)', () => {
    it('deve habilitar MFA e retornar QR Code', async () => {
      mockAuthService.enableMfa.mockResolvedValue({
        qrCode: 'data:image/png;base64,...',
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['A1B2-C3D4', 'E5F6-G7H8'],
      });

      return request(app.getHttpServer())
        .post('/auth/mfa/enable')
        .set('Authorization', 'Bearer valid-jwt')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.qrCode).toContain('data:image/png');
          expect(res.body.data.backupCodes).toHaveLength(3);
        });
    });
  });

  describe('/auth/logout (POST)', () => {
    it('deve fazer logout e limpar cookie', async () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-jwt')
        .set('Cookie', 'refresh_token=token-to-remove')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.headers['set-cookie'][0]).toContain('refresh_token=;');
        });
    });
  });
});