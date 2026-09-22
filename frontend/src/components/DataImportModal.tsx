import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Upload, Button, message, Table, Typography, Space, Alert } from 'antd';
import { UploadOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Text } = Typography;

interface DataImportModalProps {
  visible: boolean;
  onCancel: () => void;
  moduleName: string; // e.g., 'audit-engagements', 'users'
  onSuccess?: () => void;
  templateHeaders?: string[]; // Trả về cho export-template nếu tự build FE
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  visible,
  onCancel,
  moduleName,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    errors: any[];
  } | null>(null);

  const handleDownloadTemplate = async () => {
    let templateData: any[] = [];
    switch (moduleName) {
      case 'audit-engagements':
        templateData = [
          {
            'Mã đoàn': 'ENG-2026-TD01',
            'Tên cuộc kiểm toán': 'Kiểm toán Hoạt động Tín dụng & KSNB Chi nhánh Hà Nội',
            'Thuộc kế hoạch năm': 'Kế hoạch Kiểm toán năm 2026',
            'Đơn vị được kiểm toán': 'Chi nhánh Hà Nội Đầu mối',
            'Mã Chi nhánh/PGD': 'CN010',
            'Trưởng đoàn': 'Nguyen Van A',
            'Thành viên đoàn': 'Tran Van B, Le Thi C',
            'Loại cuộc KT': 'Planned',
            'Phòng KTNB phụ trách': 'PKT_DVKD',
            'Mục tiêu kiểm toán': 'Đánh giá tính tuân thủ quy chế tín dụng, an toàn kho quỹ và chất lượng tài sản',
            'Phạm vi kiểm toán': 'Các giao dịch cấp tín dụng, giải ngân, bảo lãnh phát sinh từ 01/01/2025 đến 31/12/2025',
            'Thời gian thực địa từ': '2026-03-01',
            'Thời gian thực địa đến': '2026-03-25',
            'Số quyết định': 'QĐ-KTNB-2026/01',
            'Ngày quyết định': '2026-02-15',
            'Trạng thái': 'Planning',
          },
        ];
        break;
      case 'working-papers':
        templateData = [
          {
            'Mã giấy tờ làm việc': 'WP-TD-2026-001',
            'Tên giấy tờ làm việc': 'Kiểm tra hồ sơ cấp tín dụng khách hàng doanh nghiệp quy mô lớn',
            'Mã cuộc kiểm toán': 'ENG-2026-TD01',
            'Phần hành kiểm toán': 'Tín dụng KHDN',
            'Kiểm toán viên thực hiện': 'Tran Van B',
            'Vùng rủi ro': 'Rủi ro Tín dụng & Định giá TSBĐ',
            'Mục tiêu kiểm tra': 'Đảm bảo hồ sơ vay vốn có đầy đủ phương án kinh doanh, thẩm định TSBĐ hợp lệ',
            'Thủ tục kiểm toán': '1. Thu thập danh mục HĐTD giải ngân trong kỳ; 2. Đối chiếu hợp đồng thế chấp; 3. Kiểm tra thực địa TSBĐ',
            'Phương pháp chọn mẫu': 'Chọn mẫu ngẫu nhiên hệ thống 25 hồ sơ dư nợ trên 5 tỷ đồng',
            'Kết quả kiểm tra': 'Fail',
            'Kết luận KTV': 'Chốt kiểm soát định giá TSBĐ chưa chặt chẽ, phát hiện 02 hồ sơ thiếu chứng thư định giá cập nhật chu kỳ 12 tháng',
            'Trạng thái': 'InProgress',
          },
        ];
        break;
      case 'audit-findings':
        templateData = [
          {
            'Mã phát hiện': 'FD-TD-2026-001',
            'Tiêu đề phát hiện': 'Hồ sơ vay vốn chưa cập nhật lại chứng thư định giá tài sản bảo đảm định kỳ 12 tháng',
            'Mã giấy tờ làm việc': 'WP-TD-2026-001',
            'Mã cuộc kiểm toán': 'ENG-2026-TD01',
            'Mảng nghiệp vụ': 'TD',
            'Quy trình nghiệp vụ': 'Quy trình cấp tín dụng và quản lý tài sản bảo đảm',
            'Mức độ rủi ro': 'High',
            'Mô tả hiện trạng': 'Tại thời điểm kiểm toán ngày 10/03/2026, hồ sơ HĐTD số 2024/08/HĐTD của Công ty CP Đầu tư Đông Á có BĐS thế chấp tại GCN QSDĐ số BD 123456 chưa được định giá lại theo chu kỳ 12 tháng',
            'Cơ sở quy định': 'Khoản 3 Điều 15 Quy định quản lý TSBĐ số 120/2024/QĐ-TGĐ',
            'Nguyên nhân': 'CBTD chưa theo dõi sát sao lịch tái định giá định kỳ trên phần mềm',
            'Hậu quả': 'Tiềm ẩn nguy cơ giá trị thị trường của TSBĐ sụt giảm làm tỷ lệ LTV vượt ngưỡng an toàn',
            'Khuyến nghị': '1. Yêu cầu Chi nhánh liên hệ khách hàng thực hiện định giá lại TSBĐ trước ngày 30/04/2026; 2. Rà soát toàn bộ danh mục TSBĐ đến hạn tái định giá',
            'Số TK / CIF': 'CIF889912',
            'Tên khách hàng': 'Công ty Cổ phần Đầu tư Đông Á',
            'Sản phẩm lỗi': 'Cho vay bổ sung vốn lưu động',
            'Mã Chi nhánh': 'CN010',
            'Cán bộ đề xuất': 'Nguyễn Văn Hùng (CBTD)',
            'Cán bộ thẩm định': 'Trần Thị Lan (CB Thẩm định)',
            'Lãnh đạo phụ trách': 'Phạm Minh Đức (Phó GĐ Chi nhánh)',
            'Ý kiến giải trình': 'Đơn vị thừa nhận thiếu sót và đã gửi thông báo yêu cầu công ty thẩm định giá phối hợp',
            'Trạng thái': 'Open',
          },
        ];
        break;
      case 'users':
      case 'personnel':
        templateData = [
          {
            'Mã nhân viên': 'KTV001',
            'Tên đăng nhập': 'nguyenvana',
            'Họ và tên': 'Nguyễn Văn A',
            'Email': 'nguyenvana@bank.vn',
            'Phòng ban': 'Phòng Kiểm toán Dịch vụ khách hàng',
            'Chức danh': 'KTV',
            'Đội/Tổ': 'PKT_DVKD',
            'Trạng thái': 'Active',
          },
        ];
        break;
      case 'departments':
        templateData = [
          {
            'Mã đơn vị': 'CN010',
            'Tên đơn vị': 'Chi nhánh Hà Nội',
            'Khối/Vùng': 'Khối Khách hàng Cá nhân',
            'Loại đơn vị': 'Chi nhánh cấp 1',
            'Email liên hệ': 'hanoi@bank.vn',
          },
        ];
        break;
      case 'audit-universe':
        templateData = [
          {
            'Mã đối tượng': 'UNIV-CN010',
            'Tên đối tượng kiểm toán': 'Chi nhánh Hà Nội',
            'Loại đối tượng': 'Chi nhánh',
            'Mảng nghiệp vụ': 'Kinh doanh & Tín dụng',
            'Phòng KTNB phụ trách': 'PKT_DVKD',
            'Chu kỳ kiểm toán': '1 năm/lần',
          },
        ];
        break;
      case 'risk-criteria':
        templateData = [
          {
            'Tên tiêu chí': 'Quy mô Dư nợ Tín dụng',
            'Trọng số': 25,
            'Loại tiêu chí': 'Định lượng',
            'Mô tả': 'Đánh giá rủi ro dựa trên tổng dư nợ bình quân trong năm',
          },
        ];
        break;
      case 'risk-assessments':
        templateData = [
          {
            'Mã đơn vị': 'UNIV-CN010',
            'Tên đơn vị': 'Chi nhánh Hà Nội',
            'Năm đánh giá': 2026,
            'Điểm tác động (1-5)': 4,
            'Điểm khả năng (1-5)': 3,
            'Hiệu quả kiểm soát': 'Adequate',
            'Xu hướng rủi ro': 'Stable',
            'Khẩu vị rủi ro': 'Mitigate',
            'Tần suất kiểm toán đề xuất': 'Annual',
          },
        ];
        break;
      case 'risk-control-matrix':
      case 'controls':
        templateData = [
          {
            'Tên quy trình': 'Quy trình Cấp tín dụng KHDN',
            'Quy trình con': 'Thẩm định tài sản bảo đảm',
            'Mục tiêu kinh doanh': 'Đảm bảo tỷ lệ LTV an toàn và TSBĐ đủ tính pháp lý',
            'Tên rủi ro': 'Định giá TSBĐ vượt quá giá trị thực tế',
            'Mô tả rủi ro': 'Thẩm định viên thông đồng hoặc thiếu khảo sát thị trường',
            'Mức độ rủi ro': 'High',
            'Tên chốt kiểm soát': 'Phê duyệt độc lập chứng thư định giá',
            'Mô tả chốt kiểm soát': 'Chứng thư phải do Phòng Định giá độc lập phê duyệt',
            'Loại chốt': 'Preventive',
            'Mức độ tự động hóa': 'Manual',
            'Tần suất': 'Từng hồ sơ',
            'Thủ tục kiểm tra': 'Kiểm tra mẫu 20 chứng thư định giá và biên bản khảo sát',
            'Bằng chứng kỳ vọng': 'Chứng thư định giá có chữ ký phê duyệt hợp lệ',
          },
        ];
        break;
      case 'audit-rules':
      case 'continuous-monitoring':
        templateData = [
          {
            'Rule ID': 'RULE-TD-001',
            'Mảng nghiệp vụ': 'Tín dụng',
            'Tên luật giám sát': 'Cảnh báo khoản vay giải ngân sát hạn mức phê duyệt',
            'Mức độ cảnh báo': 'Đỏ',
            'SLA Xử lý (giờ)': 24,
            'Mô tả rủi ro': 'Có dấu hiệu phân bổ vượt thẩm quyền hoặc đảo nợ',
            'Điều kiện logic': 'Amount >= 0.98 * ApprovedLimit',
          },
        ];
        break;
      default:
        message.warning('Chưa có mẫu template cho module này.');
        return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/import/export-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateData }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${moduleName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Lỗi mạng hoặc server không phản hồi.');
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Vui lòng chọn một file Excel để tải lên.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as any);

    setUploading(true);
    setImportResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/import/${moduleName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setImportResult(data);
        if (data.errors && data.errors.length > 0) {
          message.warning(`Tải lên hoàn tất nhưng có ${data.errors.length} dòng lỗi.`);
        } else {
          message.success('Tải lên toàn bộ dữ liệu thành công!');
          if (onSuccess) onSuccess();
        }
      } else {
        message.error(data.message || 'Lỗi khi tải file lên hệ thống');
      }
    } catch (error: any) {
      message.error('Lỗi mạng hoặc server không phản hồi.');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    },
    beforeUpload: (file) => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('Bạn chỉ có thể tải lên file Excel (.xlsx, .xls)!');
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false; // Prevent automatic upload
    },
    fileList,
  };

  const errorColumns = [
    {
      title: 'Dòng',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
    },
    {
      title: 'Dữ liệu thô (Trích xuất)',
      dataIndex: 'item',
      key: 'item',
      render: (item: any) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {JSON.stringify(item).substring(0, 100)}...
        </Text>
      ),
    },
    {
      title: 'Lỗi phát sinh',
      dataIndex: 'message',
      key: 'message',
      render: (text: string) => <Text type="danger">{text}</Text>,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          Nhập Dữ Liệu Hàng Loạt (Excel)
        </Space>
      }
      open={visible}
      onCancel={() => {
        setFileList([]);
        setImportResult(null);
        onCancel();
      }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Đóng
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          loading={uploading}
          onClick={handleUpload}
          disabled={fileList.length === 0}
        >
          Tiến hành Nhập
        </Button>,
      ]}
      width={700}
    >
      {!importResult ? (
        <div style={{ padding: '20px 0' }}>
          <Alert
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Hướng dẫn</span>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<DownloadOutlined />} 
                  onClick={handleDownloadTemplate}
                  style={{ backgroundColor: '#217346', borderColor: '#217346' }}
                >
                  Tải Template Mẫu
                </Button>
              </div>
            }
            description="Tải file Excel mẫu (.xlsx) với các cột dữ liệu tương ứng. Dữ liệu sẽ được tự động map và báo lỗi nếu có dòng không hợp lệ."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">Kéo thả file vào khu vực này hoặc Click để chọn file</p>
            <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls</p>
          </Upload.Dragger>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <Space size="large" style={{ marginBottom: 20 }}>
            <Statistic title="Tổng số dòng" value={importResult.total} />
            <Statistic
              title="Thành công"
              value={importResult.success}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
            <Statistic
              title="Thất bại (Lỗi)"
              value={importResult.errors.length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Space>

          {importResult.errors.length > 0 && (
            <>
              <Text strong type="danger" style={{ display: 'block', marginBottom: 10 }}>
                Chi tiết các dòng bị lỗi:
              </Text>
              <Table
                dataSource={importResult.errors}
                columns={errorColumns}
                rowKey={(record, index) => index?.toString() || Math.random().toString()}
                size="small"
                pagination={{ pageSize: 5 }}
              />
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

const Statistic = ({ title, value, valueStyle, prefix }: any) => (
  <div style={{ textAlign: 'center', border: '1px solid #f0f0f0', padding: '10px 20px', borderRadius: 8 }}>
    <div style={{ color: '#8c8c8c', fontSize: 13 }}>{title}</div>
    <div style={{ fontSize: 24, fontWeight: 'bold', ...valueStyle }}>
      {prefix && <span style={{ marginRight: 8, fontSize: 20 }}>{prefix}</span>}
      {value}
    </div>
  </div>
);
