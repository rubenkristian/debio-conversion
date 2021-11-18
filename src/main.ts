import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

const microServiceOptions: MicroserviceOptions = {
  transport: Transport.REDIS,
  options: {
    url: "redis://localhost:6379"
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
