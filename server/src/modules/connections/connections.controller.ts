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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { ConnectionDto, ExecuteSqlDto, RowsQueryDto } from './connection.dto';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('connections')
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}
  @Get() @ApiOperation({ summary: 'List saved connection profiles (without secrets)' }) list() {
    return this.service.list();
  }
  @Post('test') @HttpCode(200) @ApiOperation({ summary: 'Test credentials without saving' }) test(
    @Body() body: ConnectionDto,
  ) {
    return this.service.test(body);
  }
  @Post() @ApiOperation({ summary: 'Save encrypted credentials and synchronize metadata' }) create(
    @Body() body: ConnectionDto,
  ) {
    return this.service.create(body);
  }
  @Get(':id') find(@Param('id', uuid) id: string) {
    return this.service.find(id);
  }
  @Post(':id/sync') @HttpCode(200) refresh(@Param('id', uuid) id: string) {
    return this.service.refresh(id);
  }
  @Get(':id/syncs') history(@Param('id', uuid) id: string) {
    return this.service.history(id);
  }
  @Get(':id/objects/:objectId/rows')
  @ApiOperation({ summary: 'Read a bounded page of live rows/documents, max 100' })
  rows(
    @Param('id', uuid) id: string,
    @Param('objectId', uuid) objectId: string,
    @Query() query: RowsQueryDto,
  ) {
    return this.service.rows(id, objectId, query.limit, query.offset);
  }
  @Post(':id/query')
  @HttpCode(200)
  @ApiOperation({ summary: 'Execute SQL against a saved PostgreSQL or MySQL connection' })
  executeSql(@Param('id', uuid) id: string, @Body() body: ExecuteSqlDto) {
    return this.service.executeSql(id, body.sql, body.maxRows);
  }
  @Delete(':id') @HttpCode(204) remove(@Param('id', uuid) id: string) {
    return this.service.remove(id);
  }
}
