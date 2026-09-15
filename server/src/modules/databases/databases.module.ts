import { ConnectionsModule } from '../connections/connections.module';
import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';

@Module({
  imports: [ConnectionsModule],
  controllers: [DatabasesController],
  providers: [DatabasesService],
})
export class DatabasesModule {}
