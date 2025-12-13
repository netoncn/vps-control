import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Space,
  Spin,
  Alert,
  Typography,
  Flex,
  Popconfirm,
  Segmented,
} from 'antd';
import {
  FileTextOutlined,
  SaveOutlined,
  RocketOutlined,
  ReloadOutlined,
  SettingOutlined,
  TableOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { EnvEditor } from './EnvEditor';

const { Text, Paragraph } = Typography;

type ComposeFile = {
  name: string;
  path: string;
  type: 'env' | 'compose' | 'other';
};

type ProjectFilesEditorProps = {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  fetchJson: <T>(url: string, init?: RequestInit) => Promise<T>;
  onSuccess: (msg: string) => void;
  onError: (msg: string, desc: string) => void;
};

export function ProjectFilesEditor({
  open,
  projectId,
  projectName,
  onClose,
  fetchJson,
  onSuccess,
  onError,
}: ProjectFilesEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [files, setFiles] = useState<ComposeFile[]>([]);
  const [projectPath, setProjectPath] = useState<string>('');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'structured' | 'raw'>('structured');

  const hasChanges = fileContent !== originalContent;

  // Carregar lista de arquivos quando abrir
  useEffect(() => {
    if (open && projectId) {
      loadFiles();
    } else {
      // Reset state quando fechar
      setFiles([]);
      setActiveFile(null);
      setFileContent('');
      setOriginalContent('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ projectPath: string; files: ComposeFile[] }>(
        `/api/projects/${projectId}/files`
      );
      setFiles(data.files);
      setProjectPath(data.projectPath);
      if (data.files.length > 0) {
        // Preferir .env se existir
        const envFile = data.files.find((f) => f.name === '.env');
        const firstFile = envFile || data.files[0];
        setActiveFile(firstFile.path);
        await loadFileContent(firstFile.path);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setLoading(true);
    try {
      const data = await fetchJson<{ content: string }>(
        `/api/projects/${projectId}/file?filePath=${encodeURIComponent(filePath)}`
      );
      setFileContent(data.content);
      setOriginalContent(data.content);
    } catch (err: any) {
      onError('Erro ao ler arquivo', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (key: string) => {
    if (hasChanges) {
      // Confirmar antes de mudar se tiver alterações
      if (!confirm('Você tem alterações não salvas. Deseja descartar?')) {
        return;
      }
    }
    setActiveFile(key);
    await loadFileContent(key);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
      await fetchJson(`/api/projects/${projectId}/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeFile, content: fileContent }),
      });
      setOriginalContent(fileContent);
      onSuccess('Arquivo salvo com sucesso');
    } catch (err: any) {
      onError('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async (redeploy: boolean = false) => {
    setDeploying(true);
    try {
      const body = redeploy ? { action: 'redeploy' } : {};
      const data = await fetchJson<{ success: boolean; output: string }>(
        `/api/projects/${projectId}/deploy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      onSuccess(redeploy ? 'Redeploy concluído' : 'Deploy concluído');
      console.log('Deploy output:', data.output);
    } catch (err: any) {
      onError('Erro no deploy', err.message);
    } finally {
      setDeploying(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'env':
        return <SettingOutlined />;
      case 'compose':
        return <FileTextOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // Agrupar arquivos: raiz primeiro, depois por subdiretório
  const sortedFiles = [...files].sort((a, b) => {
    const aHasSlash = a.name.includes('/');
    const bHasSlash = b.name.includes('/');
    if (!aHasSlash && bHasSlash) return -1;
    if (aHasSlash && !bHasSlash) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Flex align="center" gap={8}>
          <FileTextOutlined />
          <span>Arquivos do Projeto: {projectName}</span>
        </Flex>
      }
      width={1000}
      footer={
        <Flex justify="space-between">
          <Space>
            <Popconfirm
              title="Deploy"
              description="Executar docker-compose up -d?"
              onConfirm={() => handleDeploy(false)}
              okText="Sim"
              cancelText="Não"
            >
              <Button icon={<RocketOutlined />} loading={deploying}>
                Deploy
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Redeploy"
              description="Executar pull + recreate containers?"
              onConfirm={() => handleDeploy(true)}
              okText="Sim"
              cancelText="Não"
            >
              <Button icon={<ReloadOutlined />} loading={deploying}>
                Redeploy
              </Button>
            </Popconfirm>
          </Space>
          <Space>
            <Button onClick={onClose}>Fechar</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Salvar
            </Button>
          </Space>
        </Flex>
      }
    >
      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {projectPath && (
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Caminho: <code>{projectPath}</code>
        </Paragraph>
      )}

      {loading && files.length === 0 ? (
        <Flex justify="center" style={{ padding: 40 }}>
          <Spin />
        </Flex>
      ) : files.length === 0 ? (
        <Alert
          type="warning"
          message="Nenhum arquivo encontrado"
          description="Não foi possível encontrar arquivos .env ou docker-compose no diretório do projeto."
        />
      ) : (
        <Tabs
          activeKey={activeFile || undefined}
          onChange={handleTabChange}
          type="card"
          tabPosition="left"
          style={{ minHeight: 450 }}
          items={sortedFiles.map((file) => {
            const isSubdir = file.name.includes('/');
            const displayName = isSubdir ? file.name : `(raiz) ${file.name}`;

            return {
              key: file.path,
              label: (
                <Flex align="center" gap={6} style={{ minWidth: 160 }}>
                  {getFileIcon(file.type)}
                  <span style={{ fontSize: 13 }}>{displayName}</span>
                </Flex>
              ),
            children: (
              <div style={{ position: 'relative' }}>
                {loading && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    <Spin />
                  </div>
                )}

                {/* Mode toggle for env files */}
                {file.type === 'env' && (
                  <Flex justify="flex-end" style={{ marginBottom: 12 }}>
                    <Segmented
                      size="small"
                      value={editMode}
                      onChange={(value) => setEditMode(value as 'structured' | 'raw')}
                      options={[
                        { label: 'Estruturado', value: 'structured', icon: <TableOutlined /> },
                        { label: 'Texto', value: 'raw', icon: <CodeOutlined /> },
                      ]}
                    />
                  </Flex>
                )}

                {/* Structured env editor */}
                {file.type === 'env' && editMode === 'structured' ? (
                  <EnvEditor
                    content={fileContent}
                    onChange={setFileContent}
                  />
                ) : (
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: 400,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      padding: 12,
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                    }}
                    spellCheck={false}
                  />
                )}

                {hasChanges && (
                  <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
                    * Alteracoes nao salvas
                  </Text>
                )}
              </div>
            ),
            };
          })}
        />
      )}
    </Modal>
  );
}
