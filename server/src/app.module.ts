import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { DatabasesModule } from './modules/databases/databases.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnvironment }),
    DatabaseModule,
    DatabasesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
