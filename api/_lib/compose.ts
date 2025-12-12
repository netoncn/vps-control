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
 */
export async function listProjectFiles(projectPath: string): Promise<ComposeFile[]> {
  const files: ComposeFile[] = [];

  // Verificar arquivos comuns
  const checkFiles = [
    { name: '.env', type: 'env' as const },
    { name: 'docker-compose.yml', type: 'compose' as const },
    { name: 'docker-compose.yaml', type: 'compose' as const },
    { name: 'compose.yml', type: 'compose' as const },
    { name: 'compose.yaml', type: 'compose' as const },
    { name: '.env.local', type: 'env' as const },
    { name: '.env.production', type: 'env' as const },
  ];

  for (const file of checkFiles) {
    const { code } = await execSSH(`test -f "${projectPath}/${file.name}" && echo "exists"`);
    if (code === 0) {
      files.push({
        name: file.name,
        path: `${projectPath}/${file.name}`,
        type: file.type,
      });
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
 * Faz deploy do projeto (docker-compose up -d)
 */
export async function deployProject(projectPath: string): Promise<string> {
  const { stdout, stderr, code } = await execSSH(
    `cd "${projectPath}" && docker-compose up -d 2>&1`
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
  const { stdout, stderr, code } = await execSSH(
    `cd "${projectPath}" && docker-compose pull && docker-compose up -d --force-recreate 2>&1`
  );

  if (code !== 0) {
    throw new Error(stderr || stdout || 'Redeploy failed');
  }

  return stdout || 'Redeploy completed';
}
