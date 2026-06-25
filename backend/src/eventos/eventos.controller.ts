import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { SyncEventosDto } from './dto/sync-eventos.dto';
import { QueryEventosDto } from './dto/query-eventos.dto';

@Controller('eventos')
export class EventosController {
  constructor(private service: EventosService) {}

  @Post('sync')
  sync(@Body() dto: SyncEventosDto) {
    return this.service.syncBatch(dto.eventos);
  }

  @Get()
  findAll(@Query() query: QueryEventosDto) {
    return this.service.findAll(query);
  }
}
