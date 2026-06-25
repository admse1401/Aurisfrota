import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { MotoristasService } from './motoristas.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';

@Controller('motoristas')
export class MotoristasController {
  constructor(private service: MotoristasService) {}

  @Post()
  create(@Body() dto: CreateMotoristaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':matricula')
  findByMatricula(@Param('matricula') matricula: string) {
    return this.service.findByMatricula(matricula);
  }
}
