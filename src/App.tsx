/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, WifiOff, CloudLightning, RefreshCw, Shield, 
  User, Database, Bus, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import { 
  openDB, seedInitialDataIfNeeded, getDeviceSetup, 
  getVeiculoById, sincronizarEventosPendentes, getEventos 
} from './db';
import { Veiculo } from './types';
import SetupDevice from './components/SetupDevice';
import DriverApp from './components/DriverApp';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [veiculoVinculado, setVeiculoVinculado] = useState<Veiculo | null>(null);

  // Estados Globais
  const [view, setView] = useState<'driver' | 'admin'>('driver');
  const [isOnline, setIsOnline] = useState(true); // Toggle manual para simulação
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    inicializarApp();
  }, []);

  useEffect(() => {
    if (dbReady) {
      atualizarContadorPendentes();
      // Atualiza o contador de tempos em tempos para manter sincronia
      const interval = setInterval(atualizarContadorPendentes, 3000);
      return () => clearInterval(interval);
    }
  }, [dbReady, view]);

  async function inicializarApp() {
    try {
      await seedInitialDataIfNeeded();
      setDbReady(true);
      await verificarSetup();
    } catch (err) {
      console.error("Erro ao inicializar o Auris Frota:", err);
    }
  }

  async function verificarSetup() {
    try {
      const setup = await getDeviceSetup();
      if (setup && setup.veiculoId) {
        const v = await getVeiculoById(setup.veiculoId);
        if (v) {
          setVeiculoVinculado(v);
          setIsSetupComplete(true);
          return;
        }
      }
      setIsSetupComplete(false);
    } catch (err) {
      console.error("Erro ao verificar setup do dispositivo:", err);
      setIsSetupComplete(false);
    }
  }

  async function atualizarContadorPendentes() {
    try {
      const evts = await getEventos(true); // Inclui removidos também para sincronização
      const pendentes = evts.filter(e => e.statusSync === 'PENDENTE').length;
      setPendingSyncCount(pendentes);
    } catch (err) {
      console.error("Erro ao carregar pendentes:", err);
    }
  }

  async function handleSincronizar() {
    if (!isOnline || pendingSyncCount === 0 || syncing) return;

    setSyncing(true);
    try {
      // Simula latência de rede de 1.5s
      await new Promise(resolve => setTimeout(resolve, 1500));
      const sincronizados = await sincronizarEventosPendentes();
      await atualizarContadorPendentes();
      
      setSyncToast(`Sincronização concluída com sucesso! ${sincronizados} registros enviados.`);
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setSyncing(false);
    }
  }

  // Se o banco de dados ainda não carregou, exibe tela de carregamento elegante
  if (!dbReady) {
    return (
      <div id="loader-container" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="text-blue-600 mb-4"
        >
          <RefreshCw className="w-10 h-10" />
        </motion.div>
        <h2 className="text-lg font-bold font-display">Auris Frota</h2>
        <p className="text-xs text-slate-400 mt-1">uma plataforma do ecossistema Auris</p>
        <p className="text-xs text-slate-500 mt-1">Carregando banco de dados local IndexedDB...</p>
      </div>
    );
  }

  // Se o dispositivo não foi configurado (primeira execução), exibe tela de Setup
  if (!isSetupComplete || !veiculoVinculado) {
    return (
      <SetupDevice 
        onSetupComplete={() => {
          verificarSetup();
          setView('driver');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] text-slate-900 font-sans">
      
      {/* GLOBAL STATUS BAR (BARRA DE STATUS DO DISPOSITIVO) */}
      <header id="global-kiosk-header" className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between gap-4 z-40 shadow-sm">
        
        {/* Identificação do Dispositivo com Logotipo Fp do Design */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold italic text-xl">Af</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 leading-none">
              Auris Frota <span className="font-normal text-slate-400 text-sm hidden sm:inline italic">MVP v1.0</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold block leading-none mt-1">
              FROTA: <strong className="text-blue-700 font-mono">{veiculoVinculado.frota}</strong> ({veiculoVinculado.placa})
            </span>
          </div>
        </div>

        {/* Offline Toggle & Sincronização */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Toggle Manual de Rede (Online/Offline para Demonstração) */}
          <div className="flex items-center gap-2 border-r border-slate-200 pr-3 sm:pr-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:inline">Simular Rede:</span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
              title="Clique para alternar o status de rede (simulação)"
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span>ON</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span>OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Sincronizador de Pendentes e Indicador FIP Offline do Mockup */}
          <div className="flex items-center gap-2 sm:gap-4">
            {pendingSyncCount > 0 || !isOnline ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-[10px] tracking-tight uppercase">
                  {!isOnline ? 'OFFLINE' : 'PENDENTE'}: {pendingSyncCount} REGISTROS
                </span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] tracking-tight uppercase">SINC OK</span>
              </div>
            )}

            <button
              onClick={handleSincronizar}
              disabled={!isOnline || pendingSyncCount === 0 || syncing}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                !isOnline || pendingSyncCount === 0
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-800 shadow-sm'
              }`}
            >
              {syncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudLightning className="w-3.5 h-3.5" />
              )}
              Sincronizar
            </button>
          </div>

        </div>

      </header>

      {/* TOAST DE SUCESSO DE SINCRONIZAÇÃO */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2.5 flex items-center gap-2 font-semibold justify-center"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {syncToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEÚDO DA TELA ATIVA */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'driver' ? (
            <motion.div
              key="driver-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <DriverApp 
                veiculoVinculado={veiculoVinculado} 
                onAdminToggle={() => setView('admin')} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <AdminPanel 
                onBack={async () => {
                  await verificarSetup(); // Recarrega se mudou veiculo
                  setView('driver');
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
