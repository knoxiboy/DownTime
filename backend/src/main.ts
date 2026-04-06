import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {


  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: true, // Allows any origin (e.g. deployed Vercel apps)
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Basic in-memory rate limiting middleware
  const rateLimitMap = new Map<string, { count: number; startTime: number }>();
  app.use((req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    const record = rateLimitMap.get(ip)!;
    if (now - record.startTime > 60000) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    if (record.count >= 100) {
      return res.status(429).json({ message: 'Too many requests' });
    }
    record.count++;
    next();
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 DownTime Backend running on http://localhost:${port}`);
}
bootstrap();
