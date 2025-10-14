"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const microservices_1 = require("@nestjs/microservices");
const app_module_1 = require("./app.module");
const logger_service_1 = require("./modules/logger/logger.service");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.connectMicroservice({
        transport: microservices_1.Transport.KAFKA,
        options: {
            client: {
                clientId: 'github-api',
                brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
            },
            consumer: {
                groupId: 'github-api-consumer',
                allowAutoTopicCreation: true,
            },
        },
    });
    await app.startAllMicroservices();
    const logger = app.get(logger_service_1.LoggerService);
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
    ];
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('GitHub Repository Management API')
        .setDescription('REST API for synchronizing, listing, searching, and analyzing GitHub repositories. ' +
        'This API provides endpoints to sync GitHub user repositories to a local database, ' +
        'perform advanced searches, and generate statistical insights.')
        .setVersion('1.0')
        .addTag('repositories', 'Repository synchronization, listing, and search operations')
        .addTag('statistics', 'Statistical analysis and insights from repository data')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log('Application started successfully', {
        port,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        corsOrigins,
        kafkaBroker: process.env.KAFKA_BROKER || 'localhost:9092',
        timestamp: new Date().toISOString(),
    });
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
    console.log(`Kafka broker connected at: ${process.env.KAFKA_BROKER || 'localhost:9092'}`);
}
bootstrap();
//# sourceMappingURL=main.js.map