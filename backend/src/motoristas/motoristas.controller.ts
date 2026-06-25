import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { MotoristasService } from './motoristas.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { UpdateMotoristaDto } from './dto/update-motorista.dto';
import { LoginMotoristaDto } from './dto/login-motorista.dto';

@Controller('motoristas')
export class MotoristasController {
  constructor(private service: MotoristasService) {}

  @Post()
  create(@Body() dto: CreateMotoristaDto) {
    return this.service.create(dto);
  }

  @Post('login')
  login(@Body() dto: LoginMotoristaDto) {
    return this.service.login(dto.matricula, dto.pin);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':matricula')
  findByMatricula(@Param('matricula') matricula: string) {
    return this.service.findByMatricula(matricula);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMotoristaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
