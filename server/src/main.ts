import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  app.use(helmet());
  app.use(json({ limit: '5mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN').split(',') });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('DatabaseEnjoyer Metadata API')
      .setDescription(
        'Connect to PostgreSQL, MySQL and MongoDB; explore versioned metadata and live data.',
      )
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(config.getOrThrow<number>('API_PORT'), '0.0.0.0');
}

void bootstrap();
