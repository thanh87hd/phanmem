import React from 'react';
import { Spin } from 'antd';

export interface HubTabLoadingProps {
  tip?: string;
}

export const HubTabLoading: React.FC<HubTabLoadingProps> = ({ tip = 'Đang tải dữ liệu phân hệ...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        width: '100%',
      }}
    >
      <Spin size="large" tip={tip} />
    </div>
  );
};

export default HubTabLoading;
