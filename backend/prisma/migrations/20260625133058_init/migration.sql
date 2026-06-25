-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "EventoTipo" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "EventoOrigem" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "matriculaSnapshot" TEXT NOT NULL,
    "nomeSnapshot" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "prefixoSnapshot" TEXT NOT NULL,
    "placaSnapshot" TEXT NOT NULL,
    "tipo" "EventoTipo" NOT NULL,
    "dataHoraDispositivo" TIMESTAMP(3) NOT NULL,
    "dataHoraServidor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" "EventoOrigem" NOT NULL,
    "removido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "valorAntigo" JSONB,
    "valorNovo" JSONB,
    "justificativa" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_matricula_key" ON "motoristas"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_prefixo_key" ON "veiculos"("prefixo");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
