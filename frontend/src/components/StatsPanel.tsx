import { Card, Row, Col, Statistic, Progress, Typography, Flex, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  AppstoreOutlined,
  HddOutlined,
  CloudOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

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

type StatsPanelProps = {
  runningContainers: number;
  stoppedContainers: number;
  projectsCount: number;
  systemInfo: SystemOverview | null;
};

function StatCard({
  title,
  value,
  icon,
  color,
  suffix,
  extra,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      size="small"
      style={{
        height: '100%',
        transition: 'all 180ms ease-out',
      }}
      hoverable
      styles={{
        body: { padding: 16 },
      }}
    >
      <Flex align="flex-start" justify="space-between">
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Text>
          <Statistic
            value={value}
            suffix={suffix}
            valueStyle={{ fontSize: 28, fontWeight: 600, color, marginTop: 4 }}
          />
          {extra}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color,
          }}
        >
          {icon}
        </div>
      </Flex>
    </Card>
  );
}

export function StatsPanel({ runningContainers, stoppedContainers, projectsCount, systemInfo }: StatsPanelProps) {
  const totalContainers = runningContainers + stoppedContainers;
  const runningPercent = totalContainers ? Math.round((runningContainers / totalContainers) * 100) : 0;

  const diskRoot = systemInfo?.disk.find((d) => d.target === '/') || systemInfo?.disk[0];
  const cpuLoad = systemInfo?.load[0] ? Math.round((systemInfo.load[0] / systemInfo.cores) * 100) : 0;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Containers Ativos"
          value={runningContainers}
          icon={<PlayCircleOutlined />}
          color="#22c55e"
          extra={
            <Tooltip title={`${runningPercent}% dos containers estão rodando`}>
              <Progress
                percent={runningPercent}
                size="small"
                showInfo={false}
                strokeColor="#22c55e"
                style={{ marginTop: 8 }}
              />
            </Tooltip>
          }
        />
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Containers Parados"
          value={stoppedContainers}
          icon={<PauseCircleOutlined />}
          color="#94a3b8"
          extra={
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Total: {totalContainers} containers
            </Text>
          }
        />
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Projetos"
          value={projectsCount}
          icon={<AppstoreOutlined />}
          color="#3b82f6"
          extra={
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Auto + Manual
            </Text>
          }
        />
      </Col>

      <Col xs={24} sm={12} lg={6}>
        {systemInfo ? (
          <Card
            size="small"
            hoverable
            styles={{ body: { padding: 16 } }}
            style={{ height: '100%', transition: 'all 180ms ease-out' }}
          >
            <Flex align="flex-start" justify="space-between">
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sistema
                </Text>
                <Flex gap={8} style={{ marginTop: 8 }}>
                  <Tooltip title={`CPU: ${cpuLoad}% (${systemInfo.cores} cores)`}>
                    <div style={{ flex: 1 }}>
                      <Flex align="center" gap={4}>
                        <DashboardOutlined style={{ color: '#f59e0b' }} />
                        <Text style={{ fontSize: 12 }}>CPU</Text>
                      </Flex>
                      <Progress
                        percent={cpuLoad}
                        size="small"
                        status={cpuLoad > 80 ? 'exception' : 'active'}
                        strokeColor={cpuLoad > 80 ? '#ef4444' : '#f59e0b'}
                      />
                    </div>
                  </Tooltip>
                  <Tooltip title={`RAM: ${systemInfo.memory.usedMb}MB / ${systemInfo.memory.totalMb}MB`}>
                    <div style={{ flex: 1 }}>
                      <Flex align="center" gap={4}>
                        <CloudOutlined style={{ color: '#06b6d4' }} />
                        <Text style={{ fontSize: 12 }}>RAM</Text>
                      </Flex>
                      <Progress
                        percent={systemInfo.memory.usedPercent}
                        size="small"
                        status={systemInfo.memory.usedPercent > 85 ? 'exception' : 'active'}
                        strokeColor={systemInfo.memory.usedPercent > 85 ? '#ef4444' : '#06b6d4'}
                      />
                    </div>
                  </Tooltip>
                </Flex>
                {diskRoot && (
                  <Tooltip title={`Disco: ${(diskRoot.usedBytes / 1024 ** 3).toFixed(1)}GB / ${(diskRoot.sizeBytes / 1024 ** 3).toFixed(1)}GB`}>
                    <div style={{ marginTop: 4 }}>
                      <Flex align="center" gap={4}>
                        <HddOutlined style={{ color: '#8b5cf6' }} />
                        <Text style={{ fontSize: 12 }}>Disco</Text>
                      </Flex>
                      <Progress
                        percent={diskRoot.usedPercent}
                        size="small"
                        status={diskRoot.usedPercent > 90 ? 'exception' : 'active'}
                        strokeColor={diskRoot.usedPercent > 90 ? '#ef4444' : '#8b5cf6'}
                      />
                    </div>
                  </Tooltip>
                )}
              </div>
            </Flex>
          </Card>
        ) : (
          <StatCard
            title="Sistema"
            value="..."
            icon={<CloudOutlined />}
            color="#8b5cf6"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Carregando...</Text>}
          />
        )}
      </Col>
    </Row>
  );
}
