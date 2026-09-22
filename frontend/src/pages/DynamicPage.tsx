import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Spin, Alert } from 'antd';
import DynamicTable from '../components/framework/DynamicTable';
import type { DynamicFieldSchema } from '../components/framework/DynamicForm';

interface ResourceMetadata {
  id: number;
  resourceName: string;
  displayName: string;
  schema: DynamicFieldSchema[];
  uiSchema?: any;
}

const DynamicPage: React.FC = () => {
  const { t } = useTranslation();
  const { resourceName } = useParams<{ resourceName: string }>();
  const [metadata, setMetadata] = useState<ResourceMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!resourceName) return;
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/framework/metadata/${resourceName}`);
        setMetadata(response.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError(`Resource ${resourceName} not found.`);
        } else {
          setError('Failed to load resource metadata.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [resourceName]);

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
  if (error) return <Alert message="Error" description={error} type="error" showIcon style={{ margin: 20 }} />;
  if (!metadata) return null;

  return (
    <div style={{ padding: 24 }}>
      <DynamicTable 
        resourceName={metadata.resourceName} 
        schema={metadata.schema} 
        title={metadata.displayName} 
      />
    </div>
  );
};

export default DynamicPage;
