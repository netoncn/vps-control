# VPS Docker Control - Backend

Backend Fastify para desenvolvimento local. Em produção, use as Serverless Functions na pasta `/api`.

## Quando usar

- **Desenvolvimento local** - Use este backend
- **Produção (Vercel)** - Use a pasta `/api` (Serverless Functions)

## Requisitos

- Node.js 18+
- Acesso SSH à VPS que será gerenciada

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Servidor
HOST=127.0.0.1
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Autenticação (opcional)
AUTH_ENABLED=false
AUTH_JWT_SECRET=seu-segredo
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=hash-bcrypt

# SSH da VPS gerenciada
VPS_HOST=ip.da.vps
VPS_PORT=22
VPS_USERNAME=seu-usuario
VPS_PRIVATE_KEY_PATH=C:\Users\SeuUser\.ssh\id_rsa
SSH_CONNECT_TIMEOUT_MS=15000
```

## Executar

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm start
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento (tsx) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa build de produção |
| `npm run typecheck` | Verifica tipos sem compilar |

## Estrutura

```
backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Carrega variáveis de ambiente
│   ├── middleware/
│   │   └── auth.ts        # Autenticação JWT
│   ├── routes/
│   │   ├── containers.ts  # /api/containers/*
│   │   ├── projects.ts    # /api/projects/*
│   │   ├── settings.ts    # /api/settings/*, /health
│   │   └── system.ts      # /api/system/*
│   ├── services/
│   │   ├── sshClient.ts   # Cliente SSH
│   │   ├── dockerService.ts # Comandos Docker
│   │   ├── projectStore.ts  # Persistência de projetos
│   │   └── systemService.ts # Info do sistema
│   └── types/
│       ├── index.ts       # Tipos compartilhados
│       └── fastify.d.ts   # Tipos Fastify/JWT
├── data/                  # Dados persistidos (git ignored)
├── dist/                  # Build de produção
├── .env.example           # Exemplo de configuração
└── .env.local             # Configuração local (git ignored)
```

## Diferenças do Serverless

| Feature | Backend Local | Serverless (Vercel) |
|---------|---------------|---------------------|
| Streaming de logs | SSE (tempo real) | Polling (manual) |
| Projetos manuais | Persistidos em JSON | Não disponível |
| Cold start | Não | Sim |
| Timeout | Configurável | 30 segundos |

## Habilitar Autenticação

### 1. Gerar hash da senha

```bash
node -e "require('bcryptjs').hash('sua-senha', 10).then(console.log)"
```

### 2. Configurar `.env.local`

```env
AUTH_ENABLED=true
AUTH_JWT_SECRET=gere-um-segredo-forte
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2a$10$...resultado-do-comando...
```

## API Endpoints

Todos os endpoints requerem autenticação se `AUTH_ENABLED=true`.

### Containers

- `GET /api/containers` - Listar containers
- `GET /api/containers/stats` - Stats de todos
- `GET /api/containers/:id/inspect` - Inspecionar
- `GET /api/containers/:id/stats` - Stats individual
- `GET /api/containers/:id/logs` - Buscar logs
- `GET /api/containers/:id/logs/stream` - Stream de logs (SSE)
- `POST /api/containers/:id/start` - Iniciar
- `POST /api/containers/:id/stop` - Parar
- `POST /api/containers/:id/restart` - Reiniciar
- `POST /api/containers/:id/resources` - Alterar limites

### Projetos

- `GET /api/projects` - Listar projetos
- `POST /api/projects` - Criar projeto manual
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Remover projeto
- `POST /api/projects/:id/start` - Iniciar todos
- `POST /api/projects/:id/stop` - Parar todos
- `POST /api/projects/:id/restart` - Reiniciar todos

### Sistema

- `GET /api/system/overview` - CPU, memória, disco
- `GET /api/settings/test` - Testar conexão SSH
- `GET /health` - Health check

### Autenticação

- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/verify` - Verificar token
