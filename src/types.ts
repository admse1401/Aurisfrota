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
  frota: string; // ex: "F-100"
  placa: string; // ex: "ABC-1234"
}

export interface Dispositivo {
  veiculoId: string; // Configuração local única vinculando o dispositivo a um veículo
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
  data: string; // "AAAA-MM-DD"
  hora: string; // "HH:MM:SS" ou "HH:MM"
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
  eventoId: string;
  usuario: string; // "Administrador" ou similar
  acao: string; // ex: "EDIÇÃO", "REMOÇÃO", "CRIAÇÃO"
  dataHora: string; // "AAAA-MM-DD HH:MM:SS"
  valorAntigo: string;
  valorNovo: string;
  justificativa: string;
}
