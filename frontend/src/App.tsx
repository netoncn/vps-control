import { useEffect, useState } from 'react';
import {
  App as AntdApp,
  Layout,
  Row,
  Col,
  Card,
  Empty,
  Spin,
  Tabs,
  Button,
  Alert,
  Typography,
  Flex,
  Space,
} from 'antd';
import { SettingOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ThemeProvider } from './theme/ThemeContext';
import { AppHeader } from './components/AppHeader';
import { StatsPanel } from './components/StatsPanel';
import { ProjectCard } from './components/ProjectCard';
import { LogsDrawer } from './components/LogsDrawer';
import { InspectDrawer } from './components/InspectDrawer';
import { ProjectFilesEditor } from './components/ProjectFilesEditor';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';
import './App.css';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const API_URL = import.meta.env.VITE_API_URL || '';

type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports?: string;
  composeProject?: string;
};

type Project = {
  id: string;
  name: string;
  containerIds: string[];
  source: 'auto' | 'manual';
  composeProject?: string;
};

type ProjectWithContainers = {
  project: Project;
  containers: ContainerInfo[];
};

type ProjectsResponse = {
  manualProjects: ProjectWithContainers[];
  autoProjects: ProjectWithContainers[];
};

type ContainerInspect = {
  env: Array<{ key: string; value: string }>;
  limits: { cpus?: string; memory?: string };
};

type ContainerStats = {
  id: string;
  name: string;
  cpuPercent?: number;
  memUsageBytes?: number;
  memLimitBytes?: number;
  memPercent?: number;
};

type SystemOverview = {
  cores: number;
  load: number[];
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usedPercent: number;
  };
  disk: Array<{
    fs: string;
    sizeBytes: number;
    usedBytes: number;
    availBytes: number;
    usedPercent: number;
    target: string;
  }>;
};

function createFetchJson(token: string | null) {
  return async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const fullUrl = url.startsWith('/api') ? `${API_URL}${url}` : url;
    const res = await fetch(fullUrl, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  };
}

