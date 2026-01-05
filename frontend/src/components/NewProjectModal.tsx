import { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Divider,
  Typography,
  Flex,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

type EnvVar = {
  key: string;
  value: string;
};

type ServiceConfig = {
  serviceName: string;
  image: string;
  host: string;
  port: number;
  cpus: string;
  memory: string;
  envVars: EnvVar[];
};

type NewProjectFormData = {
  projectName: string;
  services: ServiceConfig[];
};

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewProjectFormData) => Promise<void>;
};

const defaultService: ServiceConfig = {
  serviceName: '',
  image: 'ghcr.io/',
  host: '',
  port: 3000,
  cpus: '0.75',
  memory: '1g',
  envVars: [{ key: '', value: '' }],
};

export function NewProjectModal({ open, onClose, onSubmit }: NewProjectModalProps) {
  const [form] = Form.useForm<NewProjectFormData>();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceConfig[]>([{ ...defaultService }]);

  const handleClose = () => {
    form.resetFields();
    setServices([{ ...defaultService }]);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      // Combine form values with services state
      const data: NewProjectFormData = {
        projectName: values.projectName,
        services: services.map((service, idx) => ({
          ...service,
          serviceName: values.services?.[idx]?.serviceName || service.serviceName,
          image: values.services?.[idx]?.image || service.image,
          host: values.services?.[idx]?.host || service.host,
          port: values.services?.[idx]?.port || service.port,
          cpus: values.services?.[idx]?.cpus || service.cpus,
          memory: values.services?.[idx]?.memory || service.memory,
        })),
      };

      setLoading(true);
      await onSubmit(data);
      handleClose();
    } catch (err) {
      // Validation errors are shown by form
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setServices([...services, { ...defaultService }]);
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      const newServices = services.filter((_, i) => i !== index);
      setServices(newServices);
    }
  };

  const addEnvVar = (serviceIndex: number) => {
    const newServices = [...services];
    newServices[serviceIndex].envVars.push({ key: '', value: '' });
    setServices(newServices);
  };

  const removeEnvVar = (serviceIndex: number, envIndex: number) => {
    const newServices = [...services];
    if (newServices[serviceIndex].envVars.length > 1) {
      newServices[serviceIndex].envVars = newServices[serviceIndex].envVars.filter(
        (_, i) => i !== envIndex
      );
      setServices(newServices);
    }
  };

  const updateEnvVar = (serviceIndex: number, envIndex: number, field: 'key' | 'value', value: string) => {
    const newServices = [...services];
    newServices[serviceIndex].envVars[envIndex][field] = value;
    setServices(newServices);
  };

  return (
    <Modal
      title="Novo Projeto"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Criar Projeto
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          projectName: '',
          services: [defaultService],
        }}
      >
        <Form.Item
          label="Nome do Projeto"
          name="projectName"
          rules={[
            { required: true, message: 'Digite o nome do projeto' },
            { pattern: /^[a-z0-9-]+$/, message: 'Use apenas letras minúsculas, números e hífens' },
          ]}
          extra="Este será o nome da pasta em /srv"
        >
          <Input placeholder="meu-projeto" />
        </Form.Item>

        <Divider>Serviços</Divider>

        {services.map((service, serviceIndex) => (
          <Card
            key={serviceIndex}
            size="small"
            title={
              <Flex justify="space-between" align="center">
                <Text strong>Serviço {serviceIndex + 1}</Text>
                {services.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeService(serviceIndex)}
                  />
                )}
              </Flex>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Nome do Serviço"
                  name={['services', serviceIndex, 'serviceName']}
                  rules={[
                    { required: true, message: 'Digite o nome do serviço' },
                    { pattern: /^[a-z0-9-]+$/, message: 'Use apenas letras minúsculas, números e hífens' },
                  ]}
                >
                  <Input placeholder="meu-servico-api" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Host (domínio)"
                  name={['services', serviceIndex, 'host']}
                  rules={[{ required: true, message: 'Digite o host' }]}
                >
                  <Input placeholder="api.exemplo.com.br" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Imagem Docker"
              name={['services', serviceIndex, 'image']}
              rules={[
                { required: true, message: 'Digite a imagem' },
                {
                  pattern: /^ghcr\.io\/.+:.+$/,
                  message: 'A imagem deve começar com ghcr.io/ e ter uma tag (ex: :latest)',
                },
              ]}
              initialValue="ghcr.io/"
            >
              <Input placeholder="ghcr.io/ch2holding/meu-projeto:latest" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Porta"
                  name={['services', serviceIndex, 'port']}
                  initialValue={3000}
                  rules={[{ required: true, message: 'Digite a porta' }]}
                >
                  <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="CPU Limit"
                  name={['services', serviceIndex, 'cpus']}
                  initialValue="0.75"
                  rules={[{ required: true, message: 'Digite o limite de CPU' }]}
                  extra="Ex: 0.5, 1, 2"
                >
                  <Input placeholder="0.75" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Memory Limit"
                  name={['services', serviceIndex, 'memory']}
                  initialValue="1g"
                  rules={[
                    { required: true, message: 'Digite o limite de memória' },
                    { pattern: /^\d+[kmgKMG]?$/, message: 'Formato inválido (ex: 512m, 1g)' },
                  ]}
                  extra="Ex: 512m, 1g, 2g"
                >
                  <Input placeholder="1g" />
                </Form.Item>
              </Col>
            </Row>

            <Divider plain>
              <Text type="secondary">Variáveis de Ambiente</Text>
            </Divider>

            {service.envVars.map((envVar, envIndex) => (
              <Flex key={envIndex} gap={8} style={{ marginBottom: 8 }}>
                <Input
                  placeholder="CHAVE"
                  value={envVar.key}
                  onChange={(e) => updateEnvVar(serviceIndex, envIndex, 'key', e.target.value)}
                  style={{ flex: 1 }}
                />
                <Input
                  placeholder="valor"
                  value={envVar.value}
                  onChange={(e) => updateEnvVar(serviceIndex, envIndex, 'value', e.target.value)}
                  style={{ flex: 2 }}
                />
                {service.envVars.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeEnvVar(serviceIndex, envIndex)}
                  />
                )}
              </Flex>
            ))}

            <Button type="dashed" icon={<PlusOutlined />} onClick={() => addEnvVar(serviceIndex)}>
              Adicionar Variável
            </Button>
          </Card>
        ))}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addService} block>
          Adicionar Serviço
        </Button>
      </Form>
    </Modal>
  );
}
