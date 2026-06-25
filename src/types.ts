/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Motorista {
  id: string;
  matricula: string;
  nome: string;
  pin: string;
}

export interface Veiculo {
  id: string;
  frota: string;
  placa: string;
}

export interface Dispositivo {
  veiculoId: string;
}

export type EventoTipo = 'ENTRADA' | 'SAIDA';
export type SyncStatus = 'PENDENTE' | 'SINCRONIZADO';
export type EventoOrigem = 'AUTOMATICO' | 'MANUAL';

export interface Evento {
  id: string;
  motoristaId: string;
  nomeMotorista: string;
  frota: string;
  placa: string;
  data: string;
  hora: string;
  timestamp: number;
  tipo: EventoTipo;
  kmInicial?: number;
  kmFinal?: number;
  statusSync: SyncStatus;
  origem: EventoOrigem;
  removido: boolean;
}

export interface Log {
  id: string;
  eventoId?: string;
  usuario?: string;
  acao: string;
  dataHora: string;
  valorAntigo?: string;
  valorNovo?: string;
  justificativa?: string;
}
