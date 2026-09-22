import React from 'react';
import { Card, Form, Select, Input, Button, Tag, message } from 'antd';
import type { FormInstance } from 'antd';
import {
  BulbOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

export interface FindingAiCopilotPanelProps {
  form: FormInstance;
  aiSuggestions: any;
  aiLoading: boolean;
  runAICopilot: () => void;
}

export const FindingAiCopilotPanel: React.FC<FindingAiCopilotPanelProps> = ({
  form,
  aiSuggestions,
  aiLoading,
  runAICopilot,
}) => {
  return (
    <div>
      {/* RCA Card */}
      <Card 
        variant="borderless" 
        className="shadow-xs rounded-xl border border-gray-100 mb-6" 
        title={<span style={{ color: '#ea9105', fontWeight: 700 }}>Phân tích Nguyên nhân Gốc rễ (RCA)</span>}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="rootCauseCategory" label="Nhóm Nguyên nhân" rules={[{ required: true, message: 'Vui lòng chọn nhóm nguyên nhân' }]}>
            <Select placeholder="Chọn nhóm" style={{ borderRadius: 8 }}>
              <Option value="Process">Quy trình (Process)</Option>
              <Option value="People">Con người (People)</Option>
              <Option value="System">Hệ thống (System/IT)</Option>
              <Option value="External">Yếu tố bên ngoài (External)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="rootCauseDetails" 
            label={
              <div className="flex justify-between w-full items-center">
                <span>Phân tích chi tiết (5-Whys) <span className="text-red-500">*</span></span>
                {aiSuggestions?.suggestedRca && (
                  <Button 
                    size="small" 
                    type="link" 
                    icon={<BulbOutlined />} 
                    onClick={() => {
                      form.setFieldsValue({ rootCauseDetails: aiSuggestions.suggestedRca });
                      message.success('Đã áp dụng 5-Whys từ AI');
                    }}
                    className="text-amber-600 p-0 font-semibold"
                  >
                    Áp dụng gợi ý
                  </Button>
                )}
              </div>
            } 
            rules={[{ required: true, message: 'Vui lòng phân tích chi tiết 5-whys' }]}
          >
            <TextArea rows={4} placeholder="Sử dụng 5-Whys: Tại sao 1 -> Tại sao 2 -> Tại sao 3..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Card>

      {/* AI Assistant Card */}
      <Card 
        variant="borderless" 
        className="shadow-xs rounded-xl border border-orange-200" 
        style={{ background: 'linear-gradient(to bottom right, #ffffff, #fffdfa)' }}
        title={
          <span className="flex items-center gap-2" style={{ color: '#ea9105', fontWeight: 800 }}>
            <RobotOutlined className="text-lg" /> Trợ lý AI Copilot
          </span>
        }
      >
        {!aiSuggestions && !aiLoading && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-500 text-xl">
              🤖
            </div>
            <p className="text-gray-500 font-medium mb-4 text-xs">
              Hãy nhập nội dung <strong>Hiện trạng (Condition)</strong> ở bên trái và bấm nút để kích hoạt trợ lý AI phân tích tự động.
            </p>
            <Button 
              type="primary" 
              icon={<ThunderboltOutlined />} 
              onClick={runAICopilot}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
            >
              Kích hoạt AI Copilot
            </Button>
          </div>
        )}

        {aiLoading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
            <p className="text-orange-500 font-bold text-xs">AI Copilot đang phân tích dữ liệu...</p>
            <span className="text-[10px] text-gray-400 block mt-1">Rà soát quy chế & các chốt kiểm soát của LPBank</span>
          </div>
        )}

        {aiSuggestions && !aiLoading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2 border-orange-100">
              <span className="text-xs font-bold text-gray-600">Độ tin cậy gợi ý:</span>
              <Tag color="green" className="font-bold">{Math.round((aiSuggestions.confidence || 0.8) * 100)}% Phù hợp</Tag>
            </div>

            {/* Suggestion item: Title */}
            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <strong className="text-[10px] text-gray-500 uppercase">Tiêu đề phát hiện tối ưu:</strong>
                <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                  form.setFieldsValue({ title: aiSuggestions.suggestedTitle });
                  message.success('Đã áp dụng Tiêu đề');
                }}>Áp dụng</Button>
              </div>
              <div className="text-xs text-gray-800 font-semibold">{aiSuggestions.suggestedTitle}</div>
            </div>

            {/* Suggestion item: Risk Level & Root Category */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Mức rủi ro:</span>
                  <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[10px]" onClick={() => {
                    form.setFieldsValue({ riskLevel: aiSuggestions.suggestedRiskLevel });
                  }}>Chọn</Button>
                </div>
                <Tag color={aiSuggestions.suggestedRiskLevel === 'High' ? 'red' : aiSuggestions.suggestedRiskLevel === 'Medium' ? 'orange' : 'green'} className="font-bold text-xs">
                  {aiSuggestions.suggestedRiskLevel}
                </Tag>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Nhóm RCA:</span>
                  <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[10px]" onClick={() => {
                    const rootCategory = aiSuggestions.suggestedCategory === 'Công nghệ' || aiSuggestions.suggestedCategory === 'System' ? 'System' : 
                                         aiSuggestions.suggestedCategory === 'Tài chính' || aiSuggestions.suggestedCategory === 'Process' ? 'Process' : 
                                         aiSuggestions.suggestedCategory === 'Con người' || aiSuggestions.suggestedCategory === 'People' ? 'People' : 
                                         aiSuggestions.suggestedCategory === 'Bên ngoài' || aiSuggestions.suggestedCategory === 'External' ? 'External' : 'Process';
                    form.setFieldsValue({ rootCauseCategory: rootCategory });
                  }}>Chọn</Button>
                </div>
                <span className="text-xs font-bold text-gray-700">{aiSuggestions.suggestedCategory}</span>
              </div>
            </div>

            {/* Regulatory citations */}
            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <strong className="text-[10px] text-gray-500 uppercase">Căn cứ pháp lý gợi ý:</strong>
                <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                  const currentVal = form.getFieldValue('condition') || '';
                  const divider = currentVal ? '\n\n' : '';
                  form.setFieldsValue({ 
                    condition: `${currentVal}${divider}📌 Căn cứ pháp lý liên quan:\n${aiSuggestions.suggestedCriteria}`
                  });
                  message.success('Đã bổ sung Căn cứ pháp lý vào Hiện trạng');
                }}>Bổ sung</Button>
              </div>
              <pre className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap max-h-36 overflow-y-auto border border-gray-100 font-sans">
                {aiSuggestions.suggestedCriteria || 'Không tìm thấy văn bản pháp luật phù hợp.'}
              </pre>
            </div>

            {/* Actions to apply everything */}
            <div className="pt-2 border-t border-orange-100">
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={() => {
                  const rootCategory = aiSuggestions.suggestedCategory === 'Công nghệ' || aiSuggestions.suggestedCategory === 'System' ? 'System' : 
                                       aiSuggestions.suggestedCategory === 'Tài chính' || aiSuggestions.suggestedCategory === 'Process' ? 'Process' : 
                                       aiSuggestions.suggestedCategory === 'Con người' || aiSuggestions.suggestedCategory === 'People' ? 'People' : 
                                       aiSuggestions.suggestedCategory === 'Bên ngoài' || aiSuggestions.suggestedCategory === 'External' ? 'External' : 'Process';
                  const currentVal = form.getFieldValue('condition') || '';
                  const divider = currentVal.includes('Căn cứ pháp lý liên quan') ? '' : (currentVal ? '\n\n' : '');
                  const fullCondition = currentVal.includes('Căn cứ pháp lý liên quan') 
                    ? currentVal 
                    : `${currentVal}${divider}📌 Căn cứ pháp lý liên quan:\n${aiSuggestions.suggestedCriteria}`;
                  
                  form.setFieldsValue({
                    title: aiSuggestions.suggestedTitle,
                    riskLevel: aiSuggestions.suggestedRiskLevel,
                    rootCauseCategory: rootCategory,
                    consequence: aiSuggestions.suggestedConsequence,
                    cause: aiSuggestions.suggestedCause,
                    rootCauseDetails: aiSuggestions.suggestedRca,
                    recommendation: aiSuggestions.suggestedRecommendation,
                    condition: fullCondition
                  });
                  message.success('🌟 Đã áp dụng toàn bộ gợi ý tối ưu từ AI!');
                }}
                className="w-full flex justify-center items-center font-bold text-xs"
                style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', borderRadius: 8, height: '36px' }}
              >
                Áp dụng tất cả gợi ý AI
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
