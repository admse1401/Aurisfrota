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

// Novo helper para registrar erros no IndexedDB
async function logErrorToDb(error: any, context: string, action: string = 'ERRO_APLICACAO'): Promise<void> {
  try {
    const db = await openDB();
    const now = new Date();
    const log: Log = {
      id: crypto.randomUUID(),
      acao: action,
      dataHora: now.toLocaleString('pt-BR'),
      detalhes: `Contexto: ${context} | Erro: ${error instanceof Error ? error.message : String(error)}`,
    };
    await writeRecord(db, 'logs', log);
  } catch (dbError) {
    console.error(`[CRITICAL] Falha ao registrar erro no IndexedDB:`, dbError);
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
    request.onerror = () => {
      logErrorToDb(request.error, `writeRecord to ${storeName}`, 'ERRO_INDEXEDDB_WRITE');
      reject(request.error);
    };
  });
}

function getAllRecords<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      logErrorToDb(request.error, `getAllRecords from ${storeName}`, 'ERRO_INDEXEDDB_READ');
      reject(request.error);
    };
  });
}

function deleteRecord(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      logErrorToDb(request.error, `deleteRecord from ${storeName} (ID: ${id})`, 'ERRO_INDEXEDDB_DELETE');
      reject(request.error);
    };
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
    // API-first: Tenta buscar da API.
    const motoristasApi = await api.get('/motoristas');
    // Se sucesso, limpa o store local e o repopula com dados frescos da API.
    const db = await openDB();
    const tx = db.transaction('motoristas', 'readwrite');
    const store = tx.objectStore('motoristas');
    await new Promise<void>((resolve) => {
      store.clear().onsuccess = () => resolve();
    });
    // Usando Promise.all para performance
    await Promise.all(motoristasApi.map((m: Motorista) => 
      new Promise<void>(res => { store.put(m).onsuccess = () => res(); })
    ));

    return motoristasApi as Motorista[];
  } catch (error) {
    // Se a API falhar (offline), busca do IndexedDB
    console.warn('API de motoristas offline, usando dados locais.');
    const db = await openDB();
    return getAllRecords<Motorista>(db, 'motoristas');
  }
}

export async function getMotoristaByMatricula(matricula: string): Promise<Motorista | null> {
  try {
    // Tenta buscar diretamente na API para o login
    return await api.get<Motorista>(`/motoristas/matricula/${matricula}`);
  } catch (error) {
    // Fallback para o IndexedDB se a API estiver offline
    await logErrorToDb(error, `getMotoristaByMatricula (${matricula})`, 'ERRO_API_MOTORISTA_LOGIN');
    console.warn(`API offline. Buscando matrícula ${matricula} localmente.`);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('motoristas', 'readonly');
      const store = transaction.objectStore('motoristas');
      const index = store.index('matricula');
      const request = index.get(matricula);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        logErrorToDb(request.error, `getMotoristaByMatricula IndexedDB (${matricula})`, 'ERRO_INDEXEDDB_MOTORISTA_LOGIN');
        reject(request.error);
      };
    });
  }
}

export async function saveMotorista(motorista: Motorista): Promise<void> {
  // A responsabilidade de salvar agora é inteiramente da API.
  // O componente que chama esta função deve recarregar a lista para obter o novo item.
  try {
    await api.post('/motoristas', {
      nome: motorista.nome,
      matricula: motorista.matricula,
      pin: motorista.pin,
    });
  } catch (error) { await logErrorToDb(error, `saveMotorista (${motorista.matricula})`, 'ERRO_API_SAVE_MOTORISTA'); throw error; }
}

export async function deleteMotorista(id: string): Promise<void> {
  // A responsabilidade de deletar agora é da API.
  try {
    await api.delete(`/motoristas/${id}`);
  } catch (error) {
    await logErrorToDb(error, `deleteMotorista (${id})`, 'ERRO_API_DELETE_MOTORISTA');
    throw error;
  }
  // Também remove do IndexedDB para consistência em caso de offline.
  try {
    const db = await openDB();
    await deleteRecord(db, 'motoristas', id);
  } catch (dbError) {
    console.warn('API deletou, mas falhou ao limpar o registro do IndexedDB:', dbError);
    await logErrorToDb(dbError, `deleteMotorista IndexedDB cleanup (${id})`, 'ERRO_INDEXEDDB_DELETE_MOTORISTA');
  }
}