function Dashboard() {
  const { token, authRequired, checking, isAuthenticated, login, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectsResponse>({ manualProjects: [], autoProjects: [] });
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemOverview | null>(null);
  const [statsAll, setStatsAll] = useState<ContainerStats[]>([]);
  const [loading, setLoading] = useState(false);

  // Drawers
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [logsContainerId, setLogsContainerId] = useState<string | null>(null);
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState(false);
  const [inspectContainer, setInspectContainer] = useState<ContainerInfo | null>(null);
  const [inspectData, setInspectData] = useState<ContainerInspect | null>(null);
  const [inspectStats, setInspectStats] = useState<ContainerStats | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Files Editor
  const [filesEditorProject, setFilesEditorProject] = useState<{ id: string; name: string } | null>(null);

  // Settings test
  const [settingsStatus, setSettingsStatus] = useState<string>('');

  const { message, notification } = AntdApp.useApp();
  const fetchJson = createFetchJson(token);

  const refresh = async () => {
    setLoading(true);
    try {
      const [projRes, containersRes, sysRes, statsRes] = await Promise.all([
        fetchJson<ProjectsResponse>('/api/projects'),
        fetchJson<{ containers: ContainerInfo[] }>('/api/containers'),
        fetchJson<SystemOverview>('/api/system/overview'),
        fetchJson<ContainerStats[]>('/api/containers/stats'),
      ]);
      setProjects(projRes);
      setContainers(containersRes.containers);
      setSystemInfo(sysRes);
      setStatsAll(statsRes);
    } catch (err: any) {
      notification.error({ message: 'Erro ao atualizar', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !checking) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, checking]);

  const handleProjectAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await fetchJson(`/api/projects/${id}/${action}`, { method: 'POST' });
      message.success(`Projeto ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'}`);
      await refresh();
    } catch (err: any) {
      notification.error({ message: `Erro ao ${action}`, description: err.message });
    }
  };

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await fetchJson(`/api/containers/${id}/${action}`, { method: 'POST' });
      message.success(`Container ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'}`);
      await refresh();
    } catch (err: any) {
      notification.error({ message: `Erro ao ${action}`, description: err.message });
    }
  };

  const handleViewLogs = (containerId: string) => {
    setLogsContainerId(containerId);
    setLogsDrawerOpen(true);
  };

  const handleFetchLogs = async (containerId: string, lines: string): Promise<string> => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/api/containers/${containerId}/logs?lines=${lines}`, { headers });
    return res.text();
  };

  const handleInspect = async (container: ContainerInfo) => {
    setInspectContainer(container);
    setInspectDrawerOpen(true);
    setInspectLoading(true);
    try {
      const [data, stat] = await Promise.all([
        fetchJson<ContainerInspect>(`/api/containers/${container.id}/inspect`),
        fetchJson<ContainerStats>(`/api/containers/${container.id}/stats`),
      ]);
      setInspectData(data);
      setInspectStats(stat);
    } catch (err: any) {
      notification.error({ message: 'Erro ao inspecionar', description: err.message });
    } finally {
      setInspectLoading(false);
    }
  };

  const handleUpdateResources = async (cpus?: string, memory?: string) => {
    if (!inspectContainer) return;
    try {
      await fetchJson(`/api/containers/${inspectContainer.id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpus, memory }),
      });
      message.success('Recursos atualizados');
      await handleInspect(inspectContainer);
    } catch (err: any) {
      notification.error({ message: 'Erro ao atualizar recursos', description: err.message });
      throw err;
    }
  };

  const testConnection = async () => {
    try {
      const res = await fetchJson<{ ok: boolean; output: string }>('/api/settings/test');
      setSettingsStatus(res.output);
      message.success(res.output);
    } catch (err: any) {
      notification.error({ message: 'Erro SSH', description: err.message });
      setSettingsStatus(err.message);
    }
  };

  // Loading state
  if (checking) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Login required
  if (authRequired && !isAuthenticated) {
    return <Login onLogin={login} />;
  }

  const allProjects = [...projects.autoProjects, ...projects.manualProjects];
  const runningContainers = containers.filter((c) => c.state === 'running').length;
  const stoppedContainers = containers.filter((c) => c.state !== 'running').length;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        authRequired={authRequired || false}
        loading={loading}
        onRefresh={refresh}
        onLogout={logout}
        onOpenLogs={() => setLogsDrawerOpen(true)}
      />

      <Content style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Stats Panel */}
          <StatsPanel
            runningContainers={runningContainers}
            stoppedContainers={stoppedContainers}
            projectsCount={allProjects.length}
            systemInfo={systemInfo}
          />

          {/* Main Content Tabs */}
          <Card styles={{ body: { padding: 0 } }}>
            <Tabs
              defaultActiveKey="projects"
              style={{ padding: '0 16px' }}
              items={[
                {
                  key: 'projects',
                  label: (
                    <Flex align="center" gap={8}>
                      <AppstoreOutlined />
                      Projetos
                    </Flex>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {loading && allProjects.length === 0 ? (
                        <Flex justify="center" style={{ padding: 48 }}>
                          <Spin size="large" />
                        </Flex>
                      ) : allProjects.length === 0 ? (
                        <Empty description="Nenhum projeto encontrado" />
                      ) : (
                        <Row gutter={[16, 16]}>
                          {allProjects.map((p) => (
                            <Col xs={24} lg={12} key={p.project.id}>
                              <ProjectCard
                                projectData={p}
                                stats={statsAll}
                                loading={loading}
                                onStartProject={() => handleProjectAction(p.project.id, 'start')}
                                onStopProject={() => handleProjectAction(p.project.id, 'stop')}
                                onRestartProject={() => handleProjectAction(p.project.id, 'restart')}
                                onStartContainer={(id) => handleContainerAction(id, 'start')}
                                onStopContainer={(id) => handleContainerAction(id, 'stop')}
                                onRestartContainer={(id) => handleContainerAction(id, 'restart')}
                                onViewLogs={handleViewLogs}
                                onInspect={handleInspect}
                                onEditFiles={() => setFilesEditorProject({ id: p.project.id, name: p.project.name })}
                              />
                            </Col>
                          ))}
                        </Row>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'settings',
                  label: (
                    <Flex align="center" gap={8}>
                      <SettingOutlined />
                      Configurações
                    </Flex>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <Card size="small">
                        <Title level={5}>Conexão VPS</Title>
                        <Paragraph type="secondary">
                          Configure as variáveis de ambiente no Vercel: VPS_HOST, VPS_PORT,
                          VPS_USERNAME, VPS_PRIVATE_KEY ou VPS_PASSWORD.
                        </Paragraph>
                        <Space>
                          <Button icon={<SettingOutlined />} onClick={testConnection}>
                            Testar Conexão SSH
                          </Button>
                        </Space>
                        {settingsStatus && (
                          <Alert
                            message={settingsStatus}
                            type={settingsStatus.includes('Erro') ? 'error' : 'success'}
                            style={{ marginTop: 16 }}
                          />
                        )}
                      </Card>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Space>
      </Content>

      {/* Drawers */}
      <LogsDrawer
        open={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        containers={containers}
        selectedContainerId={logsContainerId}
        onSelectContainer={setLogsContainerId}
        fetchLogs={handleFetchLogs}
      />

      <InspectDrawer
        open={inspectDrawerOpen}
        onClose={() => {
          setInspectDrawerOpen(false);
          setInspectContainer(null);
          setInspectData(null);
          setInspectStats(null);
        }}
        container={inspectContainer}
        inspectData={inspectData}
        stats={inspectStats}
        loading={inspectLoading}
        onUpdateResources={handleUpdateResources}
      />

      <ProjectFilesEditor
        open={!!filesEditorProject}
        projectId={filesEditorProject?.id || ''}
        projectName={filesEditorProject?.name || ''}
        onClose={() => setFilesEditorProject(null)}
        fetchJson={fetchJson}
        onSuccess={(msg) => message.success(msg)}
        onError={(msg, desc) => notification.error({ message: msg, description: desc })}
      />
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <Dashboard />
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
