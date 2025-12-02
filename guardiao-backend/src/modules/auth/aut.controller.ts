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
  UnauthorizedException,
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
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===============================
  // 1. LOGIN
  // ===============================
  @Post('login')
  @ApiOperation({ summary: 'Login com e-mail + senha (JWT + Refresh Token httpOnly)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas ou MFA necessário' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Caso MFA esteja ativo mas ainda não verificado
    if (result.mfaRequired) {
      return {
        success: true,
        mfaRequired: true,
        message: 'Código MFA necessário',
      };
    }

    // Define refresh token como cookie httpOnly (segurança máxima)
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return {
      success: true,
      message: 'Login realizado com sucesso',
      access_token: result.accessToken,
      expires_in: 900, // 15 minutos
      user: result.user,
    };
  }

  // ===============================
  // 2. REGISTRO (APENAS ROOT/DPO)
  // ===============================
  @Post('register')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ROOT, UserRole.DPO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo usuário (apenas ROOT ou DPO)' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: 'Usuário criado com sucesso',
      data: user,
    };
  }

  // ===============================
  // 3. REFRESH TOKEN
  // ===============================
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access_token usando refresh_token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refresh_token || (req.cookies?.refresh_token as string);

    if (!token) {
      throw new UnauthorizedException('Refresh token não fornecido');
    }

    const result = await this.authService.refreshToken(token);

    // Atualiza o cookie com novo refresh token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      access_token: result.accessToken,
      expires_in: 900,
    };
  }

  // ===============================
  // 4. LOGOUT
  // ===============================
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

    return { success: true, message: 'Logout realizado com sucesso' };
  }

  // ===============================
  // 5. PERFIL DO USUÁRIO
  // ===============================
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  async me(@Req() req: any) {
    return { success: true, data: req.user };
  }

  // ===============================
  // 6. ALTERAR SENHA
  // ===============================
  @Patch('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário logado' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.id, dto.currentPassword, dto.password);
    return { success: true, message: 'Senha alterada com sucesso' };
  }

  // ===============================
  // 7. HABILITAR MFA
  // ===============================
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Habilita MFA (Google Authenticator / Authy)' })
  async enableMfa(@Req() req: any, @Body() dto: EnableMfaDto) {
    const result = await this.authService.enableMfa(req.user.id, dto);
    return {
      success: true,
      message: 'Escaneie o QR Code no seu aplicativo autenticador',
      data: result,
    };
  }

  // ===============================
  // 8. VERIFICAR MFA
  // ===============================
  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verifica código MFA e ativa permanentemente' })
  async verifyMfa(@Req() req: any, @Body() dto: VerifyMfaDto) {
    await this.authService.verifyAndActivateMfa(req.user.id, dto.code);
    return { success: true, message: 'MFA ativado com sucesso' };
  }

  // ===============================
  // 9. DESABILITAR MFA
  // ===============================
  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desabilita MFA (exige código atual)' })
  async disableMfa(@Req() req: any, @Body() dto: VerifyMfaDto) {
    await this.authService.disableMfa(req.user.id, dto.code);
    return { success: true, message: 'MFA desativado com sucesso' };
  }
}