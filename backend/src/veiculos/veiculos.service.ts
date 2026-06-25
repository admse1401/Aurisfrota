import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVeiculoDto) {
    const prefixo = dto.prefixo.toUpperCase();
    const placa = dto.placa.toUpperCase();

    const existe = await this.prisma.veiculo.findFirst({
      where: { OR: [{ prefixo }, { placa }] },
    });
    if (existe) {
      throw new ConflictException('Prefixo ou placa já cadastrados.');
    }

    return this.prisma.veiculo.create({
      data: { prefixo, placa },
    });
  }

  async findAll() {
    return this.prisma.veiculo.findMany({
      where: { status: 'ATIVO' },
      orderBy: { prefixo: 'asc' },
    });
  }

  async remove(id: string) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
    });
    if (!veiculo) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    await this.prisma.veiculo.update({
      where: { id },
      data: { status: 'INATIVO' },
    });

    return { message: 'Veículo inativado com sucesso.' };
  }
}