// Veículos
export async function getVeiculos(): Promise<Veiculo[]> {
  try {
    // Tenta buscar da API primeiro
    const veiculosApi = await api.get('/veiculos');
    // Se sucesso, sincroniza com o IndexedDB
    const db = await openDB();
    const tx = db.transaction('veiculos', 'readwrite');
    const store = tx.objectStore('veiculos');
    await new Promise<void>((resolve) => {
      store.clear().onsuccess = () => resolve();
    });
    await Promise.all(veiculosApi.map((v: Veiculo) => 
      new Promise<void>(res => { store.put(v).onsuccess = () => res(); })
    ));

    return veiculosApi as Veiculo[];
  } catch (error) {
    console.warn('API de veículos offline, usando dados locais.');
    await logErrorToDb(error, 'getVeiculos', 'ERRO_API_VEICULOS');
    const db = await openDB();
    return getAllRecords<Veiculo>(db, 'veiculos');
  }
}

export async function getVeiculoById(id: string): Promise<Veiculo | null> {
  // Esta função é usada no setup. É melhor ler do cache local (que foi sincronizado)
  // para evitar uma chamada de rede extra na inicialização.
  const db = await openDB();
  const veiculos = await getAllRecords<Veiculo>(db, 'veiculos');
  return veiculos.find((v: Veiculo) => v.id === id) || null;
}

export async function saveVeiculo(veiculo: Veiculo): Promise<void> {
  // Salva via API
  try {
    await api.post('/veiculos', {
      prefixo: veiculo.frota, // O backend espera 'prefixo'
      placa: veiculo.placa,
    });
  } catch (error) { await logErrorToDb(error, `saveVeiculo (${veiculo.frota})`, 'ERRO_API_SAVE_VEICULO'); throw error; }
}

export async function deleteVeiculo(id: string): Promise<void> {
  // Deleta via API
  try {
    await api.delete(`/veiculos/${id}`);
  } catch (error) {
    await logErrorToDb(error, `deleteVeiculo (${id})`, 'ERRO_API_DELETE_VEICULO');
    throw error;
  }
  // Limpa o setup local se o veículo excluído era o vinculado
  try {
    const db = await openDB();
    const currentSetup = await getDeviceSetup();
    if (currentSetup?.veiculoId === id) {
      await resetDeviceSetup();
    }
    await deleteRecord(db, 'veiculos', id);
  } catch (dbError) { await logErrorToDb(dbError, `deleteVeiculo IndexedDB cleanup (${id})`, 'ERRO_INDEXEDDB_DELETE_VEICULO'); }
}

// Eventos
export async function getEventos(includeRemoved = false): Promise<Evento[]> {
  try {
    // O painel de admin agora lê da API como fonte da verdade.
    const eventosApi = await api.get<Evento[]>('/eventos');
    const sorted = eventosApi.sort((a, b) => new Date(b.data + 'T' + b.hora).getTime() - new Date(a.data + 'T' + a.hora).getTime());
    return includeRemoved ? sorted : sorted.filter(e => !e.removido);
  } catch (error) {
    // Fallback para IndexedDB se a API estiver offline
    await logErrorToDb(error, 'getEventos', 'ERRO_API_GET_EVENTOS');
    console.warn('API de eventos offline, usando dados locais para o painel de admin.');
    const db = await openDB();
    const records = await getAllRecords<Evento>(db, 'eventos');
    const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
    return includeRemoved ? sorted : sorted.filter(e => !e.removido);
  }
}

/**
 * RN001 — Alternância automática: o tipo do próximo evento é sempre o oposto do último evento do motorista.
 */
export async function getProximoEventoTipo(motoristaId: string): Promise<EventoTipo> {
  const eventos = await getEventos(false); // excluding removed
  // Para esta regra, é mais seguro usar o cache local (IndexedDB) para evitar
  // que uma falha de rede impeça o motorista de bater o ponto corretamente.
  const db = await openDB();
  const motoristaEventos = (await getAllRecords<Evento>(db, 'eventos'))
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
  } catch (error) {
    await logErrorToDb(error, `registrarEventoMotorista (${motorista.matricula})`, 'ERRO_INDEXEDDB_REGISTRAR_EVENTO');
    throw error;
  }
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
  try {
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
      id: crypto.randomUUID(), // Usar UUID para consistência
      eventoId: evento.id,
      usuario,
      acao: isNovo ? 'CRIAÇÃO MANUAL' : 'EDIÇÃO MANUAL',
      dataHora: new Date().toLocaleString('pt-BR'),
      valorAntigo,
      valorNovo,
      justificativa
    };

    await writeRecord(db, 'logs', log);
  } catch (error) {
    await logErrorToDb(error, `registrarOuEditarEventoAdmin (${evento.id || 'novo'})`, 'ERRO_INDEXEDDB_ADMIN_EVENTO');
    throw error;
  }
}

