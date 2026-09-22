import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackSubTitle?: string;
  isWidget?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    const isChunkError = /dynamically imported module|loading chunk|failed to fetch/i.test(
      error?.message || ''
    );
    if (isChunkError) {
      const storageKey = 'vite_chunk_reload_timestamp';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();
      // Auto-reload once if not reloaded within the last 15 seconds to fetch latest bundle
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    const isChunkError = /dynamically imported module|loading chunk|failed to fetch/i.test(
      this.state.error?.message || ''
    );
    if (isChunkError) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = /dynamically imported module|loading chunk|failed to fetch/i.test(
        this.state.error?.message || ''
      );

      if (this.props.isWidget) {
        return (
          <div
            style={{
              padding: '16px',
              margin: '8px 0',
              borderRadius: '8px',
              border: '1px dashed #ff4d4f',
              backgroundColor: '#fff2f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cf1322', fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>{this.props.fallbackTitle || 'Không thể hiển thị biểu đồ/thành phần này'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {this.state.error?.message || 'Lỗi xử lý dữ liệu giao diện'}
            </div>
            <Button size="small" icon={<RefreshCw size={14} />} onClick={this.handleReload}>
              {isChunkError ? 'Tải lại trang' : 'Thử lại'}
            </Button>
          </div>
        );
      }

      return (
        <div style={{ padding: '40px 20px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status={isChunkError ? 'warning' : 'error'}
            title={
              isChunkError
                ? 'Hệ thống đã cập nhật phiên bản mới'
                : this.props.fallbackTitle || 'Đã xảy ra lỗi khi tải phân hệ này'
            }
            subTitle={
              isChunkError
                ? 'Trình duyệt đang lưu bản tạm cũ. Vui lòng bấm "Tải lại trang" để nạp ngay phiên bản mới nhất.'
                : this.props.fallbackSubTitle ||
                  this.state.error?.message ||
                  'Hệ thống gặp sự cố không mong muốn trong quá trình kết xuất dữ liệu.'
            }
            extra={[
              <Button type="primary" key="retry" icon={<RefreshCw size={14} />} onClick={this.handleReload}>
                {isChunkError ? 'Tải lại trang (F5)' : 'Thử lại phân hệ'}
              </Button>,
              <Button key="home" onClick={() => (window.location.href = '/')}>
                Về Trang Chủ
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
