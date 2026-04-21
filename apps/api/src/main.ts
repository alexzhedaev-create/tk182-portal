import "reflect-metadata";
import "./common/config/load-env";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { getApplicationConfig } from "./common/config/environment";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configuration = getApplicationConfig();

  app.enableCors({
    origin: configuration.web.allowedOrigins,
    credentials: true
  });

  await app.listen(configuration.api.port, configuration.api.host);

  Logger.log(
    `TK182 API is listening on http://${configuration.api.host}:${configuration.api.port}`,
    "Bootstrap"
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error("Failed to start TK182 API.", error);
  process.exit(1);
});
