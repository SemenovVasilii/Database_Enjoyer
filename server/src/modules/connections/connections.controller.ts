import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionDto, ExecuteSqlDto, RowsQueryDto } from './connection.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
const uuid = new ParseUUIDPipe({ version: '4' });
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }
  @Post('test') @HttpCode(200) test(@Body() body: ConnectionDto) {
    return this.service.test(body);
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() body: ConnectionDto) {
    return this.service.create(user.id, body);
  }
  @Get(':id') find(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string) {
    return this.service.find(user.id, id);
  }
  @Post(':id/sync') @HttpCode(200) refresh(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ) {
    return this.service.refresh(user.id, id);
  }
  @Get(':id/syncs') history(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string) {
    return this.service.history(user.id, id);
  }
  @Get(':id/objects/:objectId/rows')
  rows(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('objectId', uuid) objectId: string,
    @Query() query: RowsQueryDto,
  ) {
    return this.service.rows(user.id, id, objectId, query.limit, query.offset);
  }
  @Post(':id/query')
  @HttpCode(200)
  executeSql(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: ExecuteSqlDto,
  ) {
    return this.service.executeSql(user.id, id, body.sql, body.maxRows);
  }
  @Delete(':id') @HttpCode(204) remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
