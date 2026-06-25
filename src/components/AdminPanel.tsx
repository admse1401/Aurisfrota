/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Bus, Calendar, FileSpreadsheet, History, Shield, 
  Trash2, Edit3, Plus, ArrowLeft, Download, Search, Check, 
  X, AlertTriangle, RefreshCw, Key, ShieldAlert
} from 'lucide-react';
import { 
  getEventos, getMotoristas, getVeiculos, getLogs, 
  saveMotorista, deleteMotorista, saveVeiculo, deleteVeiculo,
  registrarOuEditarEventoAdmin, excluirEventoLogico, resetDeviceSetup 
} from '../db';
import { Motorista, Veiculo, Evento, Log, EventoTipo } from '../types';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  onBack: () => void;
}

type TabType = 'eventos' | 'motoristas' | 'veiculos' | 'relatorio' | 'logs' | 'setup';

export default function AdminPanel({ onBack }: AdminPanelProps) {
  // Autenticação Admin
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Estados principais
  const [activeTab, setActiveTab] = useState<TabType>('eventos');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  // Filtros Globais / Eventos
  const [filtroMotorista, setFiltroMotorista] = useState('');
  const [filtroVeiculo, setFiltroVeiculo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [mostrarRemovidos, setMostrarRemovidos] = useState(false);

  // Modais e Formulários
  const [showEditEventoModal, setShowEditEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Partial<Evento> | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [justificativaError, setJustificativaError] = useState('');

  // Modais de Exclusão de Evento
  const [showDeleteEventoModal, setShowDeleteEventoModal] = useState<string | null>(null); // Armazena ID do evento

  // CRUD Motoristas
  const [showAddMotorista, setShowAddMotorista] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [motNome, setMotNome] = useState('');
  const [motMatricula, setMotMatricula] = useState('');
  const [motPin, setMotPin] = useState('');
  const [motError, setMotError] = useState('');

  // CRUD Veículos
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [veiFrota, setVeiFrota] = useState('');
  const [veiPlaca, setVeiPlaca] = useState('');
  const [veiError, setVeiError] = useState('');

  // Filtros Relatório FIP
  const [fipFiltroMotorista, setFipFiltroMotorista] = useState('');
  const [fipFiltroDataInicio, setFipFiltroDataInicio] = useState('');
  const [fipFiltroDataFim, setFipFiltroDataFim] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      carregarTodosDados();
    }
  }, [isAuthenticated, mostrarRemovidos]);

  async function carregarTodosDados() {
    try {
      const evts = await getEventos(mostrarRemovidos);
      const mots = await getMotoristas();
      const veis = await getVeiculos();
      const lgs = await getLogs();

      setEventos(evts);
      setMotoristas(mots);
      setVeiculos(veis);
      setLogs(lgs);
    } catch (err) {
      console.error("Erro ao carregar dados do admin:", err);
    }
  }

  // Handle Password Authentication
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
  }

  // --- CRUD Motoristas ---
  function abrirNovoMotorista() {
    setEditingMotorista(null);
    setMotNome('');
    setMotMatricula('');
    setMotPin('');
    setMotError('');
    setShowAddMotorista(true);
  }

  function abrirEditarMotorista(m: Motorista) {
    setEditingMotorista(m);
    setMotNome(m.nome);
    setMotMatricula(m.matricula);
    setMotPin(m.pin);
    setMotError('');
    setShowAddMotorista(true);
  }

  async function handleSalvarMotorista(e: React.FormEvent) {
    e.preventDefault();
    setMotError('');

    if (!motNome.trim() || !motMatricula.trim() || !motPin.trim()) {
      setMotError('Todos os campos são obrigatórios.');
      return;
    }

    if (motPin.length < 4) {
      setMotError('O PIN deve ter pelo menos 4 números.');
      return;
    }

    // Verificar matrícula duplicada
    const duplicado = motoristas.some(m => m.matricula === motMatricula && (!editingMotorista || m.id !== editingMotorista.id));
    if (duplicado) {
      setMotError('Esta matrícula já está cadastrada para outro motorista.');
      return;
    }

    const mSave: Motorista = {
      id: editingMotorista ? editingMotorista.id : `mot-${Date.now()}`,
      nome: motNome.trim(),
      matricula: motMatricula.trim(),
      pin: motPin.trim()
    };

    try {
      await saveMotorista(mSave);
      setShowAddMotorista(false);
      carregarTodosDados();
    } catch (err) {
      setMotError('Erro ao salvar motorista no banco.');
    }
  }

  async function handleExcluirMotorista(id: string) {
    if (window.confirm('Tem certeza de que deseja remover este motorista?')) {
      try {
        await deleteMotorista(id);
        carregarTodosDados();
      } catch (err) {
        alert('Erro ao excluir motorista.');
      }
    }
  }

  // --- CRUD Veículos ---
  function abrirNovoVeiculo() {
    setEditingVeiculo(null);
    setVeiFrota('');
    setVeiPlaca('');
    setVeiError('');
    setShowAddVeiculo(true);
  }

  function abrirEditarVeiculo(v: Veiculo) {
    setEditingVeiculo(v);
    setVeiFrota(v.frota);
    setVeiPlaca(v.placa);
    setVeiError('');
    setShowAddVeiculo(true);
  }

  async function handleSalvarVeiculo(e: React.FormEvent) {
    e.preventDefault();
    setVeiError('');

    const frotaT = veiFrota.trim().toUpperCase();
    const placaT = veiPlaca.trim().toUpperCase();

    if (!frotaT || !placaT) {
      setVeiError('Todos os campos são obrigatórios.');
      return;
    }

    // Verificar duplicidade
    const duplicado = veiculos.some(v => (v.frota === frotaT || v.placa === placaT) && (!editingVeiculo || v.id !== editingVeiculo.id));
    if (duplicado) {
      setVeiError('Esta frota ou placa já existe.');
      return;
    }

    const vSave: Veiculo = {
      id: editingVeiculo ? editingVeiculo.id : `vei-${Date.now()}`,
      frota: frotaT,
      placa: placaT
    };

    try {
      await saveVeiculo(vSave);
      setShowAddVeiculo(false);
      carregarTodosDados();
    } catch (err) {
      setVeiError('Erro ao salvar veículo no banco.');
    }
  }

  async function handleExcluirVeiculo(id: string) {
    if (window.confirm('Excluir este veículo irá limpar o setup caso o dispositivo esteja vinculado a ele. Deseja continuar?')) {
      try {
        await deleteVeiculo(id);
        carregarTodosDados();
      } catch (err) {
        alert('Erro ao excluir veículo.');
      }
    }
  }

  // --- CONTROLE DE EVENTOS ---
  function abrirNovoEvento() {
    setEditingEvento({
      id: '',
      motoristaId: motoristas[0]?.id || '',
      nomeMotorista: motoristas[0]?.nome || '',
      frota: veiculos[0]?.frota || '',
      placa: veiculos[0]?.placa || '',
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
      tipo: 'ENTRADA',
      kmInicial: undefined,
      kmFinal: undefined,
      statusSync: 'PENDENTE',
      origem: 'MANUAL',
      removido: false
    });
    setJustificativa('');
    setJustificativaError('');
    setShowEditEventoModal(true);
  }

  function abrirEditarEvento(e: Evento) {
    setEditingEvento({ ...e });
    setJustificativa('');
    setJustificativaError('');
    setShowEditEventoModal(true);
  }

  async function handleSalvarEvento() {
    if (!editingEvento) return;
    setJustificativaError('');

    if (!justificativa.trim() || justificativa.trim().length < 8) {
      setJustificativaError('Forneça uma justificativa detalhada (mínimo 8 caracteres).');
      return;
    }

    // Preencher informações do motorista e veículo se tiver mudado no select
    const motoristaCompleto = motoristas.find(m => m.id === editingEvento.motoristaId);
    const veiculoCompleto = veiculos.find(v => v.frota === editingEvento.frota);

    const eventoFinal: Evento = {
      id: editingEvento.id || '',
      motoristaId: editingEvento.motoristaId || '',
      nomeMotorista: motoristaCompleto ? motoristaCompleto.nome : (editingEvento.nomeMotorista || ''),
      frota: editingEvento.frota || '',
      placa: veiculoCompleto ? veiculoCompleto.placa : (editingEvento.placa || ''),
      data: editingEvento.data || '',
      hora: editingEvento.hora ? (editingEvento.hora.length === 5 ? `${editingEvento.hora}:00` : editingEvento.hora) : '',
      timestamp: new Date(`${editingEvento.data}T${editingEvento.hora}`).getTime() || Date.now(),
      tipo: editingEvento.tipo as EventoTipo,
      kmInicial: editingEvento.tipo === 'ENTRADA' ? Number(editingEvento.kmInicial) || undefined : undefined,
      kmFinal: editingEvento.tipo === 'SAIDA' ? Number(editingEvento.kmFinal) || undefined : undefined,
      statusSync: 'PENDENTE',
      origem: editingEvento.id ? editingEvento.origem as any : 'MANUAL',
      removido: false
    };

    try {
      await registrarOuEditarEventoAdmin(eventoFinal, justificativa.trim());
      setShowEditEventoModal(false);
      setEditingEvento(null);
      setJustificativa('');
      carregarTodosDados();
    } catch (err) {
      alert('Erro ao registrar alterações do evento.');
    }
  }

  async function handleConfirmarExclusaoLogica() {
    if (!showDeleteEventoModal) return;
    setJustificativaError('');

    if (!justificativa.trim() || justificativa.trim().length < 8) {
      setJustificativaError('Uma justificativa para a exclusão lógica é obrigatória (mínimo 8 caracteres).');
      return;
    }

    try {
      await excluirEventoLogico(showDeleteEventoModal, justificativa.trim());
      setShowDeleteEventoModal(null);
      setJustificativa('');
      carregarTodosDados();
    } catch (err) {
      alert('Erro ao realizar a exclusão lógica do evento.');
    }
  }

  // Resetar setup para trocar o dispositivo
  async function handleResetarQuiosque() {
    if (window.confirm('Tem certeza de que deseja limpar a configuração de frota vinculada? O tablet voltará para a tela de setup inicial.')) {
      try {
        await resetDeviceSetup();
        onBack(); // Volta para a tela inicial que disparará o setup
      } catch (err) {
        alert('Erro ao resetar dispositivo.');
      }
    }
  }

  // --- FILTRAGEM DE EVENTOS ---
  const eventosFiltrados = eventos.filter(evt => {
    // Filtro motorista
    if (filtroMotorista && evt.motoristaId !== filtroMotorista) return false;
    // Filtro veículo (frota)
    if (filtroVeiculo && evt.frota !== filtroVeiculo) return false;
    // Filtro data inicio
    if (filtroDataInicio && evt.data < filtroDataInicio) return false;
    // Filtro data fim
    if (filtroDataFim && evt.data > filtroDataFim) return false;

    return true;
  });

  // --- PROCESSO DE RELATÓRIO CONSOLIDADO MODELO FIP ---
  // Estrutura do Relatório Consolidado (pareamento de ENTRADA e SAIDA por motorista)
  interface ParFIP {
    id: string;
    matricula: string;
    nome: string;
    veiculo: string;
    entradaDataHora: string;
    saidaDataHora: string;
    minutosTrabalhados: number;
    detalhes: string;
  }

  function gerarDadosRelatorioFIP(): { pares: ParFIP[], resumoTotais: { [matricula: string]: { nome: string, totalHoras: string, totalMinutos: number } } } {
    const pares: ParFIP[] = [];
    const resumoTotais: { [matricula: string]: { nome: string, totalHoras: string, totalMinutos: number } } = {};

    // Pegamos eventos ATIVOS (não removidos logicamente)
    // Filtramos de acordo com as datas e motorista selecionados nas opções do Relatório FIP
    const eventosFIP = eventos
      .filter(e => !e.removido)
      .filter(evt => {
        if (fipFiltroMotorista && evt.motoristaId !== fipFiltroMotorista) return false;
        if (fipFiltroDataInicio && evt.data < fipFiltroDataInicio) return false;
        if (fipFiltroDataFim && evt.data > fipFiltroDataFim) return false;
        return true;
      });

    // Agrupamos eventos por motorista para fazer o pareamento correto (cronológico)
    const porMotorista: { [motoristaId: string]: Evento[] } = {};
    eventosFIP.forEach(evt => {
      if (!porMotorista[evt.motoristaId]) porMotorista[evt.motoristaId] = [];
      porMotorista[evt.motoristaId].push(evt);
    });

    // Para cada motorista, ordenamos cronologicamente (mais antigo primeiro para parear)
    Object.keys(porMotorista).forEach(motId => {
      const lista = porMotorista[motId].sort((a, b) => a.timestamp - b.timestamp);
      let i = 0;

      const mInfo = motoristas.find(m => m.id === motId);
      const mNome = mInfo ? mInfo.nome : (lista[0]?.nomeMotorista || 'Desconhecido');
      const mMatricula = mInfo ? mInfo.matricula : 'S/M';

      if (!resumoTotais[mMatricula]) {
        resumoTotais[mMatricula] = { nome: mNome, totalHoras: '0h 0m', totalMinutos: 0 };
      }

      while (i < lista.length) {
        const atual = lista[i];

        if (atual.tipo === 'ENTRADA') {
          // Procura a próxima SAÍDA desse motorista
          let proximaSaida: Evento | null = null;
          let j = i + 1;
          while (j < lista.length) {
            if (lista[j].tipo === 'SAIDA') {
              proximaSaida = lista[j];
              // Avançar o ponteiro para pular esta saída do fluxo principal
              i = j; 
              break;
            }
            j++;
          }

          if (proximaSaida) {
            const diffMs = proximaSaida.timestamp - atual.timestamp;
            const diffMin = Math.round(diffMs / 60000);

            pares.push({
              id: `${atual.id}-${proximaSaida.id}`,
              matricula: mMatricula,
              nome: mNome,
              veiculo: `${atual.frota} (${atual.placa})`,
              entradaDataHora: `${atual.data} às ${atual.hora.substring(0, 5)}`,
              saidaDataHora: `${proximaSaida.data} às ${proximaSaida.hora.substring(0, 5)}`,
              minutosTrabalhados: diffMin,
              detalhes: `KM Inicial: ${atual.kmInicial || 'N/R'} | KM Final: ${proximaSaida.kmFinal || 'N/R'}`
            });

            resumoTotais[mMatricula].totalMinutos += diffMin;
          } else {
            // ENTRADA aberta sem SAÍDA pareada ainda
            pares.push({
              id: `aberto-${atual.id}`,
              matricula: mMatricula,
              nome: mNome,
              veiculo: `${atual.frota} (${atual.placa})`,
              entradaDataHora: `${atual.data} às ${atual.hora.substring(0, 5)}`,
              saidaDataHora: 'Jornada em aberto (Sem Saída)',
              minutosTrabalhados: 0,
              detalhes: `KM Inicial: ${atual.kmInicial || 'N/R'}`
            });
          }
        } else {
          // SAIDA solitária sem ENTRADA prévia correspondente
          pares.push({
            id: `solitario-${atual.id}`,
            matricula: mMatricula,
            nome: mNome,
            veiculo: `${atual.frota} (${atual.placa})`,
            entradaDataHora: 'Sem Entrada Correspondente',
            saidaDataHora: `${atual.data} às ${atual.hora.substring(0, 5)}`,
            minutosTrabalhados: 0,
            detalhes: `KM Final: ${atual.kmFinal || 'N/R'}`
          });
        }
        i++;
      }

      // Converter minutos totais do resumo de volta para horas amigáveis
      const totMin = resumoTotais[mMatricula].totalMinutos;
      const hrs = Math.floor(totMin / 60);
      const mins = totMin % 60;
      resumoTotais[mMatricula].totalHoras = `${hrs}h ${mins}m`;
    });

    return { pares, resumoTotais };
  }

  const dadosRelatorio = useMemo(() => gerarDadosRelatorioFIP(), [
    eventos, fipFiltroMotorista, fipFiltroDataInicio, fipFiltroDataFim, motoristas
  ]);

  // Exportar para CSV (BOM UTF-8, ponto-e-vírgula para Excel PT-BR)
  function exportarCSV() {
    const headers = ['Matrícula', 'Nome do Motorista', 'Veículo', 'Entrada Registrada', 'Saída Registrada', 'Duração (Minutos)', 'Horas Trabalhadas', 'Informações de KM'];
    
    const rows = dadosRelatorio.pares.map(p => {
      const hrs = Math.floor(p.minutosTrabalhados / 60);
      const mins = p.minutosTrabalhados % 60;
      const hrsFormatadas = p.minutosTrabalhados > 0 ? `${hrs}h ${mins}m` : 'N/A';
      return [
        p.matricula,
        p.nome,
        p.veiculo,
        p.entradaDataHora,
        p.saidaDataHora,
        p.minutosTrabalhados,
        hrsFormatadas,
        p.detalhes
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_fip_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Exportar para XLSX nativo usando SheetJS
  function exportarXLSX() {
    const rowsParaSheet = dadosRelatorio.pares.map(p => {
      const hrs = Math.floor(p.minutosTrabalhados / 60);
      const mins = p.minutosTrabalhados % 60;
      const hrsFormatadas = p.minutosTrabalhados > 0 ? `${hrs}h ${mins}m` : '0h 0m';
      return {
        'Matrícula': p.matricula,
        'Nome do Motorista': p.nome,
        'Veículo/Frota': p.veiculo,
        'Entrada Registrada': p.entradaDataHora,
        'Saída Registrada': p.saidaDataHora,
        'Duração (Minutos)': p.minutosTrabalhados,
        'Tempo Trabalhado': hrsFormatadas,
        'Observações de KM': p.detalhes
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rowsParaSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BDT Pares");

    // Adiciona uma aba para os totais consolidados por motorista
    const totaisParaSheet = Object.keys(dadosRelatorio.resumoTotais).map(mat => {
      const item = dadosRelatorio.resumoTotais[mat];
      return {
        'Matrícula': mat,
        'Nome': item.nome,
        'Minutos Totais': item.totalMinutos,
        'Total Horas no Período': item.totalHoras
      };
    });

    const worksheetTotais = XLSX.utils.json_to_sheet(totaisParaSheet);
    XLSX.utils.book_append_sheet(workbook, worksheetTotais, "Totais Consolidados");

    XLSX.writeFile(workbook, `relatorio_fip_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <div id="admin-panel-container" className="flex-1 flex flex-col bg-[#f5f5f5] text-slate-900 min-h-screen">
      {!isAuthenticated ? (
        // TELA DE LOGIN DO ADMIN
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-full mb-3 border border-indigo-100">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 font-display">Acesso Administrativo</h1>
              <p className="text-xs text-slate-500 mt-1">
                Digite a senha administrativa para acessar os relatórios e logs de auditoria.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Senha de Administrador</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono font-bold"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  (Senha de demonstração padrão: <strong className="text-slate-600 font-bold">admin123</strong>)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                >
                  Voltar ao Quiosque
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Entrar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        // INTERFACE DO ADMIN LOGADO
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* BARRA LATERAL ADMIN */}
          <div className="w-full md:w-64 bg-white p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 shadow-sm">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm leading-none font-display">Auris Frota</h2>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1 block">Painel Gerencial</span>
                </div>
              </div>

              {/* Links de navegação */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('eventos')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'eventos'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  Lista de Eventos
                </button>

                <button
                  onClick={() => setActiveTab('relatorio')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'relatorio'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                  Relatório FIP
                </button>

                <button
                  onClick={() => setActiveTab('motoristas')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'motoristas'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  Cadastrar Motoristas
                </button>

                <button
                  onClick={() => setActiveTab('veiculos')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'veiculos'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Bus className="w-4 h-4 flex-shrink-0" />
                  Cadastrar Veículos
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'logs'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <History className="w-4 h-4 flex-shrink-0" />
                  Log de Auditoria
                </button>

                <button
                  onClick={() => setActiveTab('setup')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    activeTab === 'setup'
                      ? 'bg-indigo-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  Configurar Dispositivo
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button
                onClick={onBack}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors bg-white shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Retornar ao Quiosque
              </button>
            </div>
          </div>

          {/* ÁREA DE CONTEÚDO PRINCIPAL */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-screen bg-[#f5f5f5]">
            
            {/* TAB: LISTA DE EVENTOS */}
            {activeTab === 'eventos' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Lista de Eventos Registrados</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Monitore, edite (RN005) ou realize a exclusão lógica (RN004) de jornadas gravadas.
                    </p>
                  </div>
                  <button
                    onClick={abrirNovoEvento}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-indigo-950/30 self-start"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Registro Manual
                  </button>
                </div>

                {/* FILTROS EVENTOS */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs shadow-sm">
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">Motorista</label>
                    <select
                      value={filtroMotorista}
                      onChange={(e) => setFiltroMotorista(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="">Todos</option>
                      {motoristas.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} ({m.matricula})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">Veículo / Frota</label>
                    <select
                      value={filtroVeiculo}
                      onChange={(e) => setFiltroVeiculo(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="">Todos</option>
                      {veiculos.map(v => (
                        <option key={v.id} value={v.frota}>{v.frota}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">De: Data Início</label>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">Até: Data Fim</label>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-end pb-1.5 pl-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                      <input
                        type="checkbox"
                        checked={mostrarRemovidos}
                        onChange={(e) => setMostrarRemovidos(e.target.checked)}
                        className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0"
                      />
                      <span>Mostrar Excluídos</span>
                    </label>
                  </div>
                </div>

                {/* TABELA DE EVENTOS */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Tipo</th>
                          <th className="p-4">Motorista</th>
                          <th className="p-4">Veículo / Frota</th>
                          <th className="p-4">Data / Hora</th>
                          <th className="p-4">Quilometragem (KM)</th>
                          <th className="p-4">Origem</th>
                          <th className="p-4">Status Sinc</th>
                          <th className="p-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500">
                              Nenhum evento registrado encontrado com os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          eventosFiltrados.map((evt) => (
                            <tr 
                              key={evt.id} 
                              className={`transition-colors hover:bg-slate-50 ${
                                evt.removido ? 'bg-red-50 text-slate-400 line-through decoration-slate-400' : ''
                              }`}
                            >
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
                                  evt.tipo === 'ENTRADA' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                                }`}>
                                  {evt.tipo}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {evt.nomeMotorista}
                                <span className="block text-[10px] font-mono text-slate-500 font-normal mt-0.5">Matrícula: {motoristas.find(m => m.id === evt.motoristaId)?.matricula || 'S/M'}</span>
                              </td>
                              <td className="p-4 font-medium text-slate-700">
                                {evt.frota}
                                <span className="block text-[10px] font-mono text-slate-500 font-normal mt-0.5">Placa: {evt.placa}</span>
                              </td>
                              <td className="p-4">
                                <span className="font-mono text-slate-800 font-semibold">{evt.data}</span>
                                <span className="block text-[10px] font-mono text-slate-500 mt-0.5">{evt.hora}</span>
                              </td>
                              <td className="p-4 font-mono">
                                {evt.tipo === 'ENTRADA' ? (
                                  <span>Inicial: <strong className="text-slate-900 font-extrabold">{evt.kmInicial || 'Não reg.'}</strong></span>
                                ) : (
                                  <span>Final: <strong className="text-slate-900 font-extrabold">{evt.kmFinal || 'Não reg.'}</strong></span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  evt.origem === 'AUTOMATICO' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                                }`}>
                                  {evt.origem}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 ${
                                  evt.statusSync === 'SINCRONIZADO' ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${evt.statusSync === 'SINCRONIZADO' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                  {evt.statusSync}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  {!evt.removido ? (
                                    <>
                                      <button
                                        onClick={() => abrirEditarEvento(evt)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors"
                                        title="Editar Evento"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteEventoModal(evt.id)}
                                        className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors"
                                        title="Excluir Lógico"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                      Excluído Logicamente
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RELATÓRIO CONSOLIDADO MODELO FIP */}
            {activeTab === 'relatorio' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Relatório Consolidado (Modelo FIP)</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Agrupamento cronológico e pareamento de ENTRADAS e SAÍDAS por motoristas, com cálculo de horas totais.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportarCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 shadow-sm"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={exportarXLSX}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* FILTROS RELATÓRIO */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-sm">
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">Motorista</label>
                    <select
                      value={fipFiltroMotorista}
                      onChange={(e) => setFipFiltroMotorista(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="">Todos</option>
                      {motoristas.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} ({m.matricula})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">De: Data Início</label>
                    <input
                      type="date"
                      value={fipFiltroDataInicio}
                      onChange={(e) => setFipFiltroDataInicio(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 uppercase font-bold text-[10px] tracking-wider">Até: Data Fim</label>
                    <input
                      type="date"
                      value={fipFiltroDataFim}
                      onChange={(e) => setFipFiltroDataFim(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* RESUMO DE TOTAIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(dadosRelatorio.resumoTotais).map(mat => {
                    const item = dadosRelatorio.resumoTotais[mat];
                    return (
                      <div key={mat} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Motorista</p>
                          <h4 className="font-bold text-slate-800 text-sm">{item.nome}</h4>
                          <span className="block text-xs text-slate-500">Matrícula: {mat}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-500 uppercase font-extrabold">Total Período</span>
                          <span className="text-lg font-black text-indigo-700 font-mono">{item.totalHoras}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TABELA DETALHADA DE PARES (FIP) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Matrícula</th>
                          <th className="p-4">Nome do Motorista</th>
                          <th className="p-4">Veículo / Frota</th>
                          <th className="p-4">Registro Entrada</th>
                          <th className="p-4">Registro Saída</th>
                          <th className="p-4">Horas Trabalhadas</th>
                          <th className="p-4">Detalhes / KM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dadosRelatorio.pares.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              Nenhuma jornada registrada com os critérios selecionados para o modelo FIP.
                            </td>
                          </tr>
                        ) : (
                          dadosRelatorio.pares.map((p) => {
                            const hrs = Math.floor(p.minutosTrabalhados / 60);
                            const mins = p.minutosTrabalhados % 60;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono text-slate-700 font-bold">{p.matricula}</td>
                                <td className="p-4 text-slate-800 font-bold">{p.nome}</td>
                                <td className="p-4 text-slate-700">{p.veiculo}</td>
                                <td className="p-4 font-mono text-emerald-700 font-bold">{p.entradaDataHora}</td>
                                <td className={`p-4 font-mono ${p.saidaDataHora.includes('aberto') ? 'text-amber-700 italic font-bold' : 'text-orange-700 font-bold'}`}>
                                  {p.saidaDataHora}
                                </td>
                                <td className="p-4 font-mono font-bold text-indigo-700">
                                  {p.minutosTrabalhados > 0 ? `${hrs}h ${mins}m` : '—'}
                                </td>
                                <td className="p-4 text-[11px] text-slate-500">{p.detalhes}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CADASTRAR MOTORISTAS */}
            {activeTab === 'motoristas' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Cadastro de Motoristas</h2>
                    <p className="text-xs text-slate-500 mt-1">Gerencie a lista de motoristas habilitados a registrar ponto.</p>
                  </div>
                  <button
                    onClick={abrirNovoMotorista}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Motorista
                  </button>
                </div>

                {/* FORM ADICIONAR MOTORISTA (INLINE / MODAL DESIGN) */}
                {showAddMotorista && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSalvarMotorista}
                    className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 max-w-xl shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {editingMotorista ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
                      </h3>
                      <button type="button" onClick={() => setShowAddMotorista(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {motError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                        {motError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome Completo</label>
                        <input
                          type="text"
                          value={motNome}
                          onChange={(e) => setMotNome(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Matrícula (Única)</label>
                        <input
                          type="text"
                          value={motMatricula}
                          onChange={(e) => setMotMatricula(e.target.value)}
                          placeholder="Ex: 4040"
                          className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">PIN de Segurança (Teclado Numérico)</label>
                      <input
                        type="password"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={motPin}
                        onChange={(e) => setMotPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Mínimo 4 números"
                        className="w-32 bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-900 text-xs text-center font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMotorista(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded shadow-sm"
                      >
                        Salvar Motorista
                      </button>
                    </div>
                  </motion.form>
                )}

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Matrícula</th>
                        <th className="p-4">Nome Completo</th>
                        <th className="p-4">PIN / Senha</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {motoristas.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-900 text-sm">{m.matricula}</td>
                          <td className="p-4 font-bold text-slate-800">{m.nome}</td>
                          <td className="p-4 font-mono text-slate-400">••••</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => abrirEditarMotorista(m)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleExcluirMotorista(m.id)}
                                className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CADASTRAR VEÍCULOS */}
            {activeTab === 'veiculos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Cadastro de Veículos</h2>
                    <p className="text-xs text-slate-500 mt-1">Gerencie os veículos cadastrados no sistema.</p>
                  </div>
                  <button
                    onClick={abrirNovoVeiculo}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Veículo
                  </button>
                </div>

                {/* FORM ADICIONAR VEICULO */}
                {showAddVeiculo && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSalvarVeiculo}
                    className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 max-w-xl shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {editingVeiculo ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
                      </h3>
                      <button type="button" onClick={() => setShowAddVeiculo(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {veiError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                        {veiError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Prefixo / Prefixo Frota</label>
                        <input
                          type="text"
                          value={veiFrota}
                          onChange={(e) => setVeiFrota(e.target.value)}
                          placeholder="Ex: F-300"
                          className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-900 text-xs focus:outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Placa do Veículo</label>
                        <input
                          type="text"
                          value={veiPlaca}
                          onChange={(e) => setVeiPlaca(e.target.value)}
                          placeholder="Ex: BRA2E19"
                          className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-900 text-xs focus:outline-none uppercase"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddVeiculo(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded shadow-sm"
                      >
                        Salvar Veículo
                      </button>
                    </div>
                  </motion.form>
                )}

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Prefixo Frota</th>
                        <th className="p-4">Placa do Veículo</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {veiculos.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800 text-sm">{v.frota}</td>
                          <td className="p-4 font-mono text-slate-600">{v.placa}</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => abrirEditarVeiculo(v)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleExcluirVeiculo(v.id)}
                                className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: LOGS DE AUDITORIA */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Log de Auditoria Gerencial</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Histórico completo de alterações manuais (RN005), criações e exclusões lógicas (RN004). O histórico nunca é limpo.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Data / Hora</th>
                          <th className="p-4">Usuário</th>
                          <th className="p-4">Ação Realizada</th>
                          <th className="p-4">Histórico / Valor Anterior</th>
                          <th className="p-4">Novo Valor</th>
                          <th className="p-4">Justificativa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              Nenhum log de auditoria registrado no sistema ainda.
                            </td>
                          </tr>
                        ) : (
                          logs.map((lg) => (
                            <tr key={lg.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{lg.dataHora}</td>
                              <td className="p-4 text-indigo-700 font-semibold">{lg.usuario}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                                  lg.acao.includes('EXCLUSÃO') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {lg.acao}
                                </span>
                              </td>
                              <td className="p-4 text-slate-500 text-[11px] font-mono leading-normal min-w-44">{lg.valorAntigo}</td>
                              <td className="p-4 text-slate-700 text-[11px] font-mono leading-normal min-w-44">{lg.valorNovo}</td>
                              <td className="p-4 text-amber-800 text-[11px] bg-amber-50/50 leading-normal max-w-sm italic border-l-2 border-amber-500">
                                {lg.justificativa}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONFIGURAR DISPOSITIVO */}
            {activeTab === 'setup' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Configurações do Dispositivo / Quiosque</h2>
                  <p className="text-xs text-slate-500 mt-1">Reabra o setup para desvincular o tablet da frota atual.</p>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 shadow-sm">
                  <div className="flex gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg self-start">
                      <AlertTriangle className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-800 text-sm">Vincular Quiosque a Outro Veículo</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Esta ação removerá a associação deste tablet ao veículo de frota cadastrado. No próximo reinício ou carregamento, o aplicativo exigirá que o administrador faça o setup inicial de vinculação.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleResetarQuiosque}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Remover Associação do Veículo
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* MODAL: EDITAR OU CRIAR EVENTO (JUSTIFICATIVA OBRIGATÓRIA RN005) */}
          {showEditEventoModal && editingEvento && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 my-8"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-slate-850 text-base">
                    {editingEvento.id ? 'Editar Registro de Jornada' : 'Adicionar Registro Manual'}
                  </h3>
                  <button onClick={() => setShowEditEventoModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {justificativaError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                    {justificativaError}
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1 font-bold uppercase">Motorista</label>
                      <select
                        value={editingEvento.motoristaId}
                        onChange={(e) => setEditingEvento({ ...editingEvento, motoristaId: e.target.value })}
                        disabled={!!editingEvento.id} // Não altera motorista de ponto existente
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      >
                        {motoristas.map(m => (
                          <option key={m.id} value={m.id}>{m.nome} ({m.matricula})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-bold uppercase">Veículo / Prefixo</label>
                      <select
                        value={editingEvento.frota}
                        onChange={(e) => setEditingEvento({ ...editingEvento, frota: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      >
                        {veiculos.map(v => (
                          <option key={v.id} value={v.frota}>{v.frota}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1 font-bold uppercase">Tipo de Evento</label>
                      <select
                        value={editingEvento.tipo}
                        onChange={(e) => setEditingEvento({ ...editingEvento, tipo: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="ENTRADA">ENTRADA</option>
                        <option value="SAIDA">SAÍDA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-bold uppercase">Data</label>
                      <input
                        type="date"
                        value={editingEvento.data}
                        onChange={(e) => setEditingEvento({ ...editingEvento, data: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-bold uppercase">Hora</label>
                      <input
                        type="time"
                        value={editingEvento.hora?.substring(0, 5)}
                        onChange={(e) => setEditingEvento({ ...editingEvento, hora: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Campo Opcional de KM conforme requisitos */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold uppercase">
                      Quilometragem (KM) — Opcional
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 45200"
                      value={editingEvento.tipo === 'ENTRADA' ? (editingEvento.kmInicial || '') : (editingEvento.kmFinal || '')}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        if (editingEvento.tipo === 'ENTRADA') {
                          setEditingEvento({ ...editingEvento, kmInicial: val });
                        } else {
                          setEditingEvento({ ...editingEvento, kmFinal: val });
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  {/* JUSTIFICATIVA OBRIGATÓRIA (RN005) */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-amber-700 mb-1 font-bold uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Justificativa Obrigatória (Mínimo 8 caracteres)
                    </label>
                    <textarea
                      rows={3}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Informe por que este registro está sendo criado ou alterado manualmente..."
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
                  <button
                    onClick={() => setShowEditEventoModal(false)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarEvento}
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Gravar Evento & Log
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* MODAL: EXCLUSÃO LÓGICA (RN004/RN005) */}
          {showDeleteEventoModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-2 bg-red-50 rounded-full">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base font-display">Exclusão Lógica de Evento</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  RN004: Eventos de ponto nunca são apagados definitivamente do IndexedDB. A exclusão é lógica e mantida no histórico de auditoria. Forneça uma justificativa obrigatória (RN005).
                </p>

                {justificativaError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                    {justificativaError}
                  </div>
                )}

                <div>
                  <label className="block text-amber-700 mb-1.5 text-xs font-bold uppercase">
                    Justificativa de Exclusão (Mínimo 8 caracteres)
                  </label>
                  <textarea
                    rows={3}
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Descreva o motivo pelo qual este ponto está sendo removido de forma lógica..."
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-slate-800 text-xs focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteEventoModal(null);
                      setJustificativa('');
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarExclusaoLogica}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
                  >
                    Confirmar Remoção Lógica
                  </button>
                </div>
              </motion.div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
