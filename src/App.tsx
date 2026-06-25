/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloudLightning, RefreshCw, Bus, CheckCircle2
} from 'lucide-react';
import {
  openDB, seedInitialDataIfNeeded, getDeviceSetup,
  getVeiculoById, sincronizarEventosPendentes
} from './db';
import { Veiculo } from './types';
import SetupDevice from './components/SetupDevice';
import DriverApp from './components/DriverApp';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [veiculoVinculado, setVeiculoVinculado] = useState<Veiculo | null>(null);

  const [view, setView] = useState<'driver' | 'admin'>('driver');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    inicializarApp();
  }, []);

  useEffect(() => {
    if (dbReady) {
      atualizarContadorPendentes();
      const interval = setInterval(atualizarContadorPendentes, 5000);
      return () => clearInterval(interval);
    }
  }, [dbReady, view]);

  // Auto-sync: tenta sincronizar pendentes periodicamente
  useEffect(() => {
    if (!dbReady) return;
    const interval = setInterval(() => {
      tentarSyncAutomatico();
    }, 10000);
    return () => clearInterval(interval);
  }, [dbReady]);

  async function inicializarApp() {
    try {
      await seedInitialDataIfNeeded();
      setDbReady(true);
      await verificarSetup();
      // Sync imediato ao abrir
      setTimeout(() => tentarSyncAutomatico(), 1000);
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
      const db = await openDB();
      const evts: any[] = await new Promise((resolve, reject) => {
        const tx = db.transaction('eventos', 'readonly');
        const req = tx.objectStore('eventos').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      setPendingSyncCount(evts.filter(e => e.statusSync === 'PENDENTE').length);
    } catch (err) {
      console.error("Erro ao carregar pendentes:", err);
    }
  }

  async function tentarSyncAutomatico() {
    if (syncing) return;
    setSyncing(true);
    try {
      const sincronizados = await sincronizarEventosPendentes();
      await atualizarContadorPendentes();
      if (sincronizados > 0) {
        setSyncToast(`${sincronizados} registro(s) sincronizado(s).`);
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch {
      // Falha silenciosa — tentará novamente no próximo ciclo
    } finally {
      setSyncing(false);
    }
  }

  async function handleSincronizarManual() {
    if (syncing) return;
    setSyncing(true);
    try {
      const sincronizados = await sincronizarEventosPendentes();
      await atualizarContadorPendentes();
      setSyncToast(sincronizados > 0
        ? `${sincronizados} registro(s) sincronizado(s).`
        : 'Nenhum registro pendente.');
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error("Erro na sincronização:", err);
      setSyncToast('Falha ao sincronizar. Verifique a conexão.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setSyncing(false);
    }
  }

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
        <p className="text-xs text-slate-500 mt-1">Carregando...</p>
      </div>
    );
  }

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

      <header id="global-kiosk-header" className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between gap-4 z-40 shadow-sm">

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

        <div className="flex items-center gap-2 sm:gap-4">
          {pendingSyncCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-[10px] tracking-tight uppercase">
                PENDENTE: {pendingSyncCount}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] tracking-tight uppercase">SINC OK</span>
            </div>
          )}

          <button
            onClick={handleSincronizarManual}
            disabled={syncing}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              syncing
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-wait'
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

      </header>

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
                onEventoRegistrado={() => tentarSyncAutomatico()}
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
                  await verificarSetup();
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
