import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventoItemDto } from './dto/sync-eventos.dto';
import { QueryEventosDto } from './dto/query-eventos.dto';

@Injectable()
export class EventosService {
  constructor(private prisma: PrismaService) {}

  async syncBatch(items: EventoItemDto[]) {
    const results: { id: string; status: string }[] = [];

    for (const item of items) {
      const existente = await this.prisma.evento.findUnique({
        where: { id: item.id },
      });

      if (existente) {
        results.push({ id: item.id, status: 'JA_EXISTENTE' });
        continue;
      }

      await this.prisma.evento.create({
        data: {
          id: item.id,
          motoristaId: item.motoristaId,
          matriculaSnapshot: item.matriculaSnapshot,
          nomeSnapshot: item.nomeSnapshot,
          veiculoId: item.veiculoId,
          prefixoSnapshot: item.prefixoSnapshot,
          placaSnapshot: item.placaSnapshot,
          tipo: item.tipo,
          dataHoraDispositivo: new Date(item.dataHoraDispositivo),
          origem: item.origem,
          removido: item.removido ?? false,
        },
      });

      results.push({ id: item.id, status: 'RECEBIDO' });
    }

    return results;
  }

  async findAll(query: QueryEventosDto) {
    const where: any = { removido: false };

    if (query.matricula) {
      where.matriculaSnapshot = query.matricula;
    }

    if (query.prefixo) {
      where.prefixoSnapshot = query.prefixo;
    }

    if (query.inicio || query.fim) {
      where.dataHoraDispositivo = {};
      if (query.inicio) {
        where.dataHoraDispositivo.gte = new Date(query.inicio);
      }
      if (query.fim) {
        where.dataHoraDispositivo.lte = new Date(query.fim);
      }
    }

    return this.prisma.evento.findMany({
      where,
      orderBy: { dataHoraDispositivo: 'desc' },
    });
  }
}
