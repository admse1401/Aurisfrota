import React, { useState, useEffect } from 'react';
import { CloudLightning, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { openDB, sincronizarEventosPendentes } from '../db';
import AdminPanel from '../components/AdminPanel';

export default function AdminPage() {
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    atualizarPendentes();
    const interval = setInterval(atualizarPendentes, 5000);
    return () => clearInterval(interval);
  }, []);

  async function atualizarPendentes() {
    try {
      const db = await openDB();
      const evts: any[] = await new Promise((resolve, reject) => {
        const tx = db.transaction('eventos', 'readonly');
        const req = tx.objectStore('eventos').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      setPendingSyncCount(evts.filter(e => e.statusSync === 'PENDENTE').length);
    } catch {}
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const n = await sincronizarEventosPendentes();
      await atualizarPendentes();
      setSyncToast(n > 0 ? `${n} registro(s) sincronizado(s).` : 'Tudo sincronizado.');
      setTimeout(() => setSyncToast(null), 3000);
    } catch {
      setSyncToast('Falha ao sincronizar.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] text-slate-900 font-sans">
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold italic text-sm">Af</div>
          <span className="text-sm font-bold text-slate-800">Auris Frota — Painel Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 && (
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {pendingSyncCount} pendente(s)
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border bg-slate-800 hover:bg-slate-700 text-white border-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200"
          >
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudLightning className="w-3.5 h-3.5" />}
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
            className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2 flex items-center gap-2 font-semibold justify-center"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {syncToast}
          </motion.div>
        )}
      </AnimatePresence>

      <AdminPanel onBack={() => window.location.href = '/'} />
    </div>
  );
}
