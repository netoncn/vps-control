import { execSSH } from './ssh';

export type ComposeFile = {
  name: string;
  path: string;
  type: 'env' | 'compose' | 'other';
};

export type ProjectFiles = {
  projectPath: string;
  files: ComposeFile[];
};

/**
 * Encontra o diretório do projeto docker-compose pelo nome
 */
export async function findComposeProjectPath(projectName: string): Promise<string | null> {
  // Buscar containers com o label do projeto
  const { stdout } = await execSSH(
    `docker ps -a --filter "label=com.docker.compose.project=${projectName}" --format "{{.ID}}" | head -1`
  );

  const containerId = stdout.trim();
  if (!containerId) return null;

  // Pegar o diretório de trabalho do compose
  const { stdout: inspectOut } = await execSSH(
    `docker inspect ${containerId} --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'`
  );

  return inspectOut.trim() || null;
}

/**
 * Lista arquivos relevantes de um projeto compose
 * Busca docker-compose na raiz e extrai env_file dos serviços
 */
export async function listProjectFiles(projectPath: string): Promise<ComposeFile[]> {
  const files: ComposeFile[] = [];
  const addedPaths = new Set<string>();

  // Arquivos compose na raiz
  const composeFiles = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml',
  ];

  let composeFilePath: string | null = null;

  // Encontrar e adicionar o arquivo compose
  for (const fileName of composeFiles) {
    const fullPath = `${projectPath}/${fileName}`;
    const { code } = await execSSH(`test -f "${fullPath}" && echo "exists"`);
    if (code === 0) {
      files.push({
        name: fileName,
        path: fullPath,
        type: 'compose',
      });
      addedPaths.add(fullPath);
      composeFilePath = fullPath;
      break;
    }
  }

  // Extrair env_file do docker-compose.yml
  if (composeFilePath) {
    const { stdout: composeContent } = await execSSH(`cat "${composeFilePath}"`);

    // Regex para encontrar env_file (suporta lista ou string única)
    const envFileMatches = composeContent.match(/env_file:\s*\n(\s+-\s*.+\n?)+|env_file:\s*.+/g);

    if (envFileMatches) {
      for (const match of envFileMatches) {
        // Extrair os caminhos dos arquivos
        const paths = match
          .replace('env_file:', '')
          .split('\n')
          .map(line => line.replace(/^\s*-?\s*/, '').trim())
          .filter(line => line && !line.startsWith('#'));

        for (const envPath of paths) {
          // Resolver caminho relativo
          const fullEnvPath = envPath.startsWith('/')
            ? envPath
            : `${projectPath}/${envPath}`;

          if (addedPaths.has(fullEnvPath)) continue;

          const { code } = await execSSH(`test -f "${fullEnvPath}" && echo "exists"`);
          if (code === 0) {
            files.push({
              name: envPath,
              path: fullEnvPath,
              type: 'env',
            });
            addedPaths.add(fullEnvPath);
          }
        }
      }
    }
  }

  // Também buscar .env na raiz se existir
  const rootEnvFiles = ['.env', '.env.local', '.env.production'];
  for (const envFile of rootEnvFiles) {
    const fullPath = `${projectPath}/${envFile}`;
    if (addedPaths.has(fullPath)) continue;

    const { code } = await execSSH(`test -f "${fullPath}" && echo "exists"`);
    if (code === 0) {
      files.push({
        name: envFile,
        path: fullPath,
        type: 'env',
      });
      addedPaths.add(fullPath);
    }
  }

  return files;
}

/**
 * Lê o conteúdo de um arquivo
 */
export async function readProjectFile(filePath: string): Promise<string> {
  // Validar path
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path');
  }

  const { stdout, stderr, code } = await execSSH(`cat "${filePath}"`);
  if (code !== 0) {
    throw new Error(stderr || 'Failed to read file');
  }
  return stdout;
}

/**
 * Valida se o path é seguro (sem path traversal)
 */
function isPathSafe(filePath: string): boolean {
  // Bloquear path traversal
  if (filePath.includes('..') || filePath.includes('//')) {
    return false;
  }
  // Deve começar com /
  if (!filePath.startsWith('/')) {
    return false;
  }
  return true;
}

/**
 * Salva conteúdo em um arquivo
 */
export async function writeProjectFile(filePath: string, content: string): Promise<void> {
  // Validar path
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path');
  }

  // Usar heredoc com delimitador único para evitar problemas de escape
  const delimiter = 'EOF_' + Date.now();
  const { stderr, code } = await execSSH(`cat > "${filePath}" << '${delimiter}'\n${content}\n${delimiter}`);

  if (code !== 0) {
    throw new Error(stderr || 'Failed to write file');
  }
}

/**
 * Detecta o comando do docker compose (V1 ou V2)
 */
async function getComposeCommand(): Promise<string> {
  // Tentar docker compose (V2) primeiro
  const { code } = await execSSH('docker compose version 2>/dev/null');
  if (code === 0) {
    return 'docker compose';
  }
  // Fallback para docker-compose (V1)
  return 'docker-compose';
}

/**
 * Faz deploy do projeto (docker compose up -d)
 */
export async function deployProject(projectPath: string): Promise<string> {
  const composeCmd = await getComposeCommand();
  const { stdout, stderr, code } = await execSSH(
    `cd "${projectPath}" && ${composeCmd} up -d 2>&1`
  );

  if (code !== 0 && !stdout.includes('up-to-date') && !stdout.includes('Started') && !stdout.includes('Running')) {
    throw new Error(stderr || stdout || 'Deploy failed');
  }

  return stdout || 'Deploy completed';
}

