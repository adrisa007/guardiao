// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { randomUUID } from 'crypto';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';

interface JwtPayload {
  sub: string;
  email: string;
  tipo: string;
  controladoraId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenBlacklist = new Set<string>(); // Em produção: use Redis

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  // ====================== LOGIN ======================
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        nome: true,
        email: true,
        senhaHash: true,
        tipo: true,
        controladoraId: true,
        ativo: true,
        bloqueado: true,
        termoConfidAssinado: true,
        termoValidade: true,
        mfaSecret: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.ativo || usuario.bloqueado) {
      throw new UnauthorizedException('Conta desativada ou bloqueada');
    }

    const senhaValida = await bcrypt.compare(dto.password, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verifica termo de confidencialidade (LGPD Art. 46)
    if (!usuario.termoConfidAssinado) {
      throw new ForbiddenException('Termo de confidencialidade não assinado');
    }
    if (usuario.termoValidade && new Date(usuario.termoValidade) < new Date()) {
      throw new ForbiddenException('Termo de confidencialidade vencido');
    }

    // Atualiza último login
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    // MFA obrigatório se habilitado
    if (usuario.mfaSecret) {
      return {
        mfaRequired: true,
        message: 'Código MFA necessário',
      };
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      controladoraId: usuario.controladoraId,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.generateRefreshToken(usuario.id),
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        controladoraId: usuario.controladoraId,
        mfaEnabled: !!usuario.mfaSecret,
      },
    };
  }

  // ====================== REGISTER ======================
  async register(dto: RegisterDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existe) throw new ConflictException('E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(dto.password, 12);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        email: dto.email.toLowerCase(),
        senhaHash,
        tipo: dto.tipo,
        controladoraId: dto.controladoraId,
        ativo: true,
        termoConfidAssinado: false,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        controladoraId: true,
      },
    });

    this.logger.log(`Usuário criado: ${usuario.email} (${usuario.tipo})`);

    return usuario;
  }

  // ====================== REFRESH TOKEN ======================
  private generateRefreshToken(userId: string): string {
    const token = randomUUID();
    this.refreshTokenBlacklist.add(token);

    // Expira em 7 dias
    setTimeout(() => this.refreshTokenBlacklist.delete(token), 7 * 24 * 60 * 60 * 1000);

    return token;
  }

  async refreshToken(oldToken: string) {
    if (!this.refreshTokenBlacklist.has(oldToken)) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    this.refreshTokenBlacklist.delete(oldToken);

    const usuario = await this.prisma.usuario.findFirst({
      where: { ativo: true },
      select: { id: true, email: true, tipo: true, controladoraId: true },
    });

    if (!usuario) throw new UnauthorizedException();

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      controladoraId: usuario.controladoraId,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.generateRefreshToken(usuario.id),
    };
  }

  async invalidateRefreshToken(token: string) {
    this.refreshTokenBlacklist.delete(token);
  }

  // ====================== CHANGE PASSWORD ======================
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { senhaHash: true },
    });

    if (!usuario) throw new BadRequestException('Usuário não encontrado');

    const senhaValida = await bcrypt.compare(currentPassword, usuario.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Senha atual incorreta');

    const novaHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { senhaHash: novaHash },
    });

    this.logger.log(`Senha alterada para usuário ${userId}`);
  }

  // ====================== MFA – HABILITAR ======================
  async enableMfa(userId: string, dto: EnableMfaDto = {}) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new BadRequestException('Usuário não encontrado');

    const secret = authenticator.generateSecret();
    const appName = dto.appName || `Guardião LGPD - ${usuario.nome.split(' ')[0]}`;
    const otpauth = authenticator.keyuri(usuario.email, appName, secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    // Gera 10 códigos de backup
    const backupCodes = Array.from({ length: 10 }, () =>
      `${randomUUID().slice(0, 4).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    );

    // Salva secret temporário e backup codes
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        mfaSecretTemp: secret,
        mfaBackupCodes: backupCodes,
      },
    });

    );

    // Envia e-mail com QR Code
    await this.mailer.sendMail({
      to: dto.email || usuario.email,
      subject: 'Ative a Autenticação de Dois Fatores – Guardião LGPD',
      template: './mfa-qrcode',
      context: {
        nome: usuario.nome,
        qrCode,
        secret,
        backupCodes,
        appUrl: this.configService.get('FRONTEND_URL') || 'https://app.guardiao.com.br',
      },
    });

    return { qrCode, secret, backupCodes };
  }

  // ====================== MFA – VERIFICAR E ATIVAR ======================
  async verifyAndActivateMfa(userId: string, code: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { mfaSecretTemp: true, mfaBackupCodes: true },
    });

    if (!usuario?.mfaSecretTemp) {
      throw new BadRequestException('MFA não foi iniciado');
    }

    const isValid = authenticator.check(code, usuario.mfaSecretTemp) ||
      usuario.mfaBackupCodes?.includes(code);

    if (!isValid) {
      throw new UnauthorizedException('Código MFA ou backup inválido');
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        mfaSecret: usuario.mfaSecretTemp,
        mfaSecretTemp: null,
        // Remove código usado da lista de backup
        mfaBackupCodes: usuario.mfaBackupCodes?.filter(c => c !== code) || null,
      },
    });

    this.logger.log(`MFA ativado com sucesso para usuário ${userId}`);
  }

  // ====================== MFA – DESABILITAR ======================
  async disableMfa(userId: string, code: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!usuario?.mfaSecret) {
      throw new BadRequestException('MFA não está ativo');
    }

    const isValid = authenticator.check(code, usuario.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedException('Código inválido');
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { mfaSecret: null, mfaBackupCodes: null },
    });

    this.logger.log(`MFA desativado para usuário ${userId}`);
  }
}