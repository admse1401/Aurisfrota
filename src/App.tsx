/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { seedInitialDataIfNeeded } from './db';
import DriverPage from './pages/DriverPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedInitialDataIfNeeded()
      .then(() => setReady(true))
      .catch(err => console.error("Erro ao inicializar:", err));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<DriverPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
