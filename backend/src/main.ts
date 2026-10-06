import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');

  // Security Headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Global Prefix
  app.setGlobalPrefix(prefix);

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MaskayPet - API Modular')
    .setDescription(
      'Documentación interactiva de la API REST para la plataforma de identificación inteligente, pasaporte de salud y Modo Perdido de MaskayPet.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT emitido en /auth/login o /auth/register',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'MaskayPet - API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
    },
  });

  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`🚀 MaskayPet Backend API corriendo en puerto: ${port}`);
  logger.log(`🔗 API Base: http://localhost:${port}/${prefix}`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/docs`);
  logger.log(`=======================================================`);
}

bootstrap();
