import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { VeiculosService } from './veiculos.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';

@Controller('veiculos')
export class VeiculosController {
  constructor(private service: VeiculosService) {}

  @Post()
  create(@Body() dto: CreateVeiculoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
