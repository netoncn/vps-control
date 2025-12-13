import { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Progress,
  Typography,
  Flex,
  Badge,
  Collapse,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  CaretRightOutlined,
  FileTextOutlined,
  ExpandOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports?: string;
  composeProject?: string;
};

type ContainerStats = {
  id: string;
  name: string;
  cpuPercent?: number;
  memUsageBytes?: number;
  memLimitBytes?: number;
  memPercent?: number;
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

type ProjectCardProps = {
  projectData: ProjectWithContainers;
  stats: ContainerStats[];
  onStartProject: () => void;
  onStopProject: () => void;
  onRestartProject: () => void;
  onStartContainer: (id: string) => void;
  onStopContainer: (id: string) => void;
  onRestartContainer: (id: string) => void;
  onViewLogs: (id: string) => void;
  onInspect: (container: ContainerInfo) => void;
  onEditFiles: () => void;
  loading?: boolean;
};

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

function ContainerRow({
  container,
  stats,
  onStart,
  onStop,
  onRestart,
  onViewLogs,
  onInspect,
}: {
  container: ContainerInfo;
  stats?: ContainerStats;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onViewLogs: () => void;
  onInspect: () => void;
}) {
  const isRunning = container.state === 'running';

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        borderLeft: `3px solid ${isRunning ? '#22c55e' : '#94a3b8'}`,
        transition: 'all 180ms ease-out',
      }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div style={{ minWidth: 200 }}>
          <Flex align="center" gap={8}>
            <Badge status={isRunning ? 'success' : 'default'} />
            <Text strong style={{ fontSize: 14 }}>{container.name}</Text>
          </Flex>
          <Text type="secondary" style={{ fontSize: 12 }}>{container.image}</Text>
          {container.ports && (
            <Tag color="blue" style={{ marginTop: 4, fontSize: 11 }}>{container.ports}</Tag>
          )}
        </div>

        {stats && (
          <Flex gap={16} style={{ minWidth: 200 }}>
            <Tooltip title={`CPU: ${stats.cpuPercent?.toFixed(1) || 0}%`}>
              <div style={{ width: 80 }}>
                <Text style={{ fontSize: 11 }}>CPU</Text>
                <Progress
                  percent={stats.cpuPercent || 0}
                  size="small"
                  showInfo={false}
                  strokeColor={(stats.cpuPercent || 0) > 80 ? '#ef4444' : '#3b82f6'}
                />
              </div>
            </Tooltip>
            <Tooltip title={`Memória: ${formatBytes(stats.memUsageBytes)} / ${formatBytes(stats.memLimitBytes)}`}>
              <div style={{ width: 80 }}>
                <Text style={{ fontSize: 11 }}>RAM</Text>
                <Progress
                  percent={stats.memPercent || 0}
                  size="small"
                  showInfo={false}
                  strokeColor={(stats.memPercent || 0) > 80 ? '#ef4444' : '#06b6d4'}
                />
              </div>
            </Tooltip>
          </Flex>
        )}

        <Space size={4}>
          <Tooltip title="Logs">
            <Button size="small" icon={<FileTextOutlined />} onClick={onViewLogs} />
          </Tooltip>
          <Tooltip title="Inspecionar">
            <Button size="small" icon={<ExpandOutlined />} onClick={onInspect} />
          </Tooltip>
          {isRunning ? (
            <>
              <Tooltip title="Reiniciar">
                <Button size="small" icon={<ReloadOutlined />} onClick={onRestart} />
              </Tooltip>
              <Tooltip title="Parar">
                <Button size="small" danger icon={<PauseCircleOutlined />} onClick={onStop} />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Iniciar">
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={onStart} />
            </Tooltip>
          )}
        </Space>
      </Flex>
    </Card>
  );
}

export function ProjectCard({
  projectData,
  stats,
  onStartProject,
  onStopProject,
  onRestartProject,
  onStartContainer,
  onStopContainer,
  onRestartContainer,
  onViewLogs,
  onInspect,
  onEditFiles,
  loading,
}: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { project, containers } = projectData;

  const running = containers.filter((c) => c.state === 'running').length;
  const total = containers.length;
  const percent = total ? Math.round((running / total) * 100) : 0;

  const getStatusColor = () => {
    if (percent === 100) return '#22c55e';
    if (percent === 0) return '#94a3b8';
    return '#f59e0b';
  };

  return (
    <Card
      style={{
        transition: 'all 180ms ease-out',
        borderTop: `3px solid ${getStatusColor()}`,
      }}
      styles={{
        body: { padding: 0 },
      }}
      hoverable={!expanded}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={12}>
            <CaretRightOutlined
              style={{
                transition: 'transform 180ms ease',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
            <div>
              <Flex align="center" gap={8}>
                <Text strong style={{ fontSize: 16 }}>{project.name}</Text>
                <Tag color={project.source === 'auto' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                  {project.source}
                </Tag>
              </Flex>
              {project.composeProject && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  compose: {project.composeProject}
                </Text>
              )}
            </div>
          </Flex>

          <Flex align="center" gap={16}>
            <Tooltip title={`${running}/${total} containers ativos`}>
              <div style={{ width: 120 }}>
                <Progress
                  percent={percent}
                  size="small"
                  strokeColor={getStatusColor()}
                  format={() => `${running}/${total}`}
                />
              </div>
            </Tooltip>
            <Badge
              status={percent === 100 ? 'success' : percent === 0 ? 'default' : 'warning'}
              text={percent === 100 ? 'Rodando' : percent === 0 ? 'Parado' : 'Parcial'}
            />
          </Flex>
        </Flex>
      </div>

      {/* Expanded Content */}
      <Collapse
        activeKey={expanded ? ['content'] : []}
        ghost
        items={[
          {
            key: 'content',
            showArrow: false,
            label: null,
            children: (
              <div style={{ padding: '0 20px 20px' }}>
                {/* Actions */}
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                  <Space>
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={(e) => { e.stopPropagation(); onStartProject(); }}
                      loading={loading}
                    >
                      Iniciar Todos
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={(e) => { e.stopPropagation(); onStopProject(); }}
                      loading={loading}
                    >
                      Parar Todos
                    </Button>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={(e) => { e.stopPropagation(); onRestartProject(); }}
                      loading={loading}
                    >
                      Reiniciar
                    </Button>
                  </Space>
                  {project.source === 'auto' && (
                    <Button
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={(e) => { e.stopPropagation(); onEditFiles(); }}
                    >
                      Arquivos
                    </Button>
                  )}
                </Flex>

                {/* Containers */}
                <div>
                  {containers.map((container) => (
                    <ContainerRow
                      key={container.id}
                      container={container}
                      stats={stats.find((s) => s.id === container.id)}
                      onStart={() => onStartContainer(container.id)}
                      onStop={() => onStopContainer(container.id)}
                      onRestart={() => onRestartContainer(container.id)}
                      onViewLogs={() => onViewLogs(container.id)}
                      onInspect={() => onInspect(container)}
                    />
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
