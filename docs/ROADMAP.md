# Roadmap - Deploy na Vercel

Este documento lista as etapas para fazer deploy do VPS Docker Panel na Vercel.

---

## Status do Projeto

| Item | Status |
|------|--------|
| Frontend (Vite + React) | Pronto |
| API Routes (Serverless) | Pronto |
| Autenticação JWT | Pronto |
| Configuração Vercel | Pronto |

---

## Estrutura do Projeto

```
vps/
├── api/                    # Serverless Functions (Vercel)
│   ├── _lib/              # Código compartilhado
│   │   ├── auth.ts        # Autenticação JWT
│   │   ├── config.ts      # Configuração
│   │   ├── docker.ts      # Comandos Docker
│   │   ├── projects.ts    # Lógica de projetos
│   │   ├── ssh.ts         # Cliente SSH
│   │   └── system.ts      # Info do sistema
│   ├── auth/              # Rotas de auth
│   ├── containers/        # Rotas de containers
│   ├── projects/          # Rotas de projetos
│   ├── settings/          # Rotas de settings
│   ├── system/            # Rotas de sistema
│   └── health.ts          # Health check
├── frontend/              # Frontend React + Vite
├── backend/               # Backend original (não usado na Vercel)
├── vercel.json            # Configuração Vercel
└── package.json           # Dependências das API routes
```

---

## Limitações do Serverless

1. **Streaming de logs não funciona** - Convertido para polling (buscar logs manualmente)
2. **Timeout de 30s** - Comandos SSH devem ser rápidos
3. **Cold starts** - Primeira requisição pode demorar mais
4. **Projetos manuais removidos** - Apenas agrupamento automático por docker-compose

---

## Como Fazer Deploy

### Passo 1: Configurar variáveis de ambiente na Vercel

No painel da Vercel (Settings > Environment Variables), adicionar:

```
# Obrigatórias
VPS_HOST=ip.da.sua.vps
VPS_PORT=22
VPS_USERNAME=seu-usuario
VPS_PRIVATE_KEY=base64-da-chave-privada

# Opcional (autenticação)
AUTH_ENABLED=true
AUTH_JWT_SECRET=seu-segredo-jwt-forte
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2a$10$...hash...

# Opcional
SSH_CONNECT_TIMEOUT_MS=15000
```

### Passo 2: Preparar a chave SSH

A chave privada deve ser convertida para base64:

```bash
# Linux/Mac
cat ~/.ssh/id_rsa | base64 -w 0

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.ssh\id_rsa"))
```

### Passo 3: Conectar repositório à Vercel

1. Acesse vercel.com e faça login
2. Clique em "Add New Project"
3. Importe o repositório Git
4. A Vercel detectará automaticamente o `vercel.json`
5. Adicione as variáveis de ambiente
6. Clique em "Deploy"

### Passo 4: (Opcional) Habilitar autenticação

```bash
# Gerar hash da senha
node -e "require('bcryptjs').hash('sua-senha', 10).then(console.log)"

# Gerar segredo JWT
openssl rand -base64 32
```

Adicionar na Vercel:
- `AUTH_ENABLED=true`
- `AUTH_JWT_SECRET=resultado-do-openssl`
- `AUTH_USERNAME=admin`
- `AUTH_PASSWORD_HASH=resultado-do-node`

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/containers | Listar containers |
| GET | /api/containers/stats | Stats de todos containers |
| POST | /api/containers/:id/start | Iniciar container |
| POST | /api/containers/:id/stop | Parar container |
| POST | /api/containers/:id/restart | Reiniciar container |
| GET | /api/containers/:id/logs | Buscar logs |
| GET | /api/containers/:id/inspect | Inspecionar container |
| GET | /api/containers/:id/stats | Stats do container |
| POST | /api/containers/:id/resources | Alterar limites |
| GET | /api/projects | Listar projetos |
| POST | /api/projects/:id/start | Iniciar projeto |
| POST | /api/projects/:id/stop | Parar projeto |
| POST | /api/projects/:id/restart | Reiniciar projeto |
| GET | /api/system/overview | Info do sistema |
| GET | /api/settings/test | Testar conexão SSH |
| POST | /api/auth/login | Login |
| GET | /api/auth/verify | Verificar token |
| GET | /health | Health check |

---

## Checklist Final

- [ ] Repositório conectado à Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Chave SSH em base64 adicionada
- [ ] Deploy realizado com sucesso
- [ ] Frontend acessível
- [ ] Conexão SSH funcionando (/api/settings/test)
- [ ] Autenticação habilitada (se desejado)

---

## Troubleshooting

### Erro de conexão SSH

1. Verifique se `VPS_PRIVATE_KEY` está em base64 correto
2. Verifique se a chave pública está no `~/.ssh/authorized_keys` da VPS
3. Verifique se `VPS_HOST`, `VPS_PORT` e `VPS_USERNAME` estão corretos

### Timeout nas requisições

1. Aumente `SSH_CONNECT_TIMEOUT_MS` se necessário
2. Verifique se a VPS está acessível
3. Comandos Docker muito lentos podem causar timeout (limite de 30s)

### Erro 401 Unauthorized

1. Verifique se `AUTH_ENABLED=true` está configurado
2. Verifique se o hash da senha está correto
3. Token JWT pode ter expirado (válido por 24h)
