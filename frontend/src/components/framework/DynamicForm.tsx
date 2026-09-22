import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, InputNumber, DatePicker, Select, Button, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

export interface DynamicFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'lookup' | 'file' | 'formula';
  required?: boolean;
  options?: { label: string; value: string | number }[];
  targetResource?: string;
  formulaStr?: string;
}

interface DynamicFormProps {
  schema: DynamicFieldSchema[];
  initialValues?: Record<string, any>;
  onSubmit: (values: any) => void;
  onCancel?: () => void;
}

const Base64Upload: React.FC<{ value?: any; onChange?: (val: any) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const fileList = Array.isArray(value) ? value : [];

  const handleBeforeUpload = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const newFile = {
        uid: (file as any).uid || String(Date.now()),
        name: file.name,
        status: 'done',
        url: reader.result as string, // base64 string
      };
      onChange?.([...fileList, newFile]);
    };
    return false; // Prevent default backend upload action
  };

  const handleRemove = (file: any) => {
    const newFileList = fileList.filter((f: any) => f.uid !== file.uid);
    onChange?.(newFileList);
  };

  return (
    <Upload
      listType="text"
      fileList={fileList}
      beforeUpload={handleBeforeUpload}
      onRemove={handleRemove}
    >
      <Button icon={<UploadOutlined />}>{t('common.btnChooseAttachment', 'Chọn tệp đính kèm...')}</Button>
    </Upload>
  );
};

const LookupSelect: React.FC<{ targetResource: string; value?: any; onChange?: (val: any) => void }> = ({ targetResource, value, onChange }) => {
  const [options, setOptions] = useState<{label: string, value: string}[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLookupData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/framework/data/${targetResource}`);
        const opts = res.data.map((item: any) => {
          const dataObj = item.data || {};
          const possibleLabelKeys = ['name', 'title', 'fullName', 'displayName', 'label', 'code'];
          let label = dataObj[Object.keys(dataObj)[0]] || item.id;
          for (const key of possibleLabelKeys) {
            if (dataObj[key]) {
              label = dataObj[key];
              break;
            }
          }
          return { label: String(label), value: item.id };
        });
        setOptions(opts);
      } catch (err) {
        console.error('Failed to fetch lookup data', err);
      } finally {
        setLoading(false);
      }
    };
    if (targetResource) fetchLookupData();
  }, [targetResource]);

  return <Select options={options} loading={loading} value={value} onChange={onChange} allowClear placeholder="Chọn dữ liệu tham chiếu..." showSearch optionFilterProp="label" />;
};

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, initialValues, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      // Handle special formatting for dates if needed
      const formattedValues = { ...initialValues };
      schema.forEach(field => {
        if (field.type === 'date' && formattedValues[field.name]) {
          formattedValues[field.name] = dayjs(formattedValues[field.name]);
        }
      });
      form.setFieldsValue(formattedValues);
    }
  }, [initialValues, schema, form]);

  const renderField = (field: DynamicFieldSchema) => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={`Enter ${field.label}`} />;
      case 'textarea':
        return <Input.TextArea rows={4} placeholder={`Enter ${field.label}`} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={`Enter ${field.label}`} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />;
      case 'select':
        return (
          <Select
            options={field.options || []}
            placeholder={`Select ${field.label}`}
            allowClear
          />
        );
      case 'lookup':
        return <LookupSelect targetResource={field.targetResource || ''} />;
      case 'file':
        return <Base64Upload />;
      case 'formula':
        return <Input disabled placeholder={`Tự động tính: ${field.formulaStr}`} />;
      default:
        return <Input />;
    }
  };

  /**
   * Evaluates mathematical expressions safely using an arithmetic parser.
   * Strictly validates tokens and complies with strict CSP without dynamic code evaluation.
   */
  const safeEvaluateMath = (expr: string): number | null => {
    if (!expr || !/^[0-9+\-*/().\s%]+$/.test(expr)) {
      return null;
    }
    const tokens = expr.match(/\d+(?:\.\d+)?|[+\-*/%()]/g);
    if (!tokens) return null;

    let pos = 0;
    const parsePrimary = (): number => {
      const token = tokens[pos++];
      if (token === '(') {
        const val = parseExpr();
        if (tokens[pos++] !== ')') throw new Error('Unbalanced paren');
        return val;
      }
      if (token === '-' || token === '+') {
        const sign = token === '-' ? -1 : 1;
        return sign * parsePrimary();
      }
      const num = parseFloat(token);
      if (isNaN(num)) throw new Error('Invalid number');
      return num;
    };

    const parseTerm = (): number => {
      let left = parsePrimary();
      while (pos < tokens.length) {
        const op = tokens[pos];
        if (op === '*' || op === '/' || op === '%') {
          pos++;
          const right = parsePrimary();
          if (op === '*') left *= right;
          else if (op === '/') left = right === 0 ? 0 : left / right;
          else if (op === '%') left = right === 0 ? 0 : left % right;
        } else {
          break;
        }
      }
      return left;
    };

    const parseExpr = (): number => {
      let left = parseTerm();
      while (pos < tokens.length) {
        const op = tokens[pos];
        if (op === '+' || op === '-') {
          pos++;
          const right = parseTerm();
          if (op === '+') left += right;
          else left -= right;
        } else {
          break;
        }
      }
      return left;
    };

    try {
      const res = parseExpr();
      if (pos !== tokens.length || isNaN(res) || !isFinite(res)) return null;
      return res;
    } catch {
      return null;
    }
  };

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    // Tìm các trường là formula để tính toán lại
    const updates: Record<string, any> = {};
    let hasUpdates = false;

    schema.forEach(field => {
      if (field.type === 'formula' && field.formulaStr) {
        let expression = field.formulaStr;
        // Lấy danh sách các biến trong ngoặc vuông, vd: [quantity]
        const variables = expression.match(/\[(.*?)\]/g) || [];
        
        variables.forEach(variable => {
          const fieldName = variable.slice(1, -1);
          const val = allValues[fieldName] || 0;
          expression = expression.replace(variable, String(val));
        });

        // Safe mathematical evaluation (CWE-94 prevention)
        const result = safeEvaluateMath(expression);
        if (result !== null && !isNaN(result) && result !== allValues[field.name]) {
          updates[field.name] = result;
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      form.setFieldsValue(updates);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      onValuesChange={handleValuesChange}
    >
      {schema?.map((field) => (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.label}
          rules={[{ required: field.required, message: `Please input ${field.label}!` }]}
        >
          {renderField(field)}
        </Form.Item>
      ))}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            Save
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DynamicForm;