/**
 * Faz pull das imagens e recria os containers
 */
export async function redeployProject(projectPath: string): Promise<string> {
  const composeCmd = await getComposeCommand();
  const { stdout, stderr, code } = await execSSH(
    `cd "${projectPath}" && ${composeCmd} pull && ${composeCmd} up -d --force-recreate 2>&1`
  );

  if (code !== 0) {
    throw new Error(stderr || stdout || 'Redeploy failed');
  }

  return stdout || 'Redeploy completed';
}

export type ServiceConfig = {
  serviceName: string;
  image: string;
  host: string;
  port: number;
  cpus: string;
  memory: string;
  envVars: Array<{ key: string; value: string }>;
};

export type CreateProjectConfig = {
  projectName: string;
  services: ServiceConfig[];
};

/**
 * Gera o conteúdo do docker-compose.yml
 */
function generateDockerCompose(config: CreateProjectConfig): string {
  const services: Record<string, any> = {};

  for (const service of config.services) {
    const containerName = service.serviceName.replace(/-/g, '_');

    services[service.serviceName] = {
      container_name: containerName,
      image: service.image,
      env_file: [`./${service.serviceName}/.env.production`],
      networks: ['infra_network'],
      restart: 'unless-stopped',
      cpus: service.cpus,
      mem_limit: service.memory,
      labels: [
        'traefik.enable=true',
        `traefik.http.routers.${service.serviceName}.rule=Host(\`${service.host}\`)`,
        `traefik.http.routers.${service.serviceName}.entrypoints=websecure`,
        `traefik.http.routers.${service.serviceName}.tls.certresolver=le`,
        `traefik.http.routers.${service.serviceName}.service=${service.serviceName}`,
        `traefik.http.services.${service.serviceName}.loadbalancer.server.port=${service.port}`,
      ],
    };
  }

  // Build YAML manually to match the expected format
  let yaml = 'version: "3.9"\n\n';
  yaml += 'networks:\n';
  yaml += '  infra_network:\n';
  yaml += '    external: true  # usa a mesma rede da infra\n\n';
  yaml += 'services:\n';

  for (const service of config.services) {
    const containerName = service.serviceName.replace(/-/g, '_');
    yaml += `  ${service.serviceName}:\n`;
    yaml += `    container_name: ${containerName}\n`;
    yaml += `    image: ${service.image}\n`;
    yaml += `    env_file:\n`;
    yaml += `      - ./${service.serviceName}/.env.production\n`;
    yaml += `    networks:\n`;
    yaml += `      - infra_network\n`;
    yaml += `    restart: unless-stopped\n`;
    yaml += `    cpus: "${service.cpus}"\n`;
    yaml += `    mem_limit: "${service.memory}"\n`;
    yaml += `    labels:\n`;
    yaml += `      - "traefik.enable=true"\n`;
    yaml += `      - "traefik.http.routers.${service.serviceName}.rule=Host(\`${service.host}\`)"\n`;
    yaml += `      - "traefik.http.routers.${service.serviceName}.entrypoints=websecure"\n`;
    yaml += `      - "traefik.http.routers.${service.serviceName}.tls.certresolver=le"\n`;
    yaml += `      - "traefik.http.routers.${service.serviceName}.service=${service.serviceName}"\n`;
    yaml += `      - "traefik.http.services.${service.serviceName}.loadbalancer.server.port=${service.port}"\n`;
  }

  return yaml;
}

/**
 * Gera o conteúdo do arquivo .env.production
 */
function generateEnvFile(envVars: Array<{ key: string; value: string }>): string {
  return envVars
    .filter((e) => e.key.trim() !== '')
    .map((e) => `${e.key}=${e.value}`)
    .join('\n');
}

/**
 * Cria um novo projeto Docker com a estrutura completa
 */
export async function createProject(config: CreateProjectConfig): Promise<string> {
  const projectPath = `/srv/${config.projectName}`;

  // Verificar se o projeto já existe
  const { code: existsCode } = await execSSH(`test -d "${projectPath}" && echo "exists"`);
  if (existsCode === 0) {
    throw new Error(`Projeto "${config.projectName}" já existe em /srv`);
  }

  // Criar pasta do projeto
  const { code: mkdirCode, stderr: mkdirErr } = await execSSH(`mkdir -p "${projectPath}"`);
  if (mkdirCode !== 0) {
    throw new Error(`Falha ao criar pasta do projeto: ${mkdirErr}`);
  }

  // Criar pastas para cada serviço
  for (const service of config.services) {
    const servicePath = `${projectPath}/${service.serviceName}`;
    const { code, stderr } = await execSSH(`mkdir -p "${servicePath}"`);
    if (code !== 0) {
      throw new Error(`Falha ao criar pasta do serviço ${service.serviceName}: ${stderr}`);
    }

    // Criar arquivo .env.production
    const envContent = generateEnvFile(service.envVars);
    const envPath = `${servicePath}/.env.production`;
    await writeProjectFile(envPath, envContent);
  }

  // Criar docker-compose.yml
  const composeContent = generateDockerCompose(config);
  const composePath = `${projectPath}/docker-compose.yml`;
  await writeProjectFile(composePath, composeContent);

  return projectPath;
}
