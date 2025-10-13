import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './modules/logger/logger.service';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get logger service for startup logging
  const logger = app.get(LoggerService);

  // Enable helmet for security headers
  app.use(helmet());

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('GitHub Repository Management API')
    .setDescription(
      'REST API for synchronizing, listing, searching, and analyzing GitHub repositories. ' +
        'This API provides endpoints to sync GitHub user repositories to a local database, ' +
        'perform advanced searches, and generate statistical insights.',
    )
    .setVersion('1.0')
    .addTag(
      'repositories',
      'Repository synchronization, listing, and search operations',
    )
    .addTag(
      'statistics',
      'Statistical analysis and insights from repository data',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Log application startup
  logger.log('Application started successfully', {
    port,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    corsOrigins,
    timestamp: new Date().toISOString(),
  });

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
