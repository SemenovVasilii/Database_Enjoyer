import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async health() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Metadata database is unavailable');
    }
  }
}
