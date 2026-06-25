import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { UpdateMotoristaDto } from './dto/update-motorista.dto';

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMotoristaDto) {
    const existe = await this.prisma.motorista.findUnique({
      where: { matricula: dto.matricula },
    });
    if (existe) {
      throw new ConflictException('Matrícula já cadastrada.');
    }

    const pinHash = await bcrypt.hash(dto.pin, 10);

    const motorista = await this.prisma.motorista.create({
      data: {
        matricula: dto.matricula,
        nome: dto.nome,
        pinHash,
      },
    });

    return this.sanitize(motorista);
  }

  async findAll() {
    const lista = await this.prisma.motorista.findMany({
      where: { status: 'ATIVO' },
      orderBy: { nome: 'asc' },
    });
    return lista.map(this.sanitize);
  }

  async findByMatricula(matricula: string) {
    const motorista = await this.prisma.motorista.findUnique({
      where: { matricula },
    });
    if (!motorista || motorista.status === 'INATIVO') {
      throw new NotFoundException('Motorista não encontrado.');
    }
    return this.sanitize(motorista);
  }

  async login(matricula: string, pin: string) {
    const motorista = await this.prisma.motorista.findUnique({
      where: { matricula },
    });
    if (!motorista || motorista.status === 'INATIVO') {
      throw new NotFoundException('Motorista não encontrado.');
    }

    const pinValido = await bcrypt.compare(pin, motorista.pinHash);
    if (!pinValido) {
      throw new UnauthorizedException('PIN incorreto.');
    }

    return this.sanitize(motorista);
  }

  async update(id: string, dto: UpdateMotoristaDto) {
    const motorista = await this.prisma.motorista.findUnique({
      where: { id },
    });
    if (!motorista) {
      throw new NotFoundException('Motorista não encontrado.');
    }

    const data: any = {};
    if (dto.nome) data.nome = dto.nome;
    if (dto.pin) data.pinHash = await bcrypt.hash(dto.pin, 10);

    const atualizado = await this.prisma.motorista.update({
      where: { id },
      data,
    });

    return this.sanitize(atualizado);
  }

  async remove(id: string) {
    const motorista = await this.prisma.motorista.findUnique({
      where: { id },
    });
    if (!motorista) {
      throw new NotFoundException('Motorista não encontrado.');
    }

    await this.prisma.motorista.update({
      where: { id },
      data: { status: 'INATIVO' },
    });

    return { message: 'Motorista inativado com sucesso.' };
  }

  private sanitize(m: any) {
    const { pinHash, ...rest } = m;
    return rest;
  }
}
