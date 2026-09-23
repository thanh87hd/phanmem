import React from 'react';
import { Result, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: 24 }}>
      <Result
        status="404"
        title="404 - Không tìm thấy trang"
        subTitle="Đường dẫn bạn truy cập không tồn tại hoặc các module riêng lẻ đã được quy hoạch vào Chu trình Lập kế hoạch Kiểm toán Dựa trên Rủi ro (RBIA)."
        extra={
          <Space>
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
              Về Trang chủ
            </Button>
            <Button
              style={{ borderColor: '#d97706', color: '#d97706' }}
              icon={<SafetyCertificateOutlined />}
              onClick={() => navigate('/risk-and-planning?step=scope')}
            >
              Đến Chu trình Kế hoạch & Rủi ro
            </Button>
          </Space>
        }
      />
    </div>
  );
};

export default NotFound;
