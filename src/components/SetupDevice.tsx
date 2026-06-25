/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bus, Settings, Plus, Check, Info } from 'lucide-react';
import { getVeiculos, saveVeiculo, setDeviceSetup } from '../db';
import { Veiculo } from '../types';

interface SetupDeviceProps {
  onSetupComplete: () => void;
}

export default function SetupDevice({ onSetupComplete }: SetupDeviceProps) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  
  // Form para cadastrar veículo na hora caso necessário
  const [showAddForm, setShowAddForm] = useState(false);
  const [novaFrota, setNovaFrota] = useState('');
  const [novaPlaca, setNovaPlaca] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    carregarVeiculos();
  }, []);

  async function carregarVeiculos() {
    try {
      const list = await getVeiculos();
      setVeiculos(list);
      if (list.length > 0) {
        setSelectedVeiculoId(list[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar veículos para setup:", err);
    }
  }

  async function handleSalvarNovoVeiculo(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    const frotaTrimmed = novaFrota.trim().toUpperCase();
    const placaTrimmed = novaPlaca.trim().toUpperCase();

    if (!frotaTrimmed || !placaTrimmed) {
      setErrorMessage('Preencha todos os campos do veículo.');
      return;
    }

    // Verificar placa ou frota duplicada
    if (veiculos.some(v => v.frota === frotaTrimmed || v.placa === placaTrimmed)) {
      setErrorMessage('Já existe um veículo com esta frota ou placa.');
      return;
    }

    const novo: Veiculo = {
      id: crypto.randomUUID(),
      frota: frotaTrimmed,
      placa: placaTrimmed
    };

    try {
      await saveVeiculo(novo); // Salva na API
      await carregarVeiculos(); // Recarrega a lista completa da API
      setNovaFrota('');
      setNovaPlaca('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar o veículo.');
    }
  }

  async function handleConfirmarSetup() {
    if (!selectedVeiculoId) {
      setErrorMessage('Selecione um veículo para vincular ao quiosque.');
      return;
    }

    try {
      await setDeviceSetup(selectedVeiculoId);
      onSetupComplete();
    } catch (err) {
      setErrorMessage('Erro ao configurar o dispositivo.');
    }
  }

  return (
    <div id="setup-device-container" className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8 overflow-hidden"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 bg-blue-50 text-blue-700 rounded-full mb-4 border border-blue-100">
            <Bus className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2 font-display">Auris Frota</h1>
          <p className="text-slate-400 text-xs mb-2">uma plataforma do ecossistema Auris</p>
          <p className="text-slate-500 max-w-sm text-sm">
            Setup Inicial do Quiosque. Vincule este tablet a um veículo da frota de transporte coletivo.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3">
            <span className="font-semibold">Atenção:</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {!showAddForm ? (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Selecione o Veículo / Prefixo da Frota:
              </label>
              {veiculos.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                  Nenhum veículo cadastrado ainda. Cadastre um abaixo.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-56 overflow-y-auto pr-1">
                  {veiculos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVeiculoId(v.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                        selectedVeiculoId === v.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bus className={`w-5 h-5 ${selectedVeiculoId === v.id ? 'text-blue-700' : 'text-slate-400'}`} />
                        <div>
                          <p className="text-sm font-semibold">Frota: {v.frota}</p>
                          <p className="text-xs font-mono text-slate-400">Placa: {v.placa}</p>
                        </div>
                      </div>
                      {selectedVeiculoId === v.id && (
                        <div className="p-1 bg-blue-700 text-white rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Novo Veículo
                </button>
              </div>
            </div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSalvarNovoVeiculo}
              className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4"
            >
              <h3 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-wider text-[10px]">Cadastrar Novo Veículo</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Prefixo/Frota</label>
                  <input
                    type="text"
                    value={novaFrota}
                    onChange={(e) => setNovaFrota(e.target.value)}
                    placeholder="Ex: F-350"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Placa do Veículo</label>
                  <input
                    type="text"
                    value={novaPlaca}
                    onChange={(e) => setNovaPlaca(e.target.value)}
                    placeholder="Ex: BRA2E19"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 uppercase font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded transition-colors"
                >
                  Salvar Veículo
                </button>
              </div>
            </motion.form>
          )}

          {!showAddForm && (
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleConfirmarSetup}
                disabled={!selectedVeiculoId}
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Vincular Quiosque a este Veículo
              </button>

              <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>O vínculo é permanente. Modificação somente via Painel Admin.</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
