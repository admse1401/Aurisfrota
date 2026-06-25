/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, Bus, LogOut, ArrowRight, Delete, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import { loginMotorista, getVeiculos, getProximoEventoTipo, registrarEventoMotorista } from '../db';
import { Motorista, Veiculo, EventoTipo } from '../types';

interface DriverAppProps {
  onEventoRegistrado?: () => void;
}

type Step = 'login' | 'veiculo' | 'registro' | 'confirmacao';

export default function DriverApp({ onEventoRegistrado }: DriverAppProps) {
  // Login
  const [matricula, setMatricula] = useState('');
  const [pin, setPin] = useState('');
  const [focusedField, setFocusedField] = useState<'matricula' | 'pin'>('matricula');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Estado do fluxo
  const [step, setStep] = useState<Step>('login');
  const [motoristaAtivo, setMotoristaAtivo] = useState<Motorista | null>(null);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [proximoTipo, setProximoTipo] = useState<EventoTipo>('ENTRADA');

  // Relógio
  const [currentTime, setCurrentTime] = useState(new Date());

  // Confirmação
  const [registroConfirmado, setRegistroConfirmado] = useState<{
    tipo: EventoTipo; hora: string; nome: string; veiculo: string;
  } | null>(null);

  const autoLogoutTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Teclado numérico
  function handleKeyPress(num: string) {
    setErrorMsg('');
    if (focusedField === 'matricula' && matricula.length < 8) {
      setMatricula(prev => prev + num);
    } else if (focusedField === 'pin' && pin.length < 6) {
      setPin(prev => prev + num);
    }
  }

  function handleBackspace() {
    setErrorMsg('');
    if (focusedField === 'matricula') setMatricula(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  }

  function handleClear() {
    setErrorMsg('');
    if (focusedField === 'matricula') setMatricula('');
    else setPin('');
  }

  async function handleAcessar() {
    if (!matricula) { setErrorMsg('Digite a sua matrícula.'); return; }
    if (!pin) { setErrorMsg('Digite seu PIN.'); return; }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const mot = await loginMotorista(matricula, pin);
      if (!mot) {
        setErrorMsg('Matrícula ou PIN incorretos.');
        setIsVerifying(false);
        return;
      }

      setMotoristaAtivo(mot);

      // Carrega veículos e próximo tipo
      const veis = await getVeiculos();
      setVeiculos(veis);

      const tipo = await getProximoEventoTipo(mot.id);
      setProximoTipo(tipo);

      setStep('veiculo');
    } catch {
      setErrorMsg('Erro ao autenticar. Verifique a conexão.');
    } finally {
      setIsVerifying(false);
    }
  }

  function handleSelecionarVeiculo(v: Veiculo) {
    setVeiculoSelecionado(v);
    setStep('registro');
  }

  async function handleRegistrarPonto() {
    if (!motoristaAtivo || !veiculoSelecionado) return;

    try {
      const registrado = await registrarEventoMotorista(
        motoristaAtivo,
        veiculoSelecionado,
        proximoTipo
      );

      setRegistroConfirmado({
        tipo: registrado.tipo,
        hora: registrado.hora,
        nome: registrado.nomeMotorista,
        veiculo: `${veiculoSelecionado.frota} (${veiculoSelecionado.placa})`
      });
      setStep('confirmacao');

      onEventoRegistrado?.();

      if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
      autoLogoutTimer.current = setTimeout(() => handleVoltarInicio(), 5000);
    } catch {
      setErrorMsg('Falha ao gravar o evento.');
    }
  }

  function handleVoltarInicio() {
    if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
    setStep('login');
    setMotoristaAtivo(null);
    setVeiculoSelecionado(null);
    setRegistroConfirmado(null);
    setMatricula('');
    setPin('');
    setFocusedField('matricula');
    setErrorMsg('');
  }

  return (
    <div id="driver-app-layout" className="flex-1 flex flex-col md:flex-row bg-[#f5f5f5] text-slate-900 overflow-hidden">

      {/* Lado esquerdo: conteúdo principal */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 bg-white border-r border-slate-200">

        {/* Topo */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-slate-800 tracking-tight">
            Auris Frota Quiosque
          </span>
          {motoristaAtivo && step !== 'confirmacao' && (
            <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold">
              {motoristaAtivo.nome} — Mat. {motoristaAtivo.matricula}
            </span>
          )}
        </div>

        {/* Centro */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">

            {/* TELA DE CONFIRMAÇÃO */}
            {step === 'confirmacao' && registroConfirmado && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-md"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-10 animate-pulse"></div>
                  <CheckCircle className="relative w-24 h-24 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Registro Concluído
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
                    {registroConfirmado.tipo} Registrado!
                  </h2>
                  <p className="text-xl font-black text-emerald-700 font-mono">
                    às {registroConfirmado.hora}
                  </p>
                </div>
                <div className="py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm space-y-1">
                  <div>Motorista: <span className="text-slate-900 font-extrabold">{registroConfirmado.nome}</span></div>
                  <div>Veículo: <span className="text-blue-700 font-extrabold">{registroConfirmado.veiculo}</span></div>
                </div>
                <button
                  onClick={handleVoltarInicio}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors"
                >
                  Liberar para Próximo Motorista
                </button>
                <p className="text-xs text-slate-400">Retornando automaticamente...</p>
              </motion.div>
            )}

            {/* TELA DE LOGIN */}
            {step === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-md mx-auto space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Registro de Jornada
                  </h2>
                  <p className="text-sm text-slate-500">
                    Identifique-se com matrícula e PIN.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div
                    onClick={() => setFocusedField('matricula')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      focusedField === 'matricula'
                        ? 'border-blue-700 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Matrícula
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest min-h-8">
                        {matricula || <span className="text-slate-300 font-normal text-lg font-sans tracking-normal">Toque para digitar</span>}
                      </span>
                      {focusedField === 'matricula' && <span className="w-1.5 h-6 bg-blue-600 animate-pulse rounded-full"></span>}
                    </div>
                  </div>

                  <div
                    onClick={() => setFocusedField('pin')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      focusedField === 'pin'
                        ? 'border-blue-700 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      PIN de Segurança
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest min-h-8">
                        {pin ? '•'.repeat(pin.length) : <span className="text-slate-300 font-normal text-lg font-sans tracking-normal">Senha</span>}
                      </span>
                      {focusedField === 'pin' && <span className="w-1.5 h-6 bg-blue-600 animate-pulse rounded-full"></span>}
                    </div>
                  </div>

                  <button
                    onClick={handleAcessar}
                    disabled={isVerifying || !matricula || !pin}
                    className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-base rounded transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isVerifying ? 'Verificando...' : 'Acessar'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* TELA DE SELEÇÃO DE VEÍCULO */}
            {step === 'veiculo' && (
              <motion.div
                key="veiculo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-md mx-auto space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Selecione o Veículo
                  </h2>
                  <p className="text-sm text-slate-500">
                    Em qual ônibus você vai trabalhar hoje?
                  </p>
                </div>

                {veiculos.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
                    Nenhum veículo cadastrado. Peça ao administrador.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                    {veiculos.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleSelecionarVeiculo(v)}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-600 hover:bg-blue-50 transition-all text-left active:scale-[0.98]"
                      >
                        <Bus className="w-6 h-6 text-blue-700 flex-shrink-0" />
                        <div>
                          <p className="text-base font-bold text-slate-900">{v.frota}</p>
                          <p className="text-xs font-mono text-slate-500">Placa: {v.placa}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleVoltarInicio}
                  className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Voltar ao Login
                </button>
              </motion.div>
            )}

            {/* TELA DE REGISTRO (botão gigante) */}
            {step === 'registro' && motoristaAtivo && veiculoSelecionado && (
              <motion.div
                key="registro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl mx-auto space-y-8 text-center"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Motorista Identificado
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
                    {motoristaAtivo.nome}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Matrícula: <strong className="text-slate-800 font-mono">{motoristaAtivo.matricula}</strong>
                    {' • '}Veículo: <strong className="text-blue-700">{veiculoSelecionado.frota}</strong> ({veiculoSelecionado.placa})
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={handleRegistrarPonto}
                    className={`group relative w-72 h-72 md:w-80 md:h-80 flex flex-col items-center justify-center rounded-full transition-all active:scale-95 border-[12px] border-white ${
                      proximoTipo === 'ENTRADA'
                        ? 'bg-emerald-600 shadow-[0_20px_50px_rgba(16,185,129,0.35)] hover:bg-emerald-700'
                        : 'bg-red-600 shadow-[0_20px_50px_rgba(220,38,38,0.35)] hover:bg-red-700'
                    }`}
                  >
                    <div className={`absolute inset-0 rounded-full border-4 opacity-25 scale-110 ${
                      proximoTipo === 'ENTRADA' ? 'border-emerald-400' : 'border-red-400'
                    }`}></div>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.3em] mb-2 ${
                      proximoTipo === 'ENTRADA' ? 'text-emerald-200' : 'text-red-200'
                    }`}>Próximo Passo</span>
                    <span className="text-5xl font-black text-white tracking-tight">
                      {proximoTipo}
                    </span>
                    <span className="mt-4 text-xs font-mono text-white/80 uppercase tracking-widest font-bold">
                      {currentTime.toLocaleTimeString('pt-BR')}
                    </span>
                    <span className="mt-1 text-[10px] font-medium text-white/60 uppercase tracking-widest">
                      Toque para registrar
                    </span>
                  </button>

                  <p className="text-slate-500 text-sm mt-8 max-w-sm">
                    {proximoTipo === 'ENTRADA'
                      ? 'Inicie seu turno. Data e hora capturadas automaticamente.'
                      : 'Encerre seu turno de jornada neste veículo.'}
                  </p>
                </div>

                <div className="pt-4 flex justify-center gap-4">
                  <button
                    onClick={() => setStep('veiculo')}
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    <Bus className="w-4 h-4 text-blue-600" />
                    Trocar Veículo
                  </button>
                  <button
                    onClick={handleVoltarInicio}
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Trocar Motorista
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-slate-500 font-semibold text-sm">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' — '}
              <strong className="text-slate-800 text-base font-bold ml-1 font-mono">{currentTime.toLocaleTimeString('pt-BR')}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Lado direito: teclado PINPAD (só na tela de login) */}
      {step === 'login' && (
        <div className="w-full md:w-[400px] bg-slate-50 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200 shadow-inner">
          <div className="max-w-xs mx-auto w-full space-y-6">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest justify-center">
              <Grid className="w-4 h-4 text-blue-700" />
              Teclado do Quiosque
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-16 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-2xl font-bold text-slate-800 transition-all shadow-sm border border-slate-200 active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button type="button" onClick={handleClear}
                className="h-16 rounded-xl bg-white hover:bg-red-50 hover:text-red-600 text-xs font-bold text-slate-500 transition-all flex items-center justify-center border border-slate-200">
                LIMPAR
              </button>
              <button type="button" onClick={() => handleKeyPress('0')}
                className="h-16 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-2xl font-bold text-slate-800 transition-all shadow-sm border border-slate-200 active:scale-95 flex items-center justify-center">
                0
              </button>
              <button type="button" onClick={handleBackspace}
                className="h-16 rounded-xl bg-white hover:bg-slate-100 text-slate-500 transition-all flex items-center justify-center border border-slate-200">
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setFocusedField('matricula')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  focusedField === 'matricula' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-500 bg-white'
                }`}>
                Matrícula
              </button>
              <button type="button" onClick={() => setFocusedField('pin')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  focusedField === 'pin' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-500 bg-white'
                }`}>
                PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
