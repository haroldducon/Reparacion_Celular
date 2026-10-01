import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './common/upload.util';
import { validarEntorno } from './config/env';

async function bootstrap() {
  validarEntorno();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Render está detrás de un proxy; necesario para el rate limit por IP real
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // crossOriginResourcePolicy "cross-origin": el frontend (Vercel) carga las fotos desde este dominio.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // Fotos: nombres aleatorios (UUID), sin listado de directorio, sin ejecutar nada.
  // En producción real conviene mover esto a S3/R2/Cloudinary: el disco de Render es efímero
  // salvo que montes un Persistent Disk y apuntes UPLOAD_DIR a él.
  app.useStaticAssets(UPLOAD_DIR, {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cache-Control', 'private, max-age=86400');
    },
  });

  const origenes = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  app.enableCors({
    origin: origenes,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta cualquier campo no declarado en el DTO
      forbidNonWhitelisted: true, // rechaza el request si viene un campo extra
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
