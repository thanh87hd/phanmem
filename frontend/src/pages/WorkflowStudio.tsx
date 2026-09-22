import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Form, Input, Select, message, Layout, Typography, List, Space, Drawer } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 50 }, data: { label: 'Sự kiện Kích hoạt (Trigger)' }, type: 'input' }
];

const WorkflowStudio: React.FC = () => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Form states
  const [form] = Form.useForm();
  const [nodeForm] = Form.useForm();

  useEffect(() => {
    fetchWorkflows();
    fetchApps();
  }, []);

  async function fetchWorkflows() {
    try {
      const res = await api.get('/dynamic-workflows');
      setWorkflows(res.data);
    } catch (err) {
      message.error('Lỗi khi tải danh sách Workflow');
    }
  };

  async function fetchApps() {
    try {
      const res = await api.get('/framework/metadata');
      setApps(res.data);
    } catch (err) {
      message.error('Lỗi khi tải danh sách App Metadata');
    }
  };

  const handleSelectWorkflow = (wf: any) => {
    setCurrentWorkflow(wf);
    form.setFieldsValue({
      name: wf.name,
      triggerResource: wf.triggerResource,
      triggerEvent: wf.triggerEvent
    });
    setNodes(wf.nodes?.length ? wf.nodes : initialNodes);
    setEdges(wf.edges || []);
  };

  const handleCreateNew = () => {
    setCurrentWorkflow(null);
    form.resetFields();
    setNodes(initialNodes);
    setEdges([]);
  };

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        nodes,
        edges
      };

      setLoading(true);
      if (currentWorkflow?.id) {
        await api.put(`/dynamic-workflows/${currentWorkflow.id}`, payload);
        message.success('Cập nhật Workflow thành công!');
      } else {
        const res = await api.post('/dynamic-workflows', payload);
        message.success('Tạo mới Workflow thành công!');
        setCurrentWorkflow(res.data);
      }
      fetchWorkflows();
    } catch (err) {
      message.error('Vui lòng điền đủ thông tin cấu hình Workflow');
    } finally {
      setLoading(false);
    }
  };

  const addActionNode = () => {
    const newNodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { label: 'Hành động mới (Action)', actionType: 'UPDATE_FIELD' },
      type: 'default'
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    nodeForm.setFieldsValue(node.data);
  };

  const handleSaveNodeConfig = () => {
    if (!selectedNode) return;
    const values = nodeForm.getFieldsValue();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: { ...n.data, ...values, label: values.actionType === 'UPDATE_FIELD' ? 'Cập nhật trường' : 'Gửi Email' }
          };
        }
        return n;
      })
    );
    setSelectedNode(null);
    message.success('Đã lưu cấu hình Node');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Sider width={250} theme="light" style={{ padding: 16, borderRight: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Workflows</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew} size="small" />
        </div>
        <List
          dataSource={workflows}
          renderItem={(item) => (
            <List.Item 
              style={{ 
                cursor: 'pointer', 
                background: currentWorkflow?.id === item.id ? '#e6f4ff' : 'transparent',
                padding: '8px 12px',
                borderRadius: 6
              }}
              onClick={() => handleSelectWorkflow(item)}
            >
              <Text strong>{item.name}</Text>
            </List.Item>
          )}
        />
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Topbar Config */}
        <Card size="small" style={{ margin: 16, marginBottom: 0, borderRadius: 8 }}>
          <Form form={form} layout="inline" style={{ width: '100%' }}>
            <Form.Item name="name" label="Tên Workflow" rules={[{ required: true }]}>
              <Input placeholder="Ví dụ: Gửi email khi duyệt..." />
            </Form.Item>
            <Form.Item name="triggerResource" label="Ứng dụng (App)" rules={[{ required: true }]}>
              <Select style={{ width: 150 }} placeholder="Chọn App">
                {apps.map(app => (
                  <Option key={app.resourceName} value={app.resourceName}>{app.displayName}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="triggerEvent" label="Sự kiện Kích hoạt" rules={[{ required: true }]}>
              <Select style={{ width: 150 }} placeholder="Sự kiện">
                <Option value="ON_CREATE">Khi tạo mới bản ghi</Option>
                <Option value="ON_UPDATE">Khi cập nhật bản ghi</Option>
              </Select>
            </Form.Item>
            <Form.Item style={{ marginLeft: 'auto' }}>
              <Space>
                <Button onClick={addActionNode} icon={<PlusOutlined />}>{t('common.btnAddActionNode', 'Thêm Node Hành động')}</Button>
                <Button type="primary" onClick={handleSave} loading={loading} icon={<SaveOutlined />}>{t('common.btnSaveWorkflow', 'Lưu Workflow')}</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Canvas */}
        <div style={{ flex: 1, margin: 16, background: '#fff', borderRadius: 8, border: '1px solid #d9d9d9' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </Content>

      <Drawer
        title="Cấu hình Node"
        placement="right"
        onClose={() => setSelectedNode(null)}
        open={!!selectedNode}
        width={350}
      >
        {selectedNode && selectedNode.type !== 'input' ? (
          <Form form={nodeForm} layout="vertical">
            <Form.Item name="actionType" label="Loại Hành động" initialValue="UPDATE_FIELD">
              <Select>
                <Option value="UPDATE_FIELD">Cập nhật trường dữ liệu</Option>
                <Option value="SEND_EMAIL">Gửi Email (Log)</Option>
              </Select>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.actionType !== curr.actionType}>
              {({ getFieldValue }) => {
                if (getFieldValue('actionType') === 'UPDATE_FIELD') {
                  return (
                    <>
                      <Form.Item name="targetField" label="Tên trường cần cập nhật" rules={[{ required: true }]}>
                        <Input placeholder="VD: status" />
                      </Form.Item>
                      <Form.Item name="targetValue" label="Giá trị mới" rules={[{ required: true }]}>
                        <Input placeholder="VD: Approved" />
                      </Form.Item>
                    </>
                  );
                }
                if (getFieldValue('actionType') === 'SEND_EMAIL') {
                  return (
                    <Form.Item name="emailTemplate" label="Mẫu Email" rules={[{ required: true }]}>
                      <Input.TextArea rows={4} placeholder="Nội dung email..." />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Button type="primary" onClick={handleSaveNodeConfig} block>{t('common.btnSaveNodeConfig', 'Lưu cấu hình Node')}</Button>
          </Form>
        ) : (
          <Text type="secondary">Node này là Node Trigger, được cấu hình ở thanh menu phía trên.</Text>
        )}
      </Drawer>
    </Layout>
  );
};

export default WorkflowStudio;
