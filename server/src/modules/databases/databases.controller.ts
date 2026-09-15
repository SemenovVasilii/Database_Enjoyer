import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabasesService } from './databases.service';
import { ImportDatabaseDto } from './dto/import-database.dto';

@ApiTags('databases')
@Controller('databases')
export class DatabasesController {
  constructor(private readonly databases: DatabasesService) {}

  @Get()
  @ApiOperation({ summary: 'List saved connections and offline snapshots' })
  list() {
    return this.databases.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read active connection metadata or an offline snapshot' })
  find(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.databases.find(id);
  }

  @Post()
  @ApiOperation({ summary: 'Import a JSON metadata snapshot (max 5 MB)' })
  import(@Body() input: ImportDatabaseDto) {
    return this.databases.import(input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a local profile/catalog entry without modifying the source database',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.databases.remove(id);
  }
}
