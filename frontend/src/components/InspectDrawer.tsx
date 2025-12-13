import { useState } from 'react';
import {
  Drawer,
  Card,
  Tag,
  Button,
  Space,
  Progress,
  Typography,
  Flex,
  InputNumber,
  Input,
  Alert,
  Row,
  Col,
  Spin,
} from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports?: string;
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

type InspectDrawerProps = {
  open: boolean;
  onClose: () => void;
  container: ContainerInfo | null;
  inspectData: ContainerInspect | null;
  stats: ContainerStats | null;
  loading: boolean;
  onUpdateResources: (cpus?: string, memory?: string) => Promise<void>;
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

export function InspectDrawer({
  open,
  onClose,
  container,
  inspectData,
  stats,
  loading,
  onUpdateResources,
}: InspectDrawerProps) {
  const [editingResources, setEditingResources] = useState(false);
  const [cpus, setCpus] = useState<string>('');
  const [memory, setMemory] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleEditResources = () => {
    setCpus(inspectData?.limits.cpus || '');
    setMemory(inspectData?.limits.memory || '');
    setEditingResources(true);
  };

  const handleSaveResources = async () => {
    setSaving(true);
    try {
      await onUpdateResources(cpus || undefined, memory || undefined);
      setEditingResources(false);
    } finally {
      setSaving(false);
    }
  };

  const isRunning = container?.state === 'running';

  return (
    <Drawer
      title={
        <Flex align="center" gap={8}>
          <SettingOutlined />
          <span>Detalhes do Container</span>
          {container && (
            <Tag color={isRunning ? 'success' : 'default'}>{container.state}</Tag>
          )}
        </Flex>
      }
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
    >
      {loading ? (
        <Flex justify="center" align="center" style={{ padding: 48 }}>
          <Spin size="large" />
        </Flex>
      ) : !container || !inspectData ? (
        <Alert message="Nenhum container selecionado" type="info" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Basic Info */}
          <Card size="small">
            <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
              Informações
            </Title>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">Nome</Text>
              </Col>
              <Col span={16}>
                <Text strong>{container.name}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Imagem</Text>
              </Col>
              <Col span={16}>
                <Text code>{container.image}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Status</Text>
              </Col>
              <Col span={16}>
                <Text>{container.status}</Text>
              </Col>
              {container.ports && (
                <>
                  <Col span={8}>
                    <Text type="secondary">Portas</Text>
                  </Col>
                  <Col span={16}>
                    <Tag color="blue">{container.ports}</Tag>
                  </Col>
                </>
              )}
            </Row>
          </Card>

          {/* Stats */}
          {stats && (
            <Card size="small">
              <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                Uso de Recursos
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    CPU
                  </Text>
                  <Progress
                    percent={stats.cpuPercent || 0}
                    status={(stats.cpuPercent || 0) > 80 ? 'exception' : 'active'}
                    format={(p) => `${p?.toFixed(1)}%`}
                  />
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    Memória
                  </Text>
                  <Progress
                    percent={stats.memPercent || 0}
                    status={(stats.memPercent || 0) > 80 ? 'exception' : 'active'}
                    format={(p) => `${p?.toFixed(1)}%`}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatBytes(stats.memUsageBytes)} / {formatBytes(stats.memLimitBytes)}
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* Resource Limits */}
          <Card size="small">
            <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>
                Limites de Recursos
              </Title>
              {!editingResources && (
                <Button size="small" onClick={handleEditResources}>
                  Editar
                </Button>
              )}
            </Flex>

            {editingResources ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    CPUs (ex: 0.5, 1, 2)
                  </Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={cpus ? Number(cpus) : undefined}
                    min={0}
                    step={0.1}
                    placeholder="Sem limite"
                    onChange={(val) => setCpus(val ? String(val) : '')}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    Memória (ex: 512m, 1g)
                  </Text>
                  <Input
                    value={memory}
                    placeholder="Sem limite"
                    onChange={(e) => setMemory(e.target.value)}
                  />
                </div>
                <Alert
                  type="info"
                  message={
                    <Text code style={{ fontSize: 12 }}>
                      docker update {cpus ? `--cpus=${cpus}` : ''} {memory ? `--memory=${memory}` : ''} {container.name}
                    </Text>
                  }
                />
                <Flex gap={8} justify="flex-end">
                  <Button onClick={() => setEditingResources(false)}>Cancelar</Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveResources}
                    loading={saving}
                  >
                    Salvar
                  </Button>
                </Flex>
              </Space>
            ) : (
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <Text type="secondary">CPUs</Text>
                </Col>
                <Col span={16}>
                  <Text>{inspectData.limits.cpus || 'Sem limite'}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Memória</Text>
                </Col>
                <Col span={16}>
                  <Text>{inspectData.limits.memory || 'Sem limite'}</Text>
                </Col>
              </Row>
            )}
          </Card>

          {/* Environment Variables */}
          <Card size="small">
            <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
              Variáveis de Ambiente
            </Title>
            <div
              style={{
                maxHeight: 300,
                overflow: 'auto',
                background: 'var(--ant-color-bg-spotlight)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              {inspectData.env.length === 0 ? (
                <Text type="secondary">Nenhuma variável definida</Text>
              ) : (
                inspectData.env.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '4px 0',
                      borderBottom: index < inspectData.env.length - 1 ? '1px solid var(--ant-color-border)' : 'none',
                    }}
                  >
                    <Text strong style={{ color: 'var(--ant-color-primary)' }}>
                      {item.key}
                    </Text>
                    <Text type="secondary">=</Text>
                    <Text code style={{ marginLeft: 4, wordBreak: 'break-all' }}>
                      {item.value}
                    </Text>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Space>
      )}
    </Drawer>
  );
}
