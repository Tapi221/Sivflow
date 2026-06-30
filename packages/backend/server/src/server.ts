import { NestFactory } from '@nestjs/core';
import { UnknownElementException } from '@nestjs/core/errors/exceptions/unknown-element.exception';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { serverTimingAndCache } from './middleware/timing';
import { env } from './prelude';
import { traceStartup } from './startup-trace';

const OneMB = 1024 * 1024;

export async function run() {
  traceStartup('importing cookie-parser');
  const { default: cookieParser } = await import('cookie-parser');
  traceStartup('importing graphql-upload');
  const { default: graphqlUploadExpress } = await import(
    'graphql-upload/graphqlUploadExpress.mjs'
  );
  traceStartup('importing logger');
  const { AFFiNELogger } = await import('./base/logger');
  traceStartup('importing config');
  const { CONFIG_TOKEN } = await import('./base/config');
  traceStartup('importing cors');
  const {
    buildCorsAllowedOrigins,
    CORS_ALLOWED_HEADERS,
    CORS_ALLOWED_METHODS,
    CORS_EXPOSED_HEADERS,
    corsOriginCallback,
  } = await import('./base/cors');
  traceStartup('importing cache');
  const { CacheInterceptor } = await import('./base/cache');
  traceStartup('importing throttler');
  const { CloudThrottlerGuard } = await import('./base/throttler');
  traceStartup('importing exception filter');
  const { GlobalExceptionFilter } = await import('./base/nestjs/exception');
  traceStartup('importing url helper');
  const { URLHelper } = await import('./base/helpers/url');
  traceStartup('importing websocket');
  const { SocketIoAdapter } = await import('./base/websocket');
  traceStartup('importing auth');
  const { AuthGuard } = await import('./core/auth/guard');
  traceStartup('importing telemetry');
  const { TelemetryService } = await import('./core/telemetry/service');

  traceStartup('importing AppModule');
  const { AppModule } = await import('./app.module');

  traceStartup('creating Nest application');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
    rawBody: true,
    bodyParser: true,
    bufferLogs: true,
  });

  app.useBodyParser('raw', { limit: 100 * OneMB });

  const logger = app.get(AFFiNELogger);
  app.useLogger(logger);
  const config = app.get<import('./base/config').Config>(CONFIG_TOKEN);
  const url = app.get(URLHelper);
  let telemetry: TelemetryService | null = null;
  try {
    telemetry = app.get(TelemetryService, { strict: false });
  } catch (error) {
    if (error instanceof UnknownElementException) {
      telemetry = null;
    } else {
      throw error;
    }
  }

  const defaultAllowedOrigins = buildCorsAllowedOrigins(url);

  app.enableCors((req, callback) => {
    const requestPath = req.path ?? req.url ?? '';
    const appendedOrigins = telemetry?.getAllowedOrigins(requestPath) ?? [];
    const finalAllowedOrigins = appendedOrigins.length
      ? new Set([...defaultAllowedOrigins, ...appendedOrigins])
      : defaultAllowedOrigins;

    callback(null, {
      origin: (origin, originCallback) => {
        corsOriginCallback(
          origin,
          finalAllowedOrigins,
          blockedOrigin => {
            // Telemetry-specific origins are appended dynamically. Keep the
            // existing behavior of only logging default-origin blocks here so
            // telemetry CORS noise is handled by telemetry-specific diagnostics.
            if (!appendedOrigins.length) {
              logger.warn(
                `Blocked CORS request from origin: ${blockedOrigin}`,
                { requestPath }
              );
            }
          },
          originCallback
        );
      },
      credentials: true,
      methods: CORS_ALLOWED_METHODS,
      allowedHeaders: CORS_ALLOWED_HEADERS,
      exposedHeaders: CORS_EXPOSED_HEADERS,
      maxAge: 86400,
      optionsSuccessStatus: 204,
    });
  });

  if (config.server.path) {
    app.setGlobalPrefix(config.server.path);
  }

  app.use(serverTimingAndCache);

  app.use(
    graphqlUploadExpress({
      maxFileSize: 100 * OneMB,
      maxFiles: 32,
    })
  );

  app.useGlobalGuards(app.get(AuthGuard), app.get(CloudThrottlerGuard));
  app.useGlobalInterceptors(app.get(CacheInterceptor));
  app.useGlobalFilters(new GlobalExceptionFilter(app.getHttpAdapter()));
  app.use(cookieParser());
  // only enable shutdown hooks in production
  // https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
  if (env.prod) {
    app.enableShutdownHooks();
  }

  const adapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(adapter);

  if (env.dev) {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    // Swagger API Docs
    const docConfig = new DocumentBuilder()
      .setTitle('AFFiNE API')
      .setDescription(`AFFiNE Server ${env.version} API documentation`)
      .setVersion(`${env.version}`)
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('/api/docs', app, documentFactory, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  traceStartup('listening');
  await app.listen(config.server.port, config.server.listenAddr);

  const formattedAddr = config.server.listenAddr.includes(':')
    ? `[${config.server.listenAddr}]`
    : config.server.listenAddr;

  logger.log(`AFFiNE Server is running in [${env.DEPLOYMENT_TYPE}] mode`);
  logger.log(`Listening on http://${formattedAddr}:${config.server.port}`);
  logger.log(`And the public server should be recognized as ${url.baseUrl}`);
}
