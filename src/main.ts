import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const microServiceOptions: MicroserviceOptions = {
  transport: Transport.REDIS,
  options: {
    url: process.env.REDIS_URL
  }
}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    microServiceOptions
  );
  await app.listen();
}
bootstrap();
