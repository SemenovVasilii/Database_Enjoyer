import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service';
import { Public } from '../auth/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Public()
  async health() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Metadata database is unavailable');
    }
  }
}
