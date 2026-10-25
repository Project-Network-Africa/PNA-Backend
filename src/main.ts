import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for frontend communication (Vercel / Localhost)
  app.enableCors();

  // Configure Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('PN Africa Backend API')
    .setDescription('API documentation for the PN Africa talent platform webapp (Applicants, Mentors, Employers, Admin, Payments)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter Supabase/JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3300;
  await app.listen(port);
  console.log(` PN Africa Backend is running on: http://localhost:${port}`);
  console.log(` Swagger Docs available at: http://localhost:${port}/api/docs`);

}
await bootstrap();
