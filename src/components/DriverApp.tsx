/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, UserCheck, Bus, LogOut, ArrowRight, Delete, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import { loginMotorista, getProximoEventoTipo, registrarEventoMotorista } from '../db';
import { Motorista, Veiculo, EventoTipo } from '../types';

interface DriverAppProps {
  veiculoVinculado: Veiculo;
  onAdminToggle: () => void;
}

export default function DriverApp({ veiculoVinculado, onAdminToggle }: DriverAppProps) {
  // Estados de identificação
  const [matricula, setMatricula] = useState('');
  const [pin, setPin] = useState('');
  const [focusedField, setFocusedField] = useState<'matricula' | 'pin'>('matricula');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Motorista ativo
  const [motoristaAtivo, setMotoristaAtivo] = useState<Motorista | null>(null);
  const [proximoTipo, setProximoTipo] = useState<EventoTipo>('ENTRADA');

  // Relógio em tempo real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Confirmação de registro
  const [registroConfirmado, setRegistroConfirmado] = useState<{
    tipo: EventoTipo;
    hora: string;
    nome: string;
  } | null>(null);

  // Temporizador para auto-logout após sucesso
  const autoLogoutTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Atualiza relógio
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Teclado virtual numérico
  function handleKeyPress(num: string) {
    setErrorMsg('');
    if (focusedField === 'matricula') {
      if (matricula.length < 8) {
        setMatricula(prev => prev + num);
      }
    } else {
      if (pin.length < 6) {
        setPin(prev => prev + num);
      }
    }
  }

  function handleBackspace() {
    setErrorMsg('');
    if (focusedField === 'matricula') {
      setMatricula(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  }

  function handleClear() {
    setErrorMsg('');
    if (focusedField === 'matricula') {
      setMatricula('');
    } else {
      setPin('');
    }
  }

  async function handleAcessar() {
    if (!matricula) {
      setErrorMsg('Digite a sua matrícula.');
      return;
    }
    if (!pin) {
      setErrorMsg('Digite seu PIN de 4 dígitos.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const mot = await loginMotorista(matricula, pin);
      if (!mot) {
        setErrorMsg('Matrícula ou PIN incorretos. Tente novamente.');
        setIsVerifying(false);
        return;
      }

      const tipo = await getProximoEventoTipo(mot.id);
      setProximoTipo(tipo);
      setMotoristaAtivo(mot);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Erro ao autenticar motorista. Verifique a conexão.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleRegistrarPonto() {
    if (!motoristaAtivo) return;

    try {
      const registrado = await registrarEventoMotorista(
        motoristaAtivo,
        veiculoVinculado,
        proximoTipo
      );

      // Exibir confirmação enorme e bonita
      setRegistroConfirmado({
        tipo: registrado.tipo,
        hora: registrado.hora,
        nome: registrado.nomeMotorista
      });

      // Limpar campos
      setMatricula('');
      setPin('');
      setFocusedField('matricula');

      // Auto-logout em 4 segundos para o próximo motorista usar
      if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
      autoLogoutTimer.current = setTimeout(() => {
        handleVoltarInicio();
      }, 4000);

    } catch (err) {
      setErrorMsg('Falha ao gravar o evento de ponto no IndexedDB.');
    }
  }

  function handleVoltarInicio() {
    if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
    setRegistroConfirmado(null);
    setMotoristaAtivo(null);
    setMatricula('');
    setPin('');
    setFocusedField('matricula');
    setErrorMsg('');
  }

  return (
    <div id="driver-app-layout" className="flex-1 flex flex-col md:flex-row bg-[#f5f5f5] text-slate-900 overflow-hidden">
      {/* Esquerda: Identificação / Detalhes de Registro */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 border-r border-slate-200 bg-white">
        
        {/* Topo do Tablet */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-slate-800 tracking-tight font-display">
              Auris Frota Quiosque
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 gap-1.5">
              <Bus className="w-3 h-3 text-blue-700" />
              Veículo: <strong className="text-slate-900 font-extrabold">{veiculoVinculado.frota}</strong> ({veiculoVinculado.placa})
            </span>
          </div>
          
          <button
            onClick={onAdminToggle}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors"
          >
            Acesso Admin
          </button>
        </div>

        {/* Centro de Ação */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">
            
            {registroConfirmado ? (
              // TELA DE SUCESSO DO REGISTRO (RN001 e RN002)
              <motion.div
                key="success-screen"
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
                  <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
                    {registroConfirmado.tipo} Registrado!
                  </h2>
                  <p className="text-xl font-black text-emerald-700 font-mono">
                    às {registroConfirmado.hora}
                  </p>
                </div>

                <div className="py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm">
                  Motorista: <span className="text-slate-900 font-extrabold">{registroConfirmado.nome}</span>
                </div>

                <button
                  onClick={handleVoltarInicio}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors"
                >
                  Liberar para Próximo Motorista
                </button>
                <p className="text-xs text-slate-400">
                  Retornando à tela inicial automaticamente...
                </p>
              </motion.div>

            ) : !motoristaAtivo ? (
              // FORMULÁRIO DE LOGIN COM VISUAL PINPAD
              <motion.div
                key="login-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-md mx-auto space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
                    Registro de Jornada
                  </h2>
                  <p className="text-sm text-slate-500">
                    Identifique-se com matrícula e PIN para registrar seu ponto.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Matrícula Input */}
                  <div 
                    onClick={() => setFocusedField('matricula')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      focusedField === 'matricula' 
                        ? 'border-blue-700 bg-blue-50/50 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Matrícula (Ex: 1010)
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest min-h-8">
                        {matricula || <span className="text-slate-300 font-normal text-lg font-sans tracking-normal">Toque para digitar</span>}
                      </span>
                      {focusedField === 'matricula' && <span className="w-1.5 h-6 bg-blue-600 animate-pulse rounded-full"></span>}
                    </div>
                  </div>

                  {/* PIN Input */}
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
                    className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-bold text-base rounded transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isVerifying ? 'Verificando...' : 'Acessar Meu Painel'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>

            ) : (
              // TELA DO MOTORISTA ATIVO (BOTAO GIGANTE DO DESIGN)
              <motion.div
                key="driver-kiosk"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl mx-auto space-y-8 text-center"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Motorista Identificado
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 font-display">
                    {motoristaAtivo.nome}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Matrícula: <strong className="text-slate-800 font-mono">{motoristaAtivo.matricula}</strong> • Veículo: <strong className="text-slate-800">{veiculoVinculado.frota}</strong>
                  </p>
                </div>

                {/* BOTÃO GIGANTE DE REGISTRO EXATAMENTE IGUAL AO DO DESIGN HTML */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleRegistrarPonto}
                    className={`group relative w-80 h-80 flex flex-col items-center justify-center rounded-full transition-all active:scale-95 border-[12px] border-white ${
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
                    }`}>
                      Próximo Passo
                    </span>
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
                      ? 'Inicie seu turno. O sistema capturará a data e hora corretas do tablet automaticamente.' 
                      : 'Encerre seu turno de jornada neste veículo. Registro em log imediato.'}
                  </p>
                </div>

                <div className="pt-4 flex justify-center gap-4">
                  <button
                    onClick={handleVoltarInicio}
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded font-bold text-xs transition-colors flex items-center gap-2 uppercase tracking-wider"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Trocar Motorista
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rodapé: Mostra Veículo e Hora com Alta Visibilidade */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-slate-500 font-semibold text-sm">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' — '}
              <strong className="text-slate-800 text-base font-bold ml-1 font-mono">{currentTime.toLocaleTimeString('pt-BR')}</strong>
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Modo Offline-first</span>
          </div>
        </div>

      </div>

      {/* Direita: Teclado PINPAD para Kiosk (Apenas visível se NÃO logado e NÃO confirmado) */}
      {!motoristaAtivo && !registroConfirmado && (
        <div className="w-full md:w-[400px] bg-slate-50 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200 shadow-inner">
          <div className="max-w-xs mx-auto w-full space-y-6">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest justify-center">
              <Grid className="w-4 h-4 text-blue-700" />
              Teclado do Quiosque
            </div>

            {/* Grid 3x4 do Pinpad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-16 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-2xl font-bold text-slate-800 transition-all shadow-sm border border-slate-200 active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}

              {/* Linha final */}
              <button
                type="button"
                onClick={handleClear}
                className="h-16 rounded-xl bg-white hover:bg-red-50 hover:text-red-600 text-xs font-bold text-slate-500 transition-all flex items-center justify-center border border-slate-200"
              >
                LIMPAR
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-16 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-2xl font-bold text-slate-800 transition-all shadow-sm border border-slate-200 active:scale-95 flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-16 rounded-xl bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-500 transition-all flex items-center justify-center border border-slate-200"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            {/* Botões rápidos de navegação */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFocusedField('matricula')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  focusedField === 'matricula'
                    ? 'border-blue-600 text-blue-700 bg-blue-50 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-white shadow-sm'
                }`}
              >
                Foco: Matrícula
              </button>
              <button
                type="button"
                onClick={() => setFocusedField('pin')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  focusedField === 'pin'
                    ? 'border-blue-600 text-blue-700 bg-blue-50 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-white shadow-sm'
                }`}
              >
                Foco: PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
