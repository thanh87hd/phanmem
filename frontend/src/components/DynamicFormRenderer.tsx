import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, DatePicker, Select, InputNumber, Row, Col, Typography, Checkbox } from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title } = Typography;

interface DynamicFormRendererProps {
  entityType: string;
  initialValues?: Record<string, any>;
  form: any;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ entityType, initialValues, form }) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.get(`/custom-fields?entityType=${entityType}`);
        setFields(res.data);
      } catch (error) {
        console.error('Failed to load custom fields', error);
      }
    };
    fetchFields();
  }, [entityType]);

  useEffect(() => {
    if (fields.some(f => f.type === 'user')) {
      api.get('/users').then(res => setUsers(res.data)).catch(console.error);
    }
  }, [fields]);

  useEffect(() => {
    if (initialValues && initialValues.customFields && fields.length > 0) {
      const formVals: Record<string, any> = {};
      fields.forEach(f => {
        const val = initialValues.customFields[f.name];
        if (val !== undefined && val !== null) {
          if (f.type === 'date') {
            formVals[`cf_${f.name}`] = dayjs(val);
          } else {
            formVals[`cf_${f.name}`] = val;
          }
        }
      });
      form.setFieldsValue(formVals);
    }
  }, [initialValues, fields, form]);

  if (fields.length === 0) return null;

  return (
    <div style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
      <Title level={5} style={{ marginBottom: 16, color: '#0f172a' }}>Thông tin bổ sung</Title>
      <Row gutter={16}>
        {fields.map(f => {
          let inputComponent = <Input placeholder={`Nhập ${f.label.toLowerCase()}`} />;
          if (f.type === 'textarea') inputComponent = <Input.TextArea rows={3} placeholder={`Nhập ${f.label.toLowerCase()}`} />;
          if (f.type === 'number') inputComponent = <InputNumber style={{ width: '100%' }} placeholder={`Nhập ${f.label.toLowerCase()}`} />;
          if (f.type === 'date') inputComponent = <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={`Chọn ${f.label.toLowerCase()}`} />;
          if (f.type === 'select') {
            inputComponent = (
              <Select placeholder={`Chọn ${f.label.toLowerCase()}`}>
                {f.options?.map((opt: any) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            );
          }
          if (f.type === 'multi-select') {
            inputComponent = (
              <Select mode="multiple" placeholder={`Chọn ${f.label.toLowerCase()}`}>
                {f.options?.map((opt: any) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            );
          }
          if (f.type === 'checkbox') {
            inputComponent = <Checkbox>{f.label}</Checkbox>;
          }
          if (f.type === 'file') {
            inputComponent = <Input placeholder="Nhập đường dẫn URL của tệp" />;
          }
          if (f.type === 'user') {
            inputComponent = (
              <Select showSearch optionFilterProp="children" placeholder={`Chọn ${f.label.toLowerCase()}`}>
                {users.map(u => (
                  <Select.Option key={u.id} value={u.id}>{u.fullName}</Select.Option>
                ))}
              </Select>
            );
          }

          let valuePropName = 'value';
          if (f.type === 'checkbox') valuePropName = 'checked';

          return (
            <Col span={12} key={f.name}>
              <Form.Item
                name={`cf_${f.name}`}
                label={f.type === 'checkbox' ? '' : f.label}
                valuePropName={valuePropName}
                rules={[{ required: f.required && f.type !== 'checkbox', message: `Vui lòng nhập ${f.label.toLowerCase()}` }]}
              >
                {inputComponent}
              </Form.Item>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const extractCustomFields = (values: any) => {
  const customFields: Record<string, any> = {};
  Object.keys(values).forEach(key => {
    if (key.startsWith('cf_')) {
      customFields[key.replace('cf_', '')] = values[key];
    }
  });
  return Object.keys(customFields).length > 0 ? customFields : undefined;
};

export default DynamicFormRenderer;
