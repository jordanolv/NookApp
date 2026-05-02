import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AUTH, type AuthInstance } from './auth/auth.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const auth = app.get<AuthInstance>(AUTH);
  const httpAdapter = app.getHttpAdapter().getInstance();
  const webOrigin = process.env.NUXT_PUBLIC_WEB_URL ?? 'http://localhost:3001';

  // CORS applied on the raw Express app so it covers /api/auth/* (which bypasses
  // NestJS middleware) as well as all NestJS-managed routes.
  httpAdapter.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin === webOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Better Auth needs to handle its own body parsing and the full request URL —
  // mount with httpAdapter.all so req.url stays /api/auth/... inside the handler.
  httpAdapter.all('/api/auth/*', toNodeHandler(auth));

  const { json, urlencoded } = await import('express');
  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('NookApp API')
    .setDescription('Multi-tenant virtual office API')
    .setVersion('0.0.0')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`api listening on http://localhost:${port}`);
}

void bootstrap();
