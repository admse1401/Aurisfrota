# Auris Frota — Backend

API REST para o sistema de registro de jornada de motoristas.
Uma plataforma do ecossistema Auris.

## Pré-requisitos

- Node.js 18+
- PostgreSQL (Supabase)

## Setup

```bash
cd backend
npm install
```

Copie o `.env.example` para `.env` e preencha as credenciais do Supabase:

```bash
cp .env.example .env
```

No painel do Supabase (Project Settings → Database → Connection string):
- **DATABASE_URL** → Session pooler (porta 6543), adicione `?pgbouncer=true` no final
- **DIRECT_URL** → Direct connection (porta 5432)

## Migrations

```bash
npx prisma migrate dev
```

## Rodar

```bash
npm run start:dev
```

A API sobe na porta **3333** por padrão.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /motoristas | Criar motorista |
| GET | /motoristas | Listar ativos |
| GET | /motoristas/:matricula | Buscar por matrícula |
| POST | /veiculos | Criar veículo |
| GET | /veiculos | Listar ativos |
| POST | /eventos/sync | Sincronizar lote (idempotente) |
| GET | /eventos | Listar eventos (filtros opcionais) |

Exemplos de request no arquivo `requests.http`.
