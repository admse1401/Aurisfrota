import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MotoristasModule } from './motoristas/motoristas.module';
import { VeiculosModule } from './veiculos/veiculos.module';
import { EventosModule } from './eventos/eventos.module';

@Module({
  imports: [PrismaModule, MotoristasModule, VeiculosModule, EventosModule],
})
export class AppModule {}
