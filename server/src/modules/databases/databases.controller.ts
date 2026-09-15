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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabasesService } from './databases.service';
import { ImportDatabaseDto } from './dto/import-database.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@ApiTags('databases')
@ApiBearerAuth()
@Controller('databases')
export class DatabasesController {
  constructor(private readonly databases: DatabasesService) {}

  @Get()
  @ApiOperation({ summary: 'List saved connections and offline snapshots' })
  list(@CurrentUser() user: AuthUser) {
    return this.databases.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read active connection metadata or an offline snapshot' })
  find(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.databases.find(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Import a JSON metadata snapshot (max 5 MB)' })
  import(@CurrentUser() user: AuthUser, @Body() input: ImportDatabaseDto) {
    return this.databases.import(user.id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a local profile/catalog entry without modifying the source database',
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.databases.remove(user.id, id);
  }
}
