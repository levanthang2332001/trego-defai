import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

// Configure dotenv with explicit path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: ['http://localhost:3000', 'https://tasmil-finance.vercel.app'],
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Add cookie-parser middleware
  app.use(cookieParser());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('DeFai Agent API')
    .setDescription(
      'Comprehensive API documentation for DeFai Agent - a DeFi platform offering trading, liquidity provision, staking, lending, and yield farming services with voice-enabled interactions and intelligent intent recognition',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap().catch((error) => {
  console.error('Application failed to start', error);
  process.exit(1);
});
