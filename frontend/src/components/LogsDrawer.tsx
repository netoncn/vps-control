import { useState, useEffect, useRef } from 'react';
import { Drawer, Select, Button, Space, Segmented, Typography, Flex, Spin, Empty } from 'antd';
import { ReloadOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

type ContainerInfo = {
  id: string;
  name: string;
  state: string;
};

type LogsDrawerProps = {
  open: boolean;
  onClose: () => void;
  containers: ContainerInfo[];
  selectedContainerId: string | null;
  onSelectContainer: (id: string) => void;
  fetchLogs: (containerId: string, lines: string) => Promise<string>;
};

const LINES_OPTIONS = ['100', '500', '1000', '2000'];

export function LogsDrawer({
  open,
  onClose,
  containers,
  selectedContainerId,
  onSelectContainer,
  fetchLogs,
}: LogsDrawerProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<string>('100');
  const logsRef = useRef<HTMLPreElement>(null);

  const selectedContainer = containers.find((c) => c.id === selectedContainerId);

  const handleFetch = async () => {
    if (!selectedContainerId) return;
    setLoading(true);
    try {
      const result = await fetchLogs(selectedContainerId, lines);
      setLogs(result);
      // Scroll to bottom
      setTimeout(() => {
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      setLogs(`Erro ao buscar logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!logs || !selectedContainer) return;
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedContainer.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (open && selectedContainerId) {
      handleFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContainerId, open]);

  return (
    <Drawer
      title={
        <Flex align="center" gap={8}>
          <span>Logs</span>
          {selectedContainer && (
            <Text type="secondary" style={{ fontWeight: 'normal' }}>
              - {selectedContainer.name}
            </Text>
          )}
        </Flex>
      }
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Controls */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ant-color-border)' }}>
        <Flex gap={12} wrap="wrap" align="center">
          <Select
            placeholder="Selecione um container"
            value={selectedContainerId}
            onChange={onSelectContainer}
            style={{ width: 240 }}
            options={containers.map((c) => ({
              value: c.id,
              label: (
                <Flex align="center" gap={8}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: c.state === 'running' ? '#22c55e' : '#94a3b8',
                    }}
                  />
                  <span>{c.name}</span>
                </Flex>
              ),
            }))}
          />

          <Segmented
            options={LINES_OPTIONS.map((l) => ({ label: l, value: l }))}
            value={lines}
            onChange={(v) => setLines(v as string)}
          />

          <Space>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleFetch}
              loading={loading}
              disabled={!selectedContainerId}
            >
              Atualizar
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setLogs('')}
              disabled={!logs}
            >
              Limpar
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={!logs}
            >
              Baixar
            </Button>
          </Space>
        </Flex>
      </div>

      {/* Logs Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Spin size="large" />
          </div>
        )}

        {!selectedContainerId ? (
          <Empty
            description="Selecione um container para ver os logs"
            style={{ padding: 48 }}
          />
        ) : !logs ? (
          <Empty
            description="Nenhum log disponível"
            style={{ padding: 48 }}
          />
        ) : (
          <pre
            ref={logsRef}
            style={{
              margin: 0,
              padding: 16,
              height: '100%',
              overflow: 'auto',
              background: '#0f172a',
              color: '#e2e8f0',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {logs}
          </pre>
        )}
      </div>
    </Drawer>
  );
}
