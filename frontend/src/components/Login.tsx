import { useState } from 'react';
import { Button, Card, Form, Input, Typography, Space, Alert, Flex } from 'antd';
import { LockOutlined, UserOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useTheme } from '../theme/ThemeContext';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

type LoginProps = {
  onLogin: (token: string) => void;
};

export function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode } = useTheme();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login falhou');
      }

      const { token } = await res.json();
      onLogin(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login falhou';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: '100vh',
        background: mode === 'dark'
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Flex vertical align="center" gap={12}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudServerOutlined style={{ fontSize: 32, color: '#fff' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0 }}>
                VPS Control
              </Title>
              <Text type="secondary">Faça login para continuar</Text>
            </div>
          </Flex>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Digite o usuário' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />}
                placeholder="Usuário"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Digite a senha' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />}
                placeholder="Senha"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ height: 48, fontWeight: 600 }}
              >
                Entrar
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </Flex>
  );
}
