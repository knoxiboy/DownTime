import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

let cachedApp: any;

export default async (req: any, res: any) => {
  if (!cachedApp) {
    cachedApp = await NestFactory.create(AppModule);
    cachedApp.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    await cachedApp.init();
  }
  const instance = cachedApp.getHttpAdapter().getInstance();
  instance(req, res);
};
