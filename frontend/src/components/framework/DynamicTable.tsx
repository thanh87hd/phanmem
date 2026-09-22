import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import DynamicForm from './DynamicForm';
import type { DynamicFieldSchema } from './DynamicForm';
import dayjs from 'dayjs';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DynamicTableProps {
  resourceName: string;
  schema: DynamicFieldSchema[];
  title?: string;
}

const DynamicTable: React.FC<DynamicTableProps> = ({ resourceName, schema, title }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // Fetch Data using TanStack Query
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['dynamicData', resourceName],
    queryFn: async () => {
      const response = await axios.get(`/api/framework/data/${resourceName}`);
      return response.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/framework/data/${resourceName}/${id}`);
    },
    onSuccess: () => {
      message.success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['dynamicData', resourceName] });
    },
    onError: () => {
      message.error('Failed to delete record');
    }
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editingRecord) {
        await axios.put(`/api/framework/data/${resourceName}/${editingRecord.id}`, values);
      } else {
        await axios.post(`/api/framework/data/${resourceName}`, values);
      }
    },
    onSuccess: () => {
      message.success(editingRecord ? 'Record updated successfully' : 'Record created successfully');
      setIsModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['dynamicData', resourceName] });
    },
    onError: () => {
      message.error('Failed to save record');
    }
  });

  const handleFormSubmit = (values: any) => {
    const formattedValues = { ...values };
    schema.forEach(field => {
      if (field.type === 'date' && formattedValues[field.name]) {
        formattedValues[field.name] = dayjs(formattedValues[field.name]).format('YYYY-MM-DD');
      }
    });
    submitMutation.mutate(formattedValues);
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
  };

  const openEditModal = (record: any) => {
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  const columns = schema.map((field) => ({
    title: field.label,
    dataIndex: ['data', field.name],
    key: field.name,
    render: (text: any) => {
      if (field.type === 'date') return text ? dayjs(text).format('DD/MM/YYYY') : '';
      if (field.type === 'select') {
         const option = field.options?.find(o => o.value === text);
         return option ? option.label : text;
      }
      return text;
    }
  }));

  columns.push({
    title: 'Actions',
    key: 'actions',
    dataIndex: 'id',
    render: (_: any, record: any) => (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} />
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
      </Space>
    ),
  } as any);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>{title || `Manage ${resourceName}`}</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add New
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingRecord ? 'Edit Record' : 'Add New Record'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <DynamicForm
          schema={schema}
          initialValues={editingRecord?.data}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default DynamicTable;
