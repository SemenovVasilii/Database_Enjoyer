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
import { DatabasesService } from './databases.service';
import { ImportDatabaseDto } from './dto/import-database.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('databases')
export class DatabasesController {
  constructor(private readonly databases: DatabasesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.databases.list(user.id);
  }

  @Get(':id')
  find(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.databases.find(user.id, id);
  }

  @Post()
  import(@CurrentUser() user: AuthUser, @Body() input: ImportDatabaseDto) {
    return this.databases.import(user.id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.databases.remove(user.id, id);
  }
}
