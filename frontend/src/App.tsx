import { useEffect, useState } from 'react';
import {
  App as AntdApp,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Flex,
  Layout,
  Modal,
  Progress,
  Row,
  Tabs,
  Spin,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  InputNumber,
  Input,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  SettingOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  PieChartOutlined,
  FireOutlined,
  LogoutOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import './App.css';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';
import { ProjectFilesEditor } from './components/ProjectFilesEditor';

const { Header, Content } = Layout;
const { Title, Text, Paragraph, Link } = Typography;

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

type ResourceModalState = {
  open: boolean;
  container?: ContainerInfo;
  cpus?: string;
  memory?: string;
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

const LINES_OPTIONS = ['100', '500', '1000'];
const API_URL = import.meta.env.VITE_API_URL || '';

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

function statusColor(state: string) {
  if (state === 'running') return 'green';
  if (state === 'exited') return 'default';
  return 'warning';
}

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

function formatGb(bytes?: number) {
  if (!bytes && bytes !== 0) return '-';
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function StatsRow({
  running,
  stopped,
  projectsCount,
}: {
  running: number;
  stopped: number;
  projectsCount: number;
}) {
  const total = running + stopped;
  const runningPercent = total ? Math.round((running / total) * 100) : 0;
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Statistic
            title="Running containers"
            value={running}
            prefix={<PlayCircleOutlined style={{ color: '#52c41a' }} />}
          />
          <Progress percent={runningPercent} size="small" showInfo={false} strokeColor="#52c41a" style={{ marginTop: 12 }} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Statistic
            title="Stopped containers"
            value={stopped}
            prefix={<PauseCircleOutlined style={{ color: '#d9d9d9' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Statistic
            title="Projects detected"
            value={projectsCount}
            prefix={<ContainerOutlined style={{ color: '#1890ff' }} />}
          />
          <Text type="secondary">Auto (labels) + manual groups</Text>
        </Card>
      </Col>
    </Row>
  );
}

function SystemOverviewCards({ system }: { system: SystemOverview | null }) {
  if (!system) {
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card className="glass-card" bordered={false}>
            <Spin /> <Text type="secondary">Carregando visão da VPS...</Text>
          </Card>
        </Col>
      </Row>
    );
  }

  const diskRoot = system.disk.find((d) => d.target === '/') || system.disk[0];
  const loadLabel = system.load.slice(0, 3).join(' ');
  const memPercent = system.memory.usedPercent;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Statistic title="CPU cores" value={system.cores} />
          <Text type="secondary">Load (1m/5m/15m): {loadLabel}</Text>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Statistic title="Memória (MB)" value={system.memory.usedMb} suffix={`/ ${system.memory.totalMb}`} />
          <Progress percent={memPercent} size="small" status={memPercent > 85 ? 'exception' : 'active'} />
          <Text type="secondary">{system.memory.freeMb} MB livres</Text>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="glass-card" bordered={false}>
          <Flex justify="space-between" align="center">
            <Statistic
              title="Disco principal"
              value={diskRoot ? diskRoot.usedBytes / 1024 ** 3 : 0}
              precision={1}
              suffix="GB usados"
            />
            <PieChartOutlined style={{ fontSize: 28, color: '#1677ff' }} />
          </Flex>
          {diskRoot && (
            <>
              <Progress
                percent={diskRoot.usedPercent}
                size="small"
                status={diskRoot.usedPercent > 90 ? 'exception' : 'active'}
              />
              <Text type="secondary">
                {diskRoot.fs} · {(diskRoot.availBytes / 1024 ** 3).toFixed(1)} GB livres · {diskRoot.target}
              </Text>
            </>
          )}
        </Card>
      </Col>
    </Row>
  );
}

function Dashboard({
  projects,
  onSelectProject,
  activeProjectId,
}: {
  projects: ProjectsResponse;
  onSelectProject: (p: ProjectWithContainers) => void;
  activeProjectId?: string;
}) {
  const allProjects = [...projects.autoProjects, ...projects.manualProjects];
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <Title level={3} style={{ margin: 0 }}>
          Projetos
        </Title>
        <Tag color="blue">Auto labels + manual</Tag>
      </Flex>
      <Row gutter={[16, 16]}>
        {allProjects.map((p) => {
          const running = p.containers.filter((c) => c.state === 'running').length;
          const percent = p.containers.length ? Math.round((running / p.containers.length) * 100) : 0;
          return (
            <Col xs={24} sm={12} lg={8} key={p.project.id}>
              <Card
                className={`project-card ${activeProjectId === p.project.id ? 'project-card-active' : ''}`}
                onClick={() => onSelectProject(p)}
                hoverable
                bordered={false}
              >
                <Flex justify="space-between" align="flex-start">
                  <div>
                    <Text strong>{p.project.name}</Text>
                    <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                      {p.project.composeProject ? `compose: ${p.project.composeProject}` : 'manual grouping'}
                    </Paragraph>
                  </div>
                  <Tag color={p.project.source === 'auto' ? 'blue' : 'purple'}>{p.project.source}</Tag>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text type="secondary">
                    {running}/{p.containers.length} running
                  </Text>
                  <Badge status={percent === 100 ? 'success' : percent === 0 ? 'default' : 'warning'} text={`${percent}%`} />
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
}

function ContainerCard({
  container,
  onStart,
  onStop,
  onRestart,
  onInspect,
  onSelectLogs,
  stats,
}: {
  container: ContainerInfo;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onInspect: () => void;
  onSelectLogs: () => void;
  stats?: ContainerStats;
}) {
  return (
    <Card className="container-card" bordered={false} hoverable>
      <Flex justify="space-between" align="flex-start">
        <div>
          <Text strong>{container.name}</Text>
          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
            {container.image}
          </Paragraph>
        </div>
        <Tag color={statusColor(container.state)}>{container.state}</Tag>
      </Flex>
      <Paragraph type="secondary" style={{ marginBottom: 4 }}>
        {container.status}
      </Paragraph>
      {container.ports && (
        <Tag color="blue" style={{ marginBottom: 8 }}>
          {container.ports}
        </Tag>
      )}
      {stats && (
        <Space size="small" style={{ marginBottom: 8 }}>
          <Tag color={stats.cpuPercent && stats.cpuPercent > 85 ? 'red' : 'blue'}>
            CPU {stats.cpuPercent?.toFixed(1) ?? '-'}%
          </Tag>
          <Tag color="cyan">
            MEM {formatBytes(stats.memUsageBytes)} / {formatBytes(stats.memLimitBytes)}
          </Tag>
        </Space>
      )}
      <Space wrap>
        <Button size="small" onClick={onStart}>
          Start
        </Button>
        <Button size="small" danger onClick={onStop}>
          Stop
        </Button>
        <Button size="small" type="primary" ghost onClick={onRestart}>
          Restart
        </Button>
        <Button size="small" onClick={onInspect}>
          Env & Limits
        </Button>
        <Button size="small" onClick={onSelectLogs}>
          Logs
        </Button>
      </Space>
    </Card>
  );
}

function App() {
  const { token, authRequired, checking, isAuthenticated, login, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectsResponse>({ manualProjects: [], autoProjects: [] });
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectWithContainers | undefined>(undefined);
  const [inspectData, setInspectData] = useState<ContainerInspect | null>(null);
  const [inspectContainer, setInspectContainer] = useState<ContainerInfo | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [logs, setLogs] = useState('');
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [lines, setLines] = useState<string>('100');
  const [resourceModal, setResourceModal] = useState<ResourceModalState>({ open: false });
  const [settingsStatus, setSettingsStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [logsTabKey, setLogsTabKey] = useState<string>('dashboard');
  const [filesEditorProject, setFilesEditorProject] = useState<{ id: string; name: string } | null>(null);
  const { message, notification } = AntdApp.useApp();
  const [systemInfo, setSystemInfo] = useState<SystemOverview | null>(null);
  const [statsAll, setStatsAll] = useState<ContainerStats[]>([]);

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
      if (activeProject) {
        const refreshed = [...projRes.autoProjects, ...projRes.manualProjects].find(
          (p) => p.project.id === activeProject.project.id,
        );
        setActiveProject(refreshed);
      }
    } catch (err: any) {
      notification.error({ message: 'Failed to refresh', description: err.message });
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
      message.success(`Project ${action} OK`);
      await refresh();
    } catch (err: any) {
      notification.error({ message: `Failed to ${action}`, description: err.message });
    }
  };

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await fetchJson(`/api/containers/${id}/${action}`, { method: 'POST' });
      message.success(`Container ${action} OK`);
      await refresh();
    } catch (err: any) {
      notification.error({ message: `Failed to ${action}`, description: err.message });
    }
  };

  const handleInspect = async (container: ContainerInfo) => {
    try {
      const data = await fetchJson<ContainerInspect>(`/api/containers/${container.id}/inspect`);
      setInspectContainer(container);
      setInspectData(data);
      const stat = await fetchJson<ContainerStats>(`/api/containers/${container.id}/stats`);
      setStats(stat);
    } catch (err: any) {
      notification.error({ message: 'Inspect failed', description: err.message });
    }
  };

  const handleLogsFetch = async (id: string, count: string) => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/api/containers/${id}/logs?lines=${count}`, { headers });
      const data = await res.text();
      setLogs(data);
      setLogsContainer(id);
      setLogsTabKey('logs');
    } catch (err: any) {
      notification.error({ message: 'Logs failed', description: err.message });
    }
  };

  const openResourceModal = (container: ContainerInfo, defaults?: { cpus?: string; memory?: string }) => {
    setResourceModal({ open: true, container, cpus: defaults?.cpus, memory: defaults?.memory });
  };

  const confirmResourceUpdate = async () => {
    if (!resourceModal.container) return;
    const { container, cpus, memory } = resourceModal;
    try {
      await fetchJson(`/api/containers/${container.id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpus, memory }),
      });
      message.success('Resource limits applied');
      setResourceModal({ open: false });
      await refresh();
    } catch (err: any) {
      notification.error({ message: 'Update failed', description: err.message });
    }
  };

  const resourceCommandPreview = () => {
    const { container, cpus, memory } = resourceModal;
    if (!container) return '';
    const flags = [];
    if (cpus) flags.push(`--cpus=${cpus}`);
    if (memory) flags.push(`--memory=${memory}`);
    return `docker update ${flags.join(' ')} ${container.name || container.id}`;
  };

  const testConnection = async () => {
    try {
      const res = await fetchJson<{ ok: boolean; output: string }>('/api/settings/test');
      setSettingsStatus(res.output);
      message.success(res.output);
    } catch (err: any) {
      notification.error({ message: 'SSH failed', description: err.message });
      setSettingsStatus(err.message);
    }
  };

  // Mostrar loading enquanto verifica auth
  if (checking) {
    return (
      <ConfigProvider
        theme={{ token: { colorPrimary: '#1677ff' } }}
      >
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
          <Spin size="large" />
        </div>
      </ConfigProvider>
    );
  }

  // Mostrar login se auth e necessario e nao esta autenticado
  if (authRequired && !isAuthenticated) {
    return (
      <ConfigProvider
        theme={{ token: { colorPrimary: '#1677ff', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 10 } }}
      >
        <Login onLogin={login} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: 10,
        },
      }}
    >
      <AntdApp>
        <Layout style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
          <Header className="header">
            <Flex align="center" justify="space-between" style={{ height: '100%' }}>
              <Space>
                {authRequired ? <Tag color="green">AUTHENTICATED</Tag> : <Tag color="blue">LOCAL ONLY</Tag>}
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  VPS Docker Control
                </Title>
              </Space>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
                  Atualizar
                </Button>
                {authRequired && (
                  <Button icon={<LogoutOutlined />} onClick={logout} danger>
                    Sair
                  </Button>
                )}
              </Space>
            </Flex>
          </Header>
          <Content style={{ padding: '16px 24px 40px' }}>
            <Card className="hero" bordered={false}>
              <Space direction="vertical" size={6}>
                <Tag icon={<ThunderboltOutlined />} color="green">
                  Live via SSH
                </Tag>
                <Title level={2} style={{ margin: 0 }}>
                  Controle e monitore seus projetos Docker no VPS
                </Title>
                <Paragraph type="secondary" style={{ maxWidth: 640 }}>
                  Agrupamento automático por docker-compose, grupos manuais, logs em tempo real, e ajustes de recursos — tudo via SSH seguro.
                </Paragraph>
              </Space>
              <Space>
                <Tag color="blue" icon={<ApiOutlined />}>
                  API local
                </Tag>
                <Tag color="gold" icon={<DatabaseOutlined />}>
                  Store local
                </Tag>
              </Space>
            </Card>

            <SystemOverviewCards system={systemInfo} />

            <StatsRow
              running={containers.filter((c) => c.state === 'running').length}
              stopped={containers.filter((c) => c.state !== 'running').length}
              projectsCount={projects.autoProjects.length + projects.manualProjects.length}
            />

            <Card bordered={false} className="glass-card">
              <Tabs
                activeKey={logsTabKey}
                onChange={setLogsTabKey}
                items={[
                  {
                    key: 'dashboard',
                    label: 'Dashboard',
                    children: (
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Dashboard
                          projects={projects}
                          activeProjectId={activeProject?.project.id}
                          onSelectProject={(p) => setActiveProject(p)}
                        />

                        <Card bordered={false} className="glass-card">
                          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                            <Title level={4} style={{ margin: 0 }}>
                              Uso por projeto
                            </Title>
                            <Tag icon={<FireOutlined />} color="red">
                              Gargalos
                            </Tag>
                          </Flex>
                          <Row gutter={[12, 12]}>
                            {[...projects.autoProjects, ...projects.manualProjects].map((p) => {
                              const projectStats = p.containers.map((c) => statsAll.find((s) => s.id === c.id)).filter(Boolean) as ContainerStats[];
                              const cpu = projectStats.reduce((sum, s) => sum + (s.cpuPercent || 0), 0);
                              const mem = projectStats.reduce((sum, s) => sum + (s.memUsageBytes || 0), 0);
                              return (
                                <Col xs={24} md={12} lg={8} key={p.project.id}>
                                  <Card size="small" hoverable>
                                    <Text strong>{p.project.name}</Text>
                                    <Paragraph type="secondary" style={{ marginBottom: 6 }}>
                                      CPU {cpu.toFixed(1)}% · Mem {formatGb(mem)}
                                    </Paragraph>
                                    <Progress percent={Math.min(cpu, 100)} size="small" status={cpu > 85 ? 'exception' : 'active'} />
                                    <Progress
                                      percent={
                                        p.containers.length && systemInfo
                                          ? Math.min(
                                              (mem / ((systemInfo.memory.totalMb || 1) * 1024 * 1024)) * 100,
                                              100,
                                            )
                                          : 0
                                      }
                                      size="small"
                                      strokeColor="#13c2c2"
                                      trailColor="#f0f0f0"
                                    />
                                  </Card>
                                </Col>
                              );
                            })}
                          </Row>
                        </Card>

                              {activeProject && (
                              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Flex justify="space-between" align="center">
                                  <Title level={4} style={{ margin: 0 }}>
                                    {activeProject.project.name}
                                  </Title>
                              <Space>
                                <Button size="small" onClick={() => handleProjectAction(activeProject.project.id, 'start')}>
                                  Start all
                                </Button>
                                <Button size="small" danger onClick={() => handleProjectAction(activeProject.project.id, 'stop')}>
                                  Stop all
                                </Button>
                                <Button
                                  size="small"
                                  type="primary"
                                  ghost
                                  onClick={() => handleProjectAction(activeProject.project.id, 'restart')}
                                >
                                  Restart all
                                </Button>
                                {activeProject.project.source === 'auto' && (
                                  <Button
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    onClick={() => setFilesEditorProject({ id: activeProject.project.id, name: activeProject.project.name })}
                                  >
                                    Arquivos
                                  </Button>
                                )}
                              </Space>
                            </Flex>
                          <Row gutter={[16, 16]}>
                            {activeProject.containers.map((c) => (
                              <Col xs={24} md={12} key={c.id}>
                                <ContainerCard
                                  container={c}
                                  stats={statsAll.find((s) => s.id === c.id)}
                                  onStart={() => handleContainerAction(c.id, 'start')}
                                  onStop={() => handleContainerAction(c.id, 'stop')}
                                  onRestart={() => handleContainerAction(c.id, 'restart')}
                                  onInspect={() => handleInspect(c)}
                                  onSelectLogs={() => setLogsContainer(c.id)}
                                  />
                                </Col>
                              ))}
                            </Row>
                          </Space>
                        )}

                        {inspectData && inspectContainer && (
                          <Card bordered className="glass-card">
                            <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                              <Title level={5} style={{ margin: 0 }}>
                                Variáveis de ambiente ({inspectContainer.name})
                              </Title>
                              <Tag color="default">read-only</Tag>
                            </Flex>
                            <Row gutter={[12, 12]}>
                              {inspectData.env.map((item) => (
                                <Col xs={24} sm={12} md={8} key={item.key}>
                                  <Card size="small" bordered>
                                    <Text strong>{item.key}</Text>
                                    <Paragraph className="mono" type="secondary">
                                      {item.value}
                                    </Paragraph>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                            <Divider />
                            <Flex justify="space-between" align="center">
                              <Space direction="vertical" size={4}>
                                <Title level={5} style={{ margin: 0 }}>
                                  Limites de recursos
                                </Title>
                                <Space>
                                  <Text type="secondary">CPU: {inspectData.limits.cpus ?? 'unset'}</Text>
                                  <Text type="secondary">Memória: {inspectData.limits.memory ?? 'unset'}</Text>
                                </Space>
                                {stats && (
                                  <Space>
                                    <Tag color="blue">CPU {stats.cpuPercent?.toFixed(2) ?? '-'}%</Tag>
                                    <Tag color="cyan">
                                      MEM {formatBytes(stats.memUsageBytes)} / {formatBytes(stats.memLimitBytes)} (
                                      {stats.memPercent?.toFixed(2) ?? '-'}%)
                                    </Tag>
                                  </Space>
                                )}
                              </Space>
                              <Button
                                type="primary"
                                onClick={() =>
                                  openResourceModal(inspectContainer, {
                                    cpus: inspectData.limits.cpus,
                                    memory: inspectData.limits.memory,
                                  })
                                }
                              >
                                Editar limites
                              </Button>
                            </Flex>
                          </Card>
                        )}
                      </Space>
                    ),
                  },
                  {
                    key: 'logs',
                    label: 'Logs',
                    children: (
                      <Card bordered className="glass-card">
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          <Flex gap={12} wrap="wrap" align="flex-end">
                            <div style={{ minWidth: 220 }}>
                              <Text strong>Container</Text>
                              <Select
                                showSearch
                                placeholder="Selecione"
                                value={logsContainer}
                                onChange={(v) => setLogsContainer(v)}
                                style={{ width: '100%', marginTop: 4 }}
                                options={containers.map((c) => ({ value: c.id, label: `${c.name} (${c.state})` }))}
                              />
                            </div>
                            <div>
                              <Text strong>Tail</Text>
                              <Segmented
                                style={{ marginTop: 4 }}
                                options={LINES_OPTIONS}
                                value={lines}
                                onChange={(v) => setLines(v as string)}
                              />
                            </div>
                            <Space>
                              <Button
                                type="primary"
                                disabled={!logsContainer}
                                onClick={() => logsContainer && handleLogsFetch(logsContainer, lines)}
                              >
                                Buscar Logs
                              </Button>
                            </Space>
                          </Flex>
                          <div className="log-area">
                            <pre className="mono logs-pre">{logs || 'Selecione um container e clique em "Buscar Logs".'}</pre>
                          </div>
                        </Space>
                      </Card>
                    ),
                  },
                  {
                    key: 'settings',
                    label: 'Settings',
                    children: (
                      <Card bordered className="glass-card">
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          <Title level={4} style={{ margin: 0 }}>
                            Conexão VPS
                          </Title>
                          <Alert
                            type="info"
                            message={
                              <span>
                                Configure em <code>.env.local</code> (ignorados pelo git): VPS_HOST, VPS_PORT,
                                VPS_USERNAME, VPS_PRIVATE_KEY_PATH, opcional VPS_PASSWORD / VPS_PRIVATE_KEY_PASSPHRASE.
                              </span>
                            }
                          />
                          <Button icon={<SettingOutlined />} onClick={testConnection}>
                            Testar conexão SSH
                          </Button>
                          {settingsStatus && (
                            <Text type="secondary" style={{ display: 'block' }}>
                              {settingsStatus}
                            </Text>
                          )}
                          <Text type="secondary">
                            Nunca commitar segredos. Veja <Link href="../docs/SECURITY-NOTES.md">docs/SECURITY-NOTES.md</Link>.
                          </Text>
                        </Space>
                      </Card>
                    ),
                  },
                ]}
              />
            </Card>
          </Content>
        </Layout>

        <Modal
          open={resourceModal.open}
          title="Confirmar limites de recurso"
          onCancel={() => setResourceModal({ open: false })}
          onOk={confirmResourceUpdate}
          okText="Aplicar"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <InputNumber
              style={{ width: '100%' }}
              addonBefore="CPUs"
              placeholder="ex: 0.5 ou 2"
              value={resourceModal.cpus ? Number(resourceModal.cpus) : undefined}
              min={0}
              step={0.1}
              onChange={(val) => setResourceModal((s) => ({ ...s, cpus: val ? String(val) : undefined }))}
            />
            <Input
              addonBefore="Memória"
              placeholder="ex: 512m ou 1g"
              value={resourceModal.memory ?? ''}
              onChange={(e) => setResourceModal((s) => ({ ...s, memory: e.currentTarget.value || undefined }))}
            />
            <Alert
              type="warning"
              message={
                <span>
                  Comando: <code>{resourceCommandPreview()}</code>
                </span>
              }
            />
          </Space>
        </Modal>

        <ProjectFilesEditor
          open={!!filesEditorProject}
          projectId={filesEditorProject?.id || ''}
          projectName={filesEditorProject?.name || ''}
          onClose={() => setFilesEditorProject(null)}
          fetchJson={fetchJson}
          onSuccess={(msg) => message.success(msg)}
          onError={(msg, desc) => notification.error({ message: msg, description: desc })}
        />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
