import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggerService } from './common/logger/logger.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);

  const enableCors = configService.get<boolean>('ENABLE_CORS');
  const port = configService.get<number>('PORT');
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (enableCors) {
    app.enableCors();
    loggerService.log('CORS enabled', 'Bootstrap');
  }

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

  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('Vehicle Valuation and Financing API Service')
    .setDescription(
      'API service for vehicle valuation and financing operations. Provides endpoints for user authentication, vehicle data management and vlauation requests, loan applications and financing calculations.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'refresh-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  loggerService.log(
    `Starting application in ${nodeEnv} environment`,
    'Bootstrap',
  );

  await app.listen(port || 3000);

  loggerService.log(
    `Application listening on http://localhost:${port || 3000}`,
    'Bootstrap',
  );
  loggerService.log(
    `Swagger documentation available at http://localhost:${port || 3000}/docs`,
    'Bootstrap',
  );
}
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
