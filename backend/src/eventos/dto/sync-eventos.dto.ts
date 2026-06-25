import {
  IsArray,
  ValidateNested,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

enum EventoTipo {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

enum EventoOrigem {
  AUTOMATICO = 'AUTOMATICO',
  MANUAL = 'MANUAL',
}

export class EventoItemDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  motoristaId: string;

  @IsString()
  @IsNotEmpty()
  matriculaSnapshot: string;

  @IsString()
  @IsNotEmpty()
  nomeSnapshot: string;

  @IsString()
  @IsNotEmpty()
  veiculoId: string;

  @IsString()
  @IsNotEmpty()
  prefixoSnapshot: string;

  @IsString()
  @IsNotEmpty()
  placaSnapshot: string;

  @IsEnum(EventoTipo)
  tipo: EventoTipo;

  @IsDateString()
  dataHoraDispositivo: string;

  @IsEnum(EventoOrigem)
  origem: EventoOrigem;

  @IsBoolean()
  @IsOptional()
  removido?: boolean;
}

export class SyncEventosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventoItemDto)
  eventos: EventoItemDto[];
}
