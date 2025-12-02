// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';

import { AuthGuard } from '@nestjs/passport';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ====================== LOGIN ======================
  @Post('login')
  @ApiOperation({ summary: 'Login com e-mail + senha (JWT + Refresh Token httpOnly)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas ou MFA necessário' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Se MFA estiver habilitado e ainda não validado nesta sessão
    if (result.mfaRequired) {
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        message: 'Código MFA necessário',
        sessionId: result.sessionId, // opcional para fluxo avançado
      });
    }

    // Define refresh token como cookie httpOnly (mais seguro)
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutos
      user: result.user,
    });
  }

  // ====================== REGISTRO (APENAS ROOT/DPO) ======================
  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo usuário (apenas ROOT ou DPO)' })
  async register(@Body() dto: RegisterDto) {
    const novoUsuario = await this.authService.register(dto);
    return {
      success: true,
      message: 'Usuário criado com sucesso',
      sucesso',
      data: novoUsuario,
    };
  }

  // ====================== REFRESH TOKEN ======================
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access_token usando refresh_token (cookie ou body)' })
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = dto.refresh_token || (req.cookies?.refresh_token as string);

    if (!refreshToken) {
      throw new HttpException('Refresh token não fornecido', HttpStatus.UNAUTHORIZED);
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Atualiza cookie com novo refresh token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      access_token: result.accessToken,
      expires_in: 900,
    });
  }

  // ====================== LOGOUT ======================
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout – invalida refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.authService.invalidateRefreshToken(token);
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  }

  // ====================== PERFIL DO USUÁRIO LOGADO ======================
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  async me(@Req() req: any) {
    return {
      success: true,
      data: req.user,
    };
  }

  // ====================== ALTERAR SENHA ======================
  @Patch('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário logado' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  }

  // ====================== MFA – HABILITAR ======================
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Habilita MFA (Google Authenticator / Authy)' })
  async enableMfa(@Req() req: any) {
    const result = await this.authService.enableMfa(req.user.id);

    return {
      success: true,
      message: 'Escaneie o QR Code no seu app autenticador',
      data: {
        qrCodeUrl: result.qrCode,
        secret: result.secret, // opcional – apenas para debug
        otpauth: result.otpauth,
      },
    };
  }

  // ====================== MFA – VERIFICAR E ATIVAR ======================
  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verifica código MFA e ativa permanentemente' })
  async verifyMfa(@Req() req: any, @Body() dto: VerifyMfaDto) {
    await this.authService.verifyAndActivateMfa(req.user.id, dto.code);

    return {
      success: true,
      message: 'Autenticação de dois fatores ativada com sucesso',
    };
  }

  // ====================== MFA – DESABILITAR ======================
  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desabilita MFA (exige código atual)' })
  async disableMfa(@Req() req: any, @Body() dto: VerifyMfaDto) {
    await this.authService.disableMfa(req.user.id, dto.code);

    return {
      success: true,
      message: 'Autenticação de dois fatores desativada',
    };
  }
}