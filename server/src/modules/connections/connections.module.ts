import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsRepository } from './connections.repository';
import { SecretsService } from './secrets.service';
@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository, SecretsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
