import { Layout, Button, Space, Tag, Typography, Flex, Tooltip } from 'antd';
import {
  ReloadOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  CloudServerOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTheme } from '../theme/ThemeContext';

const { Header } = Layout;
const { Text } = Typography;

type AppHeaderProps = {
  authRequired: boolean;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenLogs: () => void;
};

export function AppHeader({ authRequired, loading, onRefresh, onLogout, onOpenLogs }: AppHeaderProps) {
  const { mode, toggleTheme } = useTheme();

  return (
    <Header
      style={{
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Flex align="center" gap={12}>
        <CloudServerOutlined style={{ fontSize: 24, color: 'var(--ant-color-primary)' }} />
        <Text strong style={{ fontSize: 18, margin: 0 }}>
          VPS Control
        </Text>
        {authRequired ? (
          <Tag color="success" style={{ marginLeft: 8 }}>
            Autenticado
          </Tag>
        ) : (
          <Tag color="processing" style={{ marginLeft: 8 }}>
            Local
          </Tag>
        )}
      </Flex>

      <Space size="middle">
        <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          <Button
            type="text"
            icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ fontSize: 18 }}
          />
        </Tooltip>

        <Tooltip title="Ver logs dos containers">
          <Button
            icon={<FileTextOutlined />}
            onClick={onOpenLogs}
          >
            Logs
          </Button>
        </Tooltip>

        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          loading={loading}
        >
          Atualizar
        </Button>

        {authRequired && (
          <Button icon={<LogoutOutlined />} onClick={onLogout} danger>
            Sair
          </Button>
        )}
      </Space>
    </Header>
  );
}
