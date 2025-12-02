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
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { randomUUID } from 'crypto';

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
        mfaSecret: true,
        termoConfidAssinado: true,
        termoValidade: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(dto.password, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verifica termo de confidencialidade
    if (!usuario.termoConfidAssinado || (usuario.termoValidade && new Date(usuario.termoValidade) < new Date())) {
      throw new ForbiddenException('Termo de confidencialidade pendente ou vencido');
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
        tipo: dto.tipo || 'COLABORADOR',
        controladoraId: dto.controladoraId,
        ativo: true,
        termoConfidAssinado: false,
      },
      select: { id: true, nome: true, email: true, tipo: true },
    });

    this.logger.log(`Novo usuário criado: ${usuario.email} (${usuario.tipo})`);

    return usuario;
  }

  // ====================== REFRESH TOKEN ======================
  private generateRefreshToken(userId: string): string {
    const token = randomUUID();
    this.refreshTokenBlacklist.add(token);
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

    const senhaAtualValida = await bcrypt.compare(currentPassword, usuario.senhaHash);
    if (!senhaAtualValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const novaHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { senhaHash: novaHash },
    });

    this.logger.log(`Senha alterada para usuário ${userId}`);
  }

  // ====================== MFA – HABILITAR ======================
  async enableMfa(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new BadRequestException('Usuário não encontrado');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(usuario.email, 'Guardião LGPD', secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { mfaSecretTemp: secret },
    });

    return { qrCode, secret, otpauth };
  }

  // ====================== MFA – VERIFICAR E ATIVAR ======================
  async verifyAndActivateMfa(userId: string, code: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { mfaSecretTemp: true },
    });

    if (!usuario?.mfaSecretTemp) throw new BadRequestException('MFA não iniciado');

    const isValid = authenticator.check(code, usuario.mfaSecretTemp);
    if (!isValid) throw new UnauthorizedException('Código MFA inválido');

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        mfaSecret: usuario.mfaSecretTemp,
        mfaSecretTemp: null,
      },
    });

    this.logger.log(`MFA ativado para usuário ${userId}`);
  }

  // ====================== MFA – DESABILITAR ======================
  async disableMfa(userId: string, code: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!usuario?.mfaSecret) throw new BadRequestException('MFA não ativo');

    const isValid = authenticator.check(code, usuario.mfaSecret);
    if (!isValid) throw new UnauthorizedException('Código inválido');

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { mfaSecret: null },
    });

    this.logger.log(`MFA desativado para usuário ${userId}`);
  }
}