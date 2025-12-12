# VPS Docker Control Panel

Painel web para gerenciar containers Docker em uma VPS remota via SSH.

## Features

- Listar e monitorar containers Docker
- Start/Stop/Restart containers individuais ou por projeto
- Visualizar logs dos containers
- Monitorar uso de CPU e memória
- Agrupamento automático por docker-compose
- Editar arquivos de projeto (.env, docker-compose.yml)
- Deploy/Redeploy de projetos Docker Compose
- Visualizar informações do sistema (CPU, memória, disco)
- Autenticação JWT (opcional)

## Stack

- **Frontend**: React + Vite + Ant Design
- **Backend**: Vercel Serverless Functions
- **Conexão**: SSH (ssh2)

## Estrutura do Projeto

Este repositório contém **dois projetos Vercel separados**:

```
vps/
├── api/                    # BACKEND (Serverless Functions)
│   ├── _lib/               # Código compartilhado (não vira endpoint)
│   │   ├── auth.ts         # Autenticação JWT + CORS
│   │   ├── compose.ts      # Gerenciamento de arquivos Docker Compose
│   │   ├── config.ts       # Configuração
│   │   ├── docker.ts       # Comandos Docker
│   │   ├── projects.ts     # Lógica de projetos
│   │   ├── ssh.ts          # Cliente SSH
│   │   └── system.ts       # Info do sistema
│   ├── auth/               # Rotas de autenticação
│   ├── containers/         # Rotas de containers
│   ├── projects/           # Rotas de projetos
│   ├── settings/           # Rotas de configuração
│   ├── system/             # Rotas do sistema
│   └── health.ts           # Health check
├── frontend/               # FRONTEND (React + Vite)
├── backend/                # Backend Fastify (dev local)
├── vercel.json             # Config Vercel do backend
├── package.json            # Dependências do backend
└── tsconfig.json           # TypeScript do backend
```

---

## Deploy na Vercel

### Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Repositório no GitHub/GitLab/Bitbucket
- Acesso SSH à VPS que será gerenciada

### Passo 1: Subir código para o GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/vps-docker-control.git
git push -u origin main
```

### Passo 2: Preparar a chave SSH

A chave privada SSH deve ser convertida para base64:

```powershell
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.ssh\id_rsa"))
```

```bash
# Linux/Mac
cat ~/.ssh/id_rsa | base64 -w 0
```

Copie o resultado para usar nas variáveis de ambiente.

### Passo 3: Deploy do Backend (API)

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Selecione o repositório
4. Configure:
   - **Project Name**: `vps-api` (ou outro nome)
   - **Root Directory**: deixe **vazio**
   - **Framework Preset**: Other
5. Adicione as **Environment Variables**:

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `VPS_HOST` | IP ou hostname da VPS | Sim |
| `VPS_PORT` | Porta SSH (padrão: 22) | Não |
| `VPS_USERNAME` | Usuário SSH | Sim |
| `VPS_PRIVATE_KEY` | Chave privada em base64 | Sim |
| `VPS_PASSWORD` | Senha SSH (alternativa à chave) | Não |
| `SSH_CONNECT_TIMEOUT_MS` | Timeout em ms (padrão: 15000) | Não |
| `CORS_ORIGIN` | URL do frontend (use `*` inicialmente) | Sim |

6. Clique em **"Deploy"**
7. Anote a URL gerada (ex: `https://vps-api.vercel.app`)

### Passo 4: Deploy do Frontend

1. Na Vercel, clique em **"Add New Project"** novamente
2. Selecione o **mesmo repositório**
3. Configure:
   - **Project Name**: `vps-panel` (ou outro nome)
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (detecta automaticamente)
4. Adicione a **Environment Variable**:

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `VITE_API_URL` | URL do backend (ex: `https://vps-api.vercel.app`) | Sim |

5. Clique em **"Deploy"**
6. Anote a URL gerada (ex: `https://vps-panel.vercel.app`)

### Passo 5: Atualizar CORS no Backend

1. Vá no projeto do **backend** na Vercel
2. Settings → Environment Variables
3. Edite `CORS_ORIGIN` para a URL do frontend: `https://vps-panel.vercel.app`
4. Vá em Deployments → clique nos `...` → **Redeploy**

### Resumo do Deploy

| Projeto | Root Directory | Variáveis Principais |
|---------|----------------|----------------------|
| Backend | *(vazio)* | `VPS_*`, `CORS_ORIGIN` |
| Frontend | `frontend` | `VITE_API_URL` |

---

## Habilitar Autenticação (Recomendado)

### Gerar hash da senha

```bash
node -e "require('bcryptjs').hash('sua-senha-segura', 10).then(console.log)"
```

### Gerar segredo JWT

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### Adicionar variáveis no Backend

| Variável | Valor |
|----------|-------|
| `AUTH_ENABLED` | `true` |
| `AUTH_JWT_SECRET` | resultado do comando acima |
| `AUTH_USERNAME` | `admin` (ou outro) |
| `AUTH_PASSWORD_HASH` | hash gerado com bcryptjs |

Depois, faça **Redeploy** do backend.

---

## Desenvolvimento Local

### Backend (Fastify)

```bash
cd backend
cp .env.example .env.local
# Editar .env.local com suas credenciais
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173

---

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/containers` | Listar containers |
| GET | `/api/containers/stats` | Stats de todos containers |
| POST | `/api/containers/:id/start` | Iniciar container |
| POST | `/api/containers/:id/stop` | Parar container |
| POST | `/api/containers/:id/restart` | Reiniciar container |
| GET | `/api/containers/:id/logs` | Buscar logs |
| GET | `/api/containers/:id/inspect` | Inspecionar container |
| GET | `/api/containers/:id/stats` | Stats do container |
| POST | `/api/containers/:id/resources` | Alterar limites CPU/mem |
| GET | `/api/projects` | Listar projetos |
| POST | `/api/projects/:id/start` | Iniciar todos do projeto |
| POST | `/api/projects/:id/stop` | Parar todos do projeto |
| POST | `/api/projects/:id/restart` | Reiniciar todos do projeto |
| GET | `/api/projects/:id/files` | Listar arquivos do projeto |
| GET | `/api/projects/:id/file?path=` | Ler conteúdo de arquivo |
| PUT | `/api/projects/:id/file` | Salvar conteúdo de arquivo |
| POST | `/api/projects/:id/deploy` | Deploy (docker-compose up) |
| GET | `/api/system/overview` | Info do sistema |
| GET | `/api/settings/test` | Testar conexão SSH |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/auth/verify` | Verificar token |
| GET | `/health` | Health check |

---

## Troubleshooting

### Erro de conexão SSH

1. Verifique se `VPS_PRIVATE_KEY` está em base64 correto
2. Verifique se a chave pública está no `~/.ssh/authorized_keys` da VPS
3. Verifique `VPS_HOST`, `VPS_PORT` e `VPS_USERNAME`
4. Teste a conexão: `ssh -i ~/.ssh/id_rsa usuario@ip-da-vps`

### Erro de CORS

1. Verifique se `CORS_ORIGIN` no backend contém a URL exata do frontend
2. Não inclua barra no final da URL
3. Faça Redeploy após alterar variáveis

### Timeout nas requisições

1. Aumente `SSH_CONNECT_TIMEOUT_MS` se necessário
2. Verifique se a VPS está acessível
3. Comandos Docker lentos podem causar timeout (limite de 30s no Vercel)

### Erro 401 Unauthorized

1. Verifique se `AUTH_ENABLED=true` está configurado
2. Verifique se o hash da senha está correto
3. Token JWT expira em 24 horas

---

## Limitações do Serverless

1. **Timeout de 30 segundos** - Comandos SSH devem ser rápidos
2. **Cold starts** - Primeira requisição pode demorar mais
3. **Sem streaming** - Logs são buscados por polling, não em tempo real
4. **Sem persistência** - Projetos manuais não são salvos

---

## Licença

MIT
