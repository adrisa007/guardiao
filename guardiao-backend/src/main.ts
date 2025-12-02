// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // Cria aplicação com Express (necessário para arquivos estáticos e uploads)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
  });

  const configService = app.get(ConfigService);

  // ===============================
  // CONFIGURAÇÕES GLOBAIS
  // ===============================
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Pipes globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Filtros e interceptors globais
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ===============================
  // ARQUIVOS ESTÁTICOS (uploads, comprovantes, etc.)
  // ===============================
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  app.useStaticAssets(join(__dirname, '..', 'comprovantes'), {
    prefix: '/comprovantes/',
  });

  // ===============================
  // SWAGGER (Documentação automática)
  // ===============================
  const config = new DocumentBuilder()
    .setTitle('Guardião LGPD v12.6')
    .setDescription('Plataforma Oficial de Conformidade LGPD – PoderGov Tecnologia')
    .setVersion('12.6.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e MFA')
    .addTag('consentimentos', 'Gestão de Consentimentos')
    .addTag('dsar', 'Portal do Titular – Direitos LGPD')
    .addTag('titulares', 'Cadastro e Portal do Titular')
    .addTag('prestadores', 'Gestão de Operadores')
    .addTag('dashboard', 'Dashboard DPO')
    .addTag('relatorios', 'Relatórios ANPD')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css',
    customJs: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });

  // ===============================
  // HEALTH CHECK
  // ===============================
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      version: '12.6.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ===============================
  // PORTA E INICIALIZAÇÃO
  // ===============================
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      GUARDIÃO LGPD v12.6                     ║
║  Plataforma Oficial de Conformidade – PoderGov 2025          ║
╚══════════════════════════════════════════════════════════════╝
`);
  console.log(`API rodando em: http://localhost:${port}/api`);
  console.log(`Documentação Swagger: http://localhost:${port}/swagger`);
  console.log(`Health Check: http://localhost:${port}/health`);
  console.log(`Ambiente: ${configService.get('NODE_ENV') || 'development'}`);
}

void bootstrap();