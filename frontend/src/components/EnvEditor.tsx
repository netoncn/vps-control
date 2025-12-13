import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  Typography,
  Flex,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

type EnvVar = {
  key: string;
  value: string;
  isNew?: boolean;
};

type EnvEditorProps = {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
};

function parseEnvContent(content: string): EnvVar[] {
  const lines = content.split('\n');
  const vars: EnvVar[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      vars.push({ key, value });
    }
  }

  return vars;
}

function serializeEnvVars(vars: EnvVar[]): string {
  return vars
    .filter(v => v.key.trim())
    .map(v => {
      const value = v.value.includes(' ') || v.value.includes('"')
        ? `"${v.value.replace(/"/g, '\\"')}"`
        : v.value;
      return `${v.key}=${value}`;
    })
    .join('\n');
}

export function EnvEditor({ content, onChange, readOnly = false }: EnvEditorProps) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ key: string; value: string }>({ key: '', value: '' });
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVars(parseEnvContent(content));
  }, [content]);

  const updateContent = (newVars: EnvVar[]) => {
    setVars(newVars);
    onChange(serializeEnvVars(newVars));
  };

  const handleAdd = () => {
    const newVar: EnvVar = { key: '', value: '', isNew: true };
    const newVars = [...vars, newVar];
    setVars(newVars);
    setEditingKey('__new__');
    setEditingValue({ key: '', value: '' });
  };

  const handleEdit = (record: EnvVar) => {
    setEditingKey(record.key || '__new__');
    setEditingValue({ key: record.key, value: record.value });
  };

  const handleSave = (originalKey: string) => {
    if (!editingValue.key.trim()) {
      // Remove if key is empty
      const newVars = vars.filter(v => v.key !== originalKey && !v.isNew);
      updateContent(newVars);
    } else {
      const newVars = vars.map(v => {
        if (v.key === originalKey || v.isNew) {
          return { key: editingValue.key.trim(), value: editingValue.value };
        }
        return v;
      });
      updateContent(newVars);
    }
    setEditingKey(null);
    setEditingValue({ key: '', value: '' });
  };

  const handleCancel = () => {
    // Remove unsaved new items
    const newVars = vars.filter(v => !v.isNew);
    setVars(newVars);
    setEditingKey(null);
    setEditingValue({ key: '', value: '' });
  };

  const handleDelete = (key: string) => {
    const newVars = vars.filter(v => v.key !== key);
    updateContent(newVars);
  };

  const toggleVisibility = (key: string) => {
    const newVisible = new Set(visibleValues);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleValues(newVisible);
  };

  const isSensitive = (key: string) => {
    const sensitivePatterns = ['password', 'secret', 'key', 'token', 'api_key', 'apikey', 'private'];
    return sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern));
  };

  const columns = [
    {
      title: 'Variavel',
      dataIndex: 'key',
      key: 'key',
      width: '35%',
      render: (text: string, record: EnvVar) => {
        const isEditing = editingKey === (record.key || '__new__');
        if (isEditing) {
          return (
            <Input
              value={editingValue.key}
              onChange={(e) => setEditingValue({ ...editingValue, key: e.target.value })}
              placeholder="NOME_DA_VARIAVEL"
              style={{ fontFamily: 'monospace' }}
              autoFocus
            />
          );
        }
        return <Text code style={{ fontSize: 13 }}>{text}</Text>;
      },
    },
    {
      title: 'Valor',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: EnvVar) => {
        const isEditing = editingKey === (record.key || '__new__');
        const isVisible = visibleValues.has(record.key);
        const sensitive = isSensitive(record.key);

        if (isEditing) {
          return (
            <Input.TextArea
              value={editingValue.value}
              onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
              placeholder="valor"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          );
        }

        if (sensitive && !isVisible) {
          return (
            <Flex align="center" gap={8}>
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {'•'.repeat(Math.min(text.length || 8, 20))}
              </Text>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => toggleVisibility(record.key)}
              />
            </Flex>
          );
        }

        return (
          <Flex align="center" gap={8}>
            <Text
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                wordBreak: 'break-all',
              }}
            >
              {text || <Text type="secondary">(vazio)</Text>}
            </Text>
            {sensitive && isVisible && (
              <Button
                type="text"
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={() => toggleVisibility(record.key)}
              />
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Acoes',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: EnvVar) => {
        const isEditing = editingKey === (record.key || '__new__');

        if (readOnly) return null;

        if (isEditing) {
          return (
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleSave(record.key || '__new__')}
                style={{ color: '#22c55e' }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancel}
                danger
              />
            </Space>
          );
        }

        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
            <Popconfirm
              title="Remover variavel?"
              description={`Tem certeza que deseja remover ${record.key}?`}
              onConfirm={() => handleDelete(record.key)}
              okText="Sim"
              cancelText="Nao"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {!readOnly && (
        <Flex justify="flex-end" style={{ marginBottom: 12 }}>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={editingKey !== null}
          >
            Adicionar Variavel
          </Button>
        </Flex>
      )}

      {vars.length === 0 && editingKey === null ? (
        <Empty
          description="Nenhuma variavel de ambiente"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Table
          dataSource={vars}
          columns={columns}
          rowKey={(record) => record.key || '__new__'}
          pagination={false}
          size="small"
          style={{
            background: 'var(--ant-color-bg-container)',
            borderRadius: 8,
          }}
        />
      )}
    </div>
  );
}
