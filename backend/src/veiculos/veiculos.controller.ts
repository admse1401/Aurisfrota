import { Controller, Get, Post, Body } from '@nestjs/common';
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
}