/**
 * RN004 — Eventos nunca são apagados definitivamente; a exclusão é apenas lógica e registrada em log.
 */
export async function excluirEventoLogico(
  eventoId: string,
  justificativa: string,
  usuario = 'Administrador'
): Promise<void> {
  try {
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
      id: crypto.randomUUID(), // Usar UUID para consistência
      eventoId: eventoId,
      usuario,
      acao: 'EXCLUSÃO LÓGICA',
      dataHora: new Date().toLocaleString('pt-BR'),
      valorAntigo: `Evento Ativo (${evento.tipo} às ${evento.data} ${evento.hora})`,
      valorNovo: `Evento Excluído Logicamente`,
      justificativa
    };

    await writeRecord(db, 'logs', log);
  } catch (error) {
    await logErrorToDb(error, `excluirEventoLogico (${eventoId})`, 'ERRO_INDEXEDDB_EXCLUIR_EVENTO');
    throw error;
  }
}

// Sincronização Simulada
export async function sincronizarEventosPendentes(): Promise<number> {
  let db: IDBDatabase;
  let todosEventos: Evento[];
  try { db = await openDB(); todosEventos = await getAllRecords<Evento>(db, 'eventos'); }
  catch (error) { await logErrorToDb(error, 'sincronizarEventosPendentes - leitura inicial', 'ERRO_INDEXEDDB_SYNC_LEITURA'); throw error; }
  const pendentes = todosEventos.filter(e => e.statusSync === 'PENDENTE');

  if (pendentes.length === 0) {
    return 0; // Nada a fazer
  }

  // Precisamos dos dados de veículos para encontrar o veiculoId
  const veiculos = await getAllRecords<Veiculo>(db, 'veiculos');

  // Mapeia os eventos locais para o formato DTO da API
  const payload = pendentes.map(p => ({
    id: p.id,
    motoristaId: p.motoristaId,
    // Encontra o ID do veículo correspondente à frota/placa do evento
    veiculoId: veiculos.find(v => v.frota === p.frota)?.id || 'veiculo-nao-encontrado',
    prefixoSnapshot: p.frota,
    placaSnapshot: p.placa,
    tipo: p.tipo,
    dataHoraDispositivo: new Date(p.timestamp).toISOString(),
    origem: p.origem,
    removido: p.removido,
  }));

  // Filtra eventos que não conseguiram encontrar um veiculoId válido
  const eventosParaEnviar = payload.filter(p => p.veiculoId !== 'veiculo-nao-encontrado');
  if (eventosParaEnviar.length === 0) {
    console.warn('Nenhum evento pendente com veículo correspondente encontrado no cache local para sincronizar.');
    return 0;
  }

  try {
    // Envia para a API
    const response = await api.syncEventos(eventosParaEnviar);

    // Atualiza o status local dos eventos que foram recebidos pela API
    let successCount = 0;
    for (const res of response) {
      if (res.status === 'RECEBIDO' || res.status === 'JA_EXISTENTE') {
        const eventoLocal = pendentes.find(p => p.id === res.id);
        if (eventoLocal) {
          eventoLocal.statusSync = 'SINCRONIZADO';
          await writeRecord(db, 'eventos', eventoLocal);
          if (res.status === 'RECEBIDO') successCount++;
        }
      }
    }
    return successCount;
  } catch (error) {
    await logErrorToDb(error, 'sincronizarEventosPendentes', 'ERRO_API_SYNC_EVENTOS');
    throw error;
  }
}

// Logs de Auditoria
export async function getLogs(): Promise<Log[]> {
  const db = await openDB();
  const logs = await getAllRecords<Log>(db, 'logs');
  return logs.sort((a, b) => b.id.localeCompare(a.id)); // Newest logs first based on id timestamp
}
