import { useState } from 'react';
import { Button, Card, Form, Input, Typography, Space, Alert } from 'antd';
import { LockOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

type LoginProps = {
  onLogin: (token: string) => void;
};

export function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(data.error || 'Login failed');
      }

      const { token } = await res.json();
      onLogin(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <ThunderboltOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
            <Title level={2} style={{ margin: 0 }}>
              VPS Docker Control
            </Title>
            <Text type="secondary">Faca login para continuar</Text>
          </div>

          {error && (
            <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
          )}

          <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Digite o usuario' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Usuario"
                size="large"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Digite a senha' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Senha"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Entrar
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
