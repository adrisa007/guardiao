// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';

jest.mock('bcrypt');
jest.mock('otplib');

describe('AuthService - Unit Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('deve fazer login com sucesso quando credenciais corretas', async () => {
      const mockUser = {
        id: 'usr_123',
        email: 'dpo@teste.com',
        nome: 'DPO Teste',
        senhaHash: 'hashed-password',
        tipo: 'DPO',
        controladoraId: 'ctrl_001',
        ativo: true,
        termoConfidAssinado: true,
        mfaSecret: null,
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-access-token');
      (global as any).crypto.randomUUID = jest.fn(() => 'refresh-token-uuid');

      const result = await service.login({
        email: 'dpo@teste.com',
        password: 'Senha@2025',
      });

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBe('refresh-token-uuid');
      expect(result.user.email).toBe('dpo@teste.com');
      expect(result.user.mfaEnabled).toBe(false);
    });

    it('deve exigir MFA quando mfaSecret existe', async () => {
      const mockUser = {
        id: 'usr_123',
        email: 'dpo@teste.com',
        senhaHash: 'hashed',
        ativo: true,
        termoConfidAssinado: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'dpo@teste.com',
        password: 'Senha@2025',
      });

      expect(result.mfaRequired).toBe(true);
      expect(result.message).toBe('Código MFA necessário');
    });

    it('deve rejeitar senha incorreta', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ senhaHash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'dpo@teste.com', password: 'errada' }),
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('register()', () => {
    it('deve criar usuário com sucesso', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.usuario.create.mockResolvedValue({
        id: 'usr_new',
        nome: 'Novo Usuário',
        email: 'novo@teste.com',
        tipo: 'COLABORADOR',
      });

      const result = await service.register({
        nome: 'Novo Usuário',
        email: 'novo@teste.com',
        password: 'Senha@2025',
        tipo: 'COLABORADOR',
        controladoraId: 'ctrl_001',
      });

      expect(result.email).toBe('novo@teste.com');
      expect(mockPrisma.usuario.create).toHaveBeenCalled();
    });

    it('deve rejeitar e-mail duplicado', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ email: 'existe@teste.com' });

      await expect(
        service.register({
          nome: 'Teste',
          email: 'existe@teste.com',
          password: 'Senha@2025',
          tipo: 'COLABORADOR',
          controladoraId: 'ctrl_001',
        }),
      ).rejects.toThrow('E-mail já cadastrado');
    });
  });

  describe('enableMfa()', () => {
    it('deve gerar QR Code e secret', async () => {
      const mockUser = { id: 'usr_123', email: 'dpo@teste.com' };
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);
      (authenticator.generateSecret as jest.Mock).mockReturnValue('JBSWY3DPEHPK3PXP');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://...');

      const result = await service.enableMfa('usr_123');

      expect(result.qrCode).toContain('data:image/png;base64');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'usr_123' },
        data: { mfaSecretTemp: 'JBSWY3DPEHPK3PXP' },
      });
    });
  });

  describe('verifyAndActivateMfa()', () => {
    it('deve ativar MFA com código válido', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        mfaSecretTemp: 'JBSWY3DPEHPK3PXP',
      });
      (authenticator.check as jest.Mock).mockReturnValue(true);

      await expect(
        service.verifyAndActivateMfa('usr_123', '123456'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'usr_123' },
        data: { mfaSecret: 'JBSWY3DPEHPK3PXP', mfaSecretTemp: null },
      });
    });

    it('deve rejeitar código inválido', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        mfaSecretTemp: 'JBSWY3DPEHPK3PXP',
      });
      (authenticator.check as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyAndActivateMfa('usr_123', '000000'),
      ).rejects.toThrow('Código MFA inválido');
    });
  });

  describe('changePassword()', () => {
    it('deve alterar senha com sucesso', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ senhaHash: 'old-hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await expect(
        service.changePassword('usr_123', 'SenhaAtual@2025', 'NovaSenha@2025!'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'usr_123' },
        data: { senhaHash: 'new-hashed-password' },
      });
    });
  });
});