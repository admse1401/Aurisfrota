/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Motorista, Veiculo, Evento, Log, Dispositivo, EventoTipo } from './types';
import { api } from './api';

const DB_NAME = 'FrotaPontoDB';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains('motoristas')) {
        const motoristasStore = db.createObjectStore('motoristas', { keyPath: 'id' });
        motoristasStore.createIndex('matricula', 'matricula', { unique: true });
      }
      if (!db.objectStoreNames.contains('veiculos')) {
        db.createObjectStore('veiculos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('dispositivo')) {
        db.createObjectStore('dispositivo', { keyPath: 'key' }); // key is always 'local'
      }
      if (!db.objectStoreNames.contains('eventos')) {
        db.createObjectStore('eventos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Seed Initial Data Helper
export async function seedInitialDataIfNeeded(): Promise<void> {
  const db = await openDB();

  // Check if motoristas are already seeded
  const motoristasCount = await getCount(db, 'motoristas');
  if (motoristasCount === 0) {
    const defaultMotoristas: Motorista[] = [
      { id: 'mot-1', matricula: '1010', nome: 'Carlos Silva', pin: '1234' },
      { id: 'mot-2', matricula: '2020', nome: 'Ana Oliveira', pin: '5678' },
      { id: 'mot-3', matricula: '3030', nome: 'Marcos Souza', pin: '9012' }
    ];
    for (const m of defaultMotoristas) {
      await writeRecord(db, 'motoristas', m);
    }
  }

  // Check if vehicles are already seeded
  const veiculosCount = await getCount(db, 'veiculos');
  if (veiculosCount === 0) {
    const defaultVeiculos: Veiculo[] = [
      { id: 'vei-1', frota: 'F-100', placa: 'ABC-1234' },
      { id: 'vei-2', frota: 'F-200', placa: 'XYZ-5678' }
    ];
    for (const v of defaultVeiculos) {
      await writeRecord(db, 'veiculos', v);
    }
  }

  // Seed initial events for demonstrations (Carlos & Ana)
  const eventosCount = await getCount(db, 'eventos');
  if (eventosCount === 0) {
    // Generate dates in the past (e.g. yesterday and the day before)
    // Let's use robust dates based on 2026-06-21 and 2026-06-22
    const baseEvents: Evento[] = [
      {
        id: 'evt-1',
        motoristaId: 'mot-1',
        nomeMotorista: 'Carlos Silva',
        frota: 'F-100',
        placa: 'ABC-1234',
        data: '2026-06-21',
        hora: '07:05:00',
        timestamp: new Date('2026-06-21T07:05:00').getTime(),
        tipo: 'ENTRADA',
        kmInicial: 45000,
        statusSync: 'SINCRONIZADO',
        origem: 'AUTOMATICO',
        removido: false
      },
      {
        id: 'evt-2',
        motoristaId: 'mot-1',
        nomeMotorista: 'Carlos Silva',
        frota: 'F-100',
        placa: 'ABC-1234',
        data: '2026-06-21',
        hora: '15:35:00',
        timestamp: new Date('2026-06-21T15:35:00').getTime(),
        tipo: 'SAIDA',
        kmFinal: 45120,
        statusSync: 'SINCRONIZADO',
        origem: 'AUTOMATICO',
        removido: false
      },
      {
        id: 'evt-3',
        motoristaId: 'mot-1',
        nomeMotorista: 'Carlos Silva',
        frota: 'F-100',
        placa: 'ABC-1234',
        data: '2026-06-22',
        hora: '07:00:00',
        timestamp: new Date('2026-06-22T07:00:00').getTime(),
        tipo: 'ENTRADA',
        kmInicial: 45120,
        statusSync: 'SINCRONIZADO',
        origem: 'AUTOMATICO',
        removido: false
      },
      {
        id: 'evt-4',
        motoristaId: 'mot-1',
        nomeMotorista: 'Carlos Silva',
        frota: 'F-100',
        placa: 'ABC-1234',
        data: '2026-06-22',
        hora: '16:15:00',
        timestamp: new Date('2026-06-22T16:15:00').getTime(),
        tipo: 'SAIDA',
        kmFinal: 45250,
        statusSync: 'SINCRONIZADO',
        origem: 'AUTOMATICO',
        removido: false
      },
      {
        id: 'evt-5',
        motoristaId: 'mot-2',
        nomeMotorista: 'Ana Oliveira',
        frota: 'F-200',
        placa: 'XYZ-5678',
        data: '2026-06-22',
        hora: '08:00:00',
        timestamp: new Date('2026-06-22T08:00:00').getTime(),
        tipo: 'ENTRADA',
        kmInicial: 98100,
        statusSync: 'SINCRONIZADO',
        origem: 'AUTOMATICO',
        removido: false
      },
      {
        id: 'evt-6',
        motoristaId: 'mot-2',
        nomeMotorista: 'Ana Oliveira',
        frota: 'F-200',
        placa: 'XYZ-5678',
        data: '2026-06-22',
        hora: '17:10:00',
        timestamp: new Date('2026-06-22T17:10:00').getTime(),
        tipo: 'SAIDA',
        kmFinal: 98190,
        statusSync: 'PENDENTE', // One pending to show offline sync capability
        origem: 'AUTOMATICO',
        removido: false
      }
    ];

    for (const e of baseEvents) {
      await writeRecord(db, 'eventos', e);
    }
  }
}

// Generic IndexedDB helper methods
function getCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeRecord<T>(db: IDBDatabase, storeName: string, record: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllRecords<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Specific functions called by the React App ---

// Setup e Dispositivo
export async function getDeviceSetup(): Promise<Dispositivo | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('dispositivo', 'readonly');
    const store = transaction.objectStore('dispositivo');
    const request = store.get('local');
    request.onsuccess = () => {
      const res = request.result;
      resolve(res ? { veiculoId: res.veiculoId } : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setDeviceSetup(veiculoId: string): Promise<void> {
  const db = await openDB();
  await writeRecord(db, 'dispositivo', { key: 'local', veiculoId });
}

export async function resetDeviceSetup(): Promise<void> {
  const db = await openDB();
  await deleteRecord(db, 'dispositivo', 'local');
}

// Motoristas
export async function getMotoristas(): Promise<Motorista[]> {
  try {
    // Tenta buscar da API primeiro
    const motoristasApi = await api.get('/motoristas');
    // Se sucesso, sincroniza com o IndexedDB
    const db = await openDB();
    const tx = db.transaction('motoristas', 'readwrite');
    const store = tx.objectStore('motoristas');
    await new Promise<void>((resolve) => {
      store.clear().onsuccess = () => resolve();
    });
    for (const m of motoristasApi) {
      await store.put(m);
    }
    return motoristasApi;
  } catch (error) {
    // Se a API falhar (offline), busca do IndexedDB
    console.warn('API de motoristas offline, usando dados locais.');
    const db = await openDB();
    return getAllRecords<Motorista>(db, 'motoristas');
  }
}

export async function getMotoristaByMatricula(matricula: string): Promise<Motorista | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('motoristas', 'readonly');
    const store = transaction.objectStore('motoristas');
    const index = store.index('matricula');
    const request = index.get(matricula);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMotorista(motorista: Motorista): Promise<void> {
  // Salva localmente primeiro para UI rápida
  const db = await openDB();
  await writeRecord(db, 'motoristas', motorista);

  // Tenta salvar na API em segundo plano
  try {
    // A API espera 'pin' em texto, mas nosso modelo local já pode ter o hash.
    // O backend irá criar o hash. O modelo local não tem pinHash.
    await api.post('/motoristas', motorista);
  } catch (error) {
    console.warn('API offline. Motorista salvo localmente, pendente de sync manual futuro.');
    // Aqui poderia ser implementada uma fila de sincronização para motoristas/veículos.
  }
}

export async function deleteMotorista(id: string): Promise<void> {
  const db = await openDB();
  await deleteRecord(db, 'motoristas', id);
  // Adicionar chamada à API para exclusão no backend
}

// Veículos
export async function getVeiculos(): Promise<Veiculo[]> {
  const db = await openDB();
  return getAllRecords<Veiculo>(db, 'veiculos');
}

export async function getVeiculoById(id: string): Promise<Veiculo | null> {
  const veiculos = await getVeiculos();
  return veiculos.find(v => v.id === id) || null;
}

export async function saveVeiculo(veiculo: Veiculo): Promise<void> {
  const db = await openDB();
  await writeRecord(db, 'veiculos', veiculo);

  // Tenta salvar na API
  try {
    await api.post('/veiculos', veiculo);
  } catch (error) {
    console.warn('API offline. Veículo salvo localmente.');
  }
}

export async function deleteVeiculo(id: string): Promise<void> {
  const db = await openDB();
  // Ensure we also clean device setup if deleted
  const currentSetup = await getDeviceSetup();
  if (currentSetup?.veiculoId === id) {
    await resetDeviceSetup();
  }
  await deleteRecord(db, 'veiculos', id);
  // Adicionar chamada à API para exclusão no backend
}

// Eventos
export async function getEventos(includeRemoved = false): Promise<Evento[]> {
  const db = await openDB();
  const records = await getAllRecords<Evento>(db, 'eventos');
  // Sort by timestamp desc
  const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
  return includeRemoved ? sorted : sorted.filter(e => !e.removido);
}

/**
 * RN001 — Alternância automática: o tipo do próximo evento é sempre o oposto do último evento do motorista.
 */
export async function getProximoEventoTipo(motoristaId: string): Promise<EventoTipo> {
  const eventos = await getEventos(false); // excluding removed
  const motoristaEventos = eventos
    .filter(e => e.motoristaId === motoristaId)
    .sort((a, b) => b.timestamp - a.timestamp); // newest first

  if (motoristaEventos.length === 0) {
    return 'ENTRADA';
  }

  const ultimo = motoristaEventos[0];
  return ultimo.tipo === 'ENTRADA' ? 'SAIDA' : 'ENTRADA';
}

/**
 * Registra um evento de forma normal (feita pelo motorista no quiosque)
 */
export async function registrarEventoMotorista(
  motorista: Motorista,
  veiculo: Veiculo,
  tipo: EventoTipo,
  km?: number
): Promise<Evento> {
  const db = await openDB();
  const now = new Date(); // Data/hora do dispositivo

  // Format date: YYYY-MM-DD
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dataStr = `${yyyy}-${mm}-${dd}`;

  // Format time: HH:MM:SS
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const horaStr = `${hh}:${min}:${ss}`;

  // O ID agora deve ser um UUID para ser aceito pelo backend
  const novoEvento: Evento = {
    id: crypto.randomUUID(),
    motoristaId: motorista.id,
    nomeMotorista: motorista.nome,
    frota: veiculo.frota,
    placa: veiculo.placa,
    data: dataStr,
    hora: horaStr,
    timestamp: now.getTime(),
    tipo,
    kmInicial: tipo === 'ENTRADA' ? km : undefined,
    kmFinal: tipo === 'SAIDA' ? km : undefined,
    statusSync: 'PENDENTE',
    origem: 'AUTOMATICO',
    removido: false
  };

  await writeRecord(db, 'eventos', novoEvento);
  return novoEvento;
}

/**
 * Cria ou edita um evento manualmente através do painel admin
 * RN005 — Toda alteração manual gera log com usuário, data/hora, valor antigo → novo e justificativa obrigatória.
 */
export async function registrarOuEditarEventoAdmin(
  evento: Evento,
  justificativa: string,
  usuario = 'Administrador'
): Promise<void> {
  const db = await openDB();
  const isNovo = !evento.id;

  // Se for novo, gera ID
  if (isNovo) {
    evento.id = crypto.randomUUID();
    evento.origem = 'MANUAL';
    evento.statusSync = 'PENDENTE';
    evento.removido = false;
  }

  // Se não for novo, precisamos registrar no log as alterações
  let valorAntigo = 'Nenhum (Novo registro manual)';
  let valorNovo = `${evento.tipo} em ${evento.data} ${evento.hora} - Veículo: ${evento.frota}`;

  if (!isNovo) {
    // Busca o atual do banco
    const todos = await getAllRecords<Evento>(db, 'eventos');
    const antigo = todos.find(e => e.id === evento.id);
    if (antigo) {
      valorAntigo = `${antigo.tipo} em ${antigo.data} ${antigo.hora} - Veículo: ${antigo.frota} (KM: ${antigo.kmInicial || antigo.kmFinal || 'Sem registro'})`;
      valorNovo = `${evento.tipo} em ${evento.data} ${evento.hora} - Veículo: ${evento.frota} (KM: ${evento.kmInicial || evento.kmFinal || 'Sem registro'})`;
    }
  }

  // Salva o evento
  await writeRecord(db, 'eventos', evento);

  // Registra o log de auditoria
  const log: Log = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    eventoId: evento.id,
    usuario,
    acao: isNovo ? 'CRIAÇÃO MANUAL' : 'EDIÇÃO MANUAL',
    dataHora: new Date().toLocaleString('pt-BR'),
    valorAntigo,
    valorNovo,
    justificativa
  };

  await writeRecord(db, 'logs', log);
}

/**
 * RN004 — Eventos nunca são apagados definitivamente; a exclusão é apenas lógica e registrada em log.
 */
export async function excluirEventoLogico(
  eventoId: string,
  justificativa: string,
  usuario = 'Administrador'
): Promise<void> {
  const db = await openDB();
  const todos = await getAllRecords<Evento>(db, 'eventos');
  const evento = todos.find(e => e.id === eventoId);

  if (!evento) {
    throw new Error('Evento não encontrado');
  }

  // Marca como removido e pendente de sync
  evento.removido = true;
  evento.statusSync = 'PENDENTE';

  await writeRecord(db, 'eventos', evento);

  // Registra log
  const log: Log = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    eventoId: eventoId,
    usuario,
    acao: 'EXCLUSÃO LÓGICA',
    dataHora: new Date().toLocaleString('pt-BR'),
    valorAntigo: `Evento Ativo (${evento.tipo} às ${evento.data} ${evento.hora})`,
    valorNovo: `Evento Excluído Logicamente`,
    justificativa
  };

  await writeRecord(db, 'logs', log);
}

// Sincronização Simulada
export async function sincronizarEventosPendentes(): Promise<number> {
  const db = await openDB();
  const todosEventos = await getAllRecords<Evento>(db, 'eventos');
  const pendentes = todosEventos.filter(e => e.statusSync === 'PENDENTE');

  if (pendentes.length === 0) {
    return 0;
  }

  // Mapeia os eventos locais para o formato DTO da API
  const payload = pendentes.map(p => ({
    id: p.id,
    motoristaId: p.motoristaId,
    matriculaSnapshot: todosEventos.find(m => m.motoristaId === p.motoristaId)?.nomeMotorista.split(' ')[0] || 'N/A', // Exemplo
    nomeSnapshot: p.nomeMotorista,
    veiculoId: 'vei-1', // Placeholder, idealmente o ID do veículo estaria no evento
    prefixoSnapshot: p.frota,
    placaSnapshot: p.placa,
    tipo: p.tipo,
    dataHoraDispositivo: new Date(p.timestamp).toISOString(),
    origem: p.origem,
    removido: p.removido,
  }));

  const response = await api.syncEventos(payload);

  // Atualiza o status local dos eventos que foram recebidos pela API
  for (const res of response) {
    if (res.status === 'RECEBIDO' || res.status === 'JA_EXISTENTE') {
      const eventoLocal = pendentes.find(p => p.id === res.id);
      if (eventoLocal) {
        eventoLocal.statusSync = 'SINCRONIZADO';
        await writeRecord(db, 'eventos', eventoLocal);
      }
    }
  }

  return response.filter((r: any) => r.status === 'RECEBIDO').length;
}

// Logs de Auditoria
export async function getLogs(): Promise<Log[]> {
  const db = await openDB();
  const logs = await getAllRecords<Log>(db, 'logs');
  return logs.sort((a, b) => b.id.localeCompare(a.id)); // Newest logs first based on id timestamp
}
