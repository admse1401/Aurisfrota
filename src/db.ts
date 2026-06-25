/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Motorista, Veiculo, Evento, Log, Dispositivo, EventoTipo } from './types';
import { api } from './api';

const DB_NAME = 'AurisFrotaDB';
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('motoristas')) {
        db.createObjectStore('motoristas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('veiculos')) {
        db.createObjectStore('veiculos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('dispositivo')) {
        db.createObjectStore('dispositivo', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('eventos')) {
        db.createObjectStore('eventos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// IndexedDB helpers
function writeRecord<T>(db: IDBDatabase, storeName: string, record: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllRecords<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// Mappers: backend format <-> frontend format
// ==========================================

function apiMotoristaToLocal(m: any): Motorista {
  return { id: m.id, matricula: m.matricula, nome: m.nome, pin: '' };
}

function apiVeiculoToLocal(v: any): Veiculo {
  return { id: v.id, frota: v.prefixo, placa: v.placa };
}

function apiEventoToLocal(e: any): Evento {
  const dt = new Date(e.dataHoraDispositivo);
  const data = dt.toISOString().split('T')[0];
  const hora = dt.toTimeString().split(' ')[0];
  return {
    id: e.id,
    motoristaId: e.motoristaId,
    nomeMotorista: e.nomeSnapshot,
    frota: e.prefixoSnapshot,
    placa: e.placaSnapshot,
    data,
    hora,
    timestamp: dt.getTime(),
    tipo: e.tipo,
    kmInicial: undefined,
    kmFinal: undefined,
    statusSync: 'SINCRONIZADO',
    origem: e.origem,
    removido: e.removido,
  };
}

// ==========================================
// Seed (apenas para fallback offline)
// ==========================================

export async function seedInitialDataIfNeeded(): Promise<void> {
  const db = await openDB();
  // Tenta carregar da API para preencher o cache local
  try {
    const motoristas = await api.get<any[]>('/motoristas');
    const veiculos = await api.get<any[]>('/veiculos');
    for (const m of motoristas) await writeRecord(db, 'motoristas', apiMotoristaToLocal(m));
    for (const v of veiculos) await writeRecord(db, 'veiculos', apiVeiculoToLocal(v));
  } catch {
    // API offline — mantém o que tem no IndexedDB
  }
}

// ==========================================
// Dispositivo (sempre local)
// ==========================================

export async function getDeviceSetup(): Promise<Dispositivo | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dispositivo', 'readonly');
    const request = tx.objectStore('dispositivo').get('local');
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

// ==========================================
// Motoristas (API-first, IndexedDB fallback)
// ==========================================

export async function getMotoristas(): Promise<Motorista[]> {
  try {
    const data = await api.get<any[]>('/motoristas');
    const motoristas = data.map(apiMotoristaToLocal);
    const db = await openDB();
    const tx = db.transaction('motoristas', 'readwrite');
    const store = tx.objectStore('motoristas');
    store.clear();
    for (const m of motoristas) store.put(m);
    return motoristas;
  } catch {
    const db = await openDB();
    return getAllRecords<Motorista>(db, 'motoristas');
  }
}

export async function getMotoristaByMatricula(matricula: string): Promise<Motorista | null> {
  try {
    const data = await api.get<any>(`/motoristas/${matricula}`);
    return apiMotoristaToLocal(data);
  } catch {
    const db = await openDB();
    const todos = await getAllRecords<Motorista>(db, 'motoristas');
    return todos.find(m => m.matricula === matricula) || null;
  }
}

export async function loginMotorista(matricula: string, pin: string): Promise<Motorista | null> {
  try {
    const data = await api.post<any>('/motoristas/login', { matricula, pin });
    return apiMotoristaToLocal(data);
  } catch (err: any) {
    if (err.message?.includes('PIN incorreto')) return null;
    if (err.message?.includes('não encontrado')) return null;
    throw err;
  }
}

export async function saveMotorista(motorista: Motorista): Promise<void> {
  if (motorista.id) {
    // Edição: PATCH com campos alteráveis
    const body: any = { nome: motorista.nome };
    if (motorista.pin) body.pin = motorista.pin;
    await api.patch(`/motoristas/${motorista.id}`, body);
  } else {
    // Criação
    await api.post('/motoristas', {
      nome: motorista.nome,
      matricula: motorista.matricula,
      pin: motorista.pin,
    });
  }
}

export async function deleteMotorista(id: string): Promise<void> {
  await api.delete(`/motoristas/${id}`);
  try {
    const db = await openDB();
    await deleteRecord(db, 'motoristas', id);
  } catch { /* cache cleanup, não crítico */ }
}

// ==========================================
// Veiculos (API-first, IndexedDB fallback)
// ==========================================

export async function getVeiculos(): Promise<Veiculo[]> {
  try {
    const data = await api.get<any[]>('/veiculos');
    const veiculos = data.map(apiVeiculoToLocal);
    const db = await openDB();
    const tx = db.transaction('veiculos', 'readwrite');
    const store = tx.objectStore('veiculos');
    store.clear();
    for (const v of veiculos) store.put(v);
    return veiculos;
  } catch {
    const db = await openDB();
    return getAllRecords<Veiculo>(db, 'veiculos');
  }
}

export async function getVeiculoById(id: string): Promise<Veiculo | null> {
  const db = await openDB();
  const veiculos = await getAllRecords<Veiculo>(db, 'veiculos');
  return veiculos.find(v => v.id === id) || null;
}

export async function saveVeiculo(veiculo: Veiculo): Promise<void> {
  await api.post('/veiculos', {
    prefixo: veiculo.frota,
    placa: veiculo.placa,
  });
}

export async function deleteVeiculo(id: string): Promise<void> {
  await api.delete(`/veiculos/${id}`);
  try {
    const db = await openDB();
    const setup = await getDeviceSetup();
    if (setup?.veiculoId === id) await resetDeviceSetup();
    await deleteRecord(db, 'veiculos', id);
  } catch { /* cache cleanup */ }
}

// ==========================================
// Eventos (API-first, IndexedDB fallback)
// ==========================================

export async function getEventos(includeRemoved = false): Promise<Evento[]> {
  try {
    const data = await api.get<any[]>('/eventos');
    const eventos = data.map(apiEventoToLocal);
    const sorted = eventos.sort((a, b) => b.timestamp - a.timestamp);
    return includeRemoved ? sorted : sorted.filter(e => !e.removido);
  } catch {
    const db = await openDB();
    const records = await getAllRecords<Evento>(db, 'eventos');
    const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
    return includeRemoved ? sorted : sorted.filter(e => !e.removido);
  }
}

export async function getProximoEventoTipo(motoristaId: string): Promise<EventoTipo> {
  const eventos = await getEventos(false);
  const motoristaEventos = eventos
    .filter(e => e.motoristaId === motoristaId)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (motoristaEventos.length === 0) return 'ENTRADA';
  return motoristaEventos[0].tipo === 'ENTRADA' ? 'SAIDA' : 'ENTRADA';
}

export async function registrarEventoMotorista(
  motorista: Motorista,
  veiculo: Veiculo,
  tipo: EventoTipo,
  km?: number
): Promise<Evento> {
  const db = await openDB();
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dataStr = `${yyyy}-${mm}-${dd}`;

  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const horaStr = `${hh}:${min}:${ss}`;

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

export async function registrarOuEditarEventoAdmin(
  evento: Evento,
  justificativa: string,
  usuario = 'Administrador'
): Promise<void> {
  const db = await openDB();
  const isNovo = !evento.id;

  if (isNovo) {
    evento.id = crypto.randomUUID();
    evento.origem = 'MANUAL';
    evento.statusSync = 'PENDENTE';
    evento.removido = false;
  }

  let valorAntigo = 'Nenhum (Novo registro manual)';
  let valorNovo = `${evento.tipo} em ${evento.data} ${evento.hora} - Veículo: ${evento.frota}`;

  if (!isNovo) {
    const todos = await getAllRecords<Evento>(db, 'eventos');
    const antigo = todos.find(e => e.id === evento.id);
    if (antigo) {
      valorAntigo = `${antigo.tipo} em ${antigo.data} ${antigo.hora} - Veículo: ${antigo.frota}`;
      valorNovo = `${evento.tipo} em ${evento.data} ${evento.hora} - Veículo: ${evento.frota}`;
    }
  }

  await writeRecord(db, 'eventos', evento);

  const log: Log = {
    id: crypto.randomUUID(),
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

export async function excluirEventoLogico(
  eventoId: string,
  justificativa: string,
  usuario = 'Administrador'
): Promise<void> {
  const db = await openDB();
  const todos = await getAllRecords<Evento>(db, 'eventos');
  const evento = todos.find(e => e.id === eventoId);

  if (!evento) throw new Error('Evento não encontrado');

  evento.removido = true;
  evento.statusSync = 'PENDENTE';
  await writeRecord(db, 'eventos', evento);

  const log: Log = {
    id: crypto.randomUUID(),
    eventoId,
    usuario,
    acao: 'EXCLUSÃO LÓGICA',
    dataHora: new Date().toLocaleString('pt-BR'),
    valorAntigo: `Evento Ativo (${evento.tipo} às ${evento.data} ${evento.hora})`,
    valorNovo: 'Evento Excluído Logicamente',
    justificativa
  };

  await writeRecord(db, 'logs', log);
}

// ==========================================
// Sincronização (envia pendentes para API)
// ==========================================

export async function sincronizarEventosPendentes(): Promise<number> {
  const db = await openDB();
  const todosEventos = await getAllRecords<Evento>(db, 'eventos');
  const pendentes = todosEventos.filter(e => e.statusSync === 'PENDENTE');

  if (pendentes.length === 0) return 0;

  const veiculos = await getAllRecords<Veiculo>(db, 'veiculos');
  const motoristas = await getAllRecords<Motorista>(db, 'motoristas');

  const eventosPayload = pendentes
    .map(p => {
      const veiculo = veiculos.find(v => v.frota === p.frota);
      const motorista = motoristas.find(m => m.id === p.motoristaId);
      if (!veiculo) return null;
      return {
        id: p.id,
        motoristaId: p.motoristaId,
        matriculaSnapshot: motorista?.matricula || 'S/M',
        nomeSnapshot: p.nomeMotorista,
        veiculoId: veiculo.id,
        prefixoSnapshot: p.frota,
        placaSnapshot: p.placa,
        tipo: p.tipo,
        dataHoraDispositivo: new Date(p.timestamp).toISOString(),
        origem: p.origem,
        removido: p.removido,
      };
    })
    .filter(Boolean);

  if (eventosPayload.length === 0) return 0;

  const response = await api.post<{ id: string; status: string }[]>(
    '/eventos/sync',
    { eventos: eventosPayload }
  );

  let count = 0;
  for (const res of response) {
    if (res.status === 'RECEBIDO' || res.status === 'JA_EXISTENTE') {
      const local = pendentes.find(p => p.id === res.id);
      if (local) {
        local.statusSync = 'SINCRONIZADO';
        await writeRecord(db, 'eventos', local);
        if (res.status === 'RECEBIDO') count++;
      }
    }
  }
  return count;
}

// ==========================================
// Logs de Auditoria (sempre local)
// ==========================================

export async function getLogs(): Promise<Log[]> {
  const db = await openDB();
  const logs = await getAllRecords<Log>(db, 'logs');
  return logs.sort((a, b) => b.id.localeCompare(a.id));
}
