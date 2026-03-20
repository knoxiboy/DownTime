import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

export default async (req: any, res: any) => {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.init();
  const instance = app.getHttpAdapter().getInstance();
  instance(req, res);
};
