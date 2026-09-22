import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, InputNumber, Tag, Row, Col, Select, message, Spin, Tabs, Drawer, Badge, Tooltip, Empty, Checkbox, Timeline, Divider, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, SendOutlined, DownloadOutlined, InfoCircleOutlined, AlertOutlined, CloseCircleOutlined, EyeOutlined, CheckOutlined, CloseOutlined, HistoryOutlined, BulbOutlined, RadarChartOutlined, ThunderboltOutlined, ArrowRightOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import api from '../services/api';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { hasPermission } from '../utils/permission';
import { useCurrentUser } from '../utils/useCurrentUser';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import type { AuditUniverse, AuditPlan as AuditPlanType, Department } from '../types';
import { PlanDetailDrawer } from './audit-plan/PlanDetailDrawer';
import { PlanRevisionModal } from './audit-plan/PlanRevisionModal';
import { PlanAiSuggestionsModal } from './audit-plan/PlanAiSuggestionsModal';
import { PlanCreateEditView } from './audit-plan/PlanCreateEditView';
import { PlanApprovalModal } from './audit-plan/PlanApprovalModal';
import BulkImport from '../components/BulkImport';

const { Title, Text } = Typography;
const { Option } = Select;

const AuditPlan: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLegalBannerOpen, setIsLegalBannerOpen] = useState(false);

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'emerald';
    if (status === 'PendingApproval') return 'amber';
    if (status === 'Rejected') return 'rose';
    return 'slate';
  };

  const getStatusText = (status: string) => {
    if (status === 'Approved') return 'Đã phê duyệt';
    if (status === 'PendingApproval') return 'Chờ phê duyệt';
    if (status === 'Rejected') return t('workingPapers.status.Rejected', 'Từ chối');
    return 'Bản nháp';
  };

  const getStatusTagColor = (status: string) => {
    if (status === 'Approved') return 'success';
    if (status === 'PendingApproval') return 'warning';
    if (status === 'Rejected') return 'error';
    return 'default';
  };

  const isLowRisk = (level: string) => {
    if (!level || level === 'Unassessed' || level === 'Chưa đánh giá') return false;
    const lvl = level.toLowerCase();
    return lvl === 'low' || lvl.includes(t('auditPlan.short', 'thấp')) || lvl.includes(t('auditPlan.2ndClass', 'hạng 2')) || lvl.includes(t('auditPlan.rank1', 'hạng 1'));
  };

  const currentUser = useCurrentUser();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals and Drawer state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<any>(null);
  
  // Plan Review Cycle state
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewPlan, setReviewPlan] = useState<any>(null);
  const [reviewPeriod, setReviewPeriod] = useState(t('auditPlan.midyearReview', 'Đánh giá Giữa năm'));
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSelectedUnits, setReviewSelectedUnits] = useState<any[]>([]);
  const [removedUnitsLog, setRemovedUnitsLog] = useState<Record<number, { reason: string; nextPeriodPriority: boolean }>>({});
  const [addedReasons, setAddedReasons] = useState<Record<number, string>>({});
  const [updateReasons, setUpdateReasons] = useState<Record<number, string>>({});
  const [reviewTabSearch, setReviewTabSearch] = useState('');

  // Approval modal state
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [approvalRecordId, setApprovalRecordId] = useState<number | null>(null);
  const [approvalForm] = Form.useForm();

  // Audit Universe and Selection state
  const [universeList, setUniverseList] = useState<any[]>([]);
  const [universeLoading, setUniverseLoading] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);
  const [universeSearch, setUniverseSearch] = useState('');
  const [activeUniverseTab, setActiveUniverseTab] = useState('All');
  
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [filterRiskRating, setFilterRiskRating] = useState<string | undefined>(undefined);
  const [uncoveredHighRiskUnits, setUncoveredHighRiskUnits] = useState<any[]>([]);
  const planYear = Form.useWatch('year', form) || new Date().getFullYear();

  useEffect(() => {
    api.get('/users').then(res => setUsersList(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isModalVisible && planYear) {
      fetchUniverseList(planYear);
      api.get(`/audit-plans/risk-coverage?year=${planYear}`)
        .then(res => {
          setUncoveredHighRiskUnits(res.data?.uncoveredUnits || []);
        })
        .catch(err => {
          console.error('Failed to load risk coverage suggestions:', err);
          setUncoveredHighRiskUnits([]);
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUncoveredHighRiskUnits([]);
    }
  }, [isModalVisible, planYear]);

  // Fetch plans
  const fetchAuditPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-plans');
      setData(response.data || []);
    } catch (error) {
      message.error('Lỗi khi tải danh sách kế hoạch');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit universe list with actual risk assessments
  const fetchUniverseList = async (year?: number) => {
    setUniverseLoading(true);
    try {
      const targetYear = year || planYear || new Date().getFullYear();
      const response = await api.get(`/audit-plans/universe-with-risk?year=${targetYear}`);
      setUniverseList(response.data || []);
    } catch (error) {
      console.error('Failed to load audit universe with risk');
      try {
        const fallback = await api.get('/audit-universe');
        setUniverseList(fallback.data || []);
      } catch {
        message.error(t('auditPlan.errorLoadingAuditUniverseList', 'Lỗi khi tải danh sách Audit Universe'));
      }
    } finally {
      setUniverseLoading(false);
    }
  };

  // Continuous Monitoring Recommendations for Audit Plan
  const [cmPlanModalVisible, setCmPlanModalVisible] = useState(false);
  const [cmRecommendations, setCmRecommendations] = useState<any[]>([]);
  const [cmLoading, setCmLoading] = useState(false);

  const fetchCmRecommendations = async () => {
    setCmLoading(true);
    try {
      const res = await api.get('/continuous-monitoring/planning-recommendations');
      setCmRecommendations(res.data || []);
      setCmPlanModalVisible(true);
    } catch {
      message.error('Không thể tải đề xuất từ Giám sát liên tục');
    } finally {
      setCmLoading(false);
    }
  };

  // 1-Click apply recommendation from Continuous Monitoring to plan
  const applyCmRecommendationToPlan = (rec: any) => {
    // Tìm Universe tương ứng theo tên hoặc mã
    const match = universeList.find(u => 
      u.name?.toLowerCase().includes(rec.name?.toLowerCase()) || 
      (u.department && rec.name && u.department.toLowerCase().includes(rec.name.toLowerCase()))
    );

    const universeId = match ? match.id : Date.now();
    const alreadySelected = selectedUnits.some(u => u.universeId === universeId || u.name === rec.name);

    if (alreadySelected) {
      message.warning(`Đơn vị / Quy trình "${rec.name}" đã có trong kế hoạch.`);
      return;
    }

    const justificationText = `Được hệ thống Giám sát liên tục phát hiện có mức độ rủi ro ${rec.recommendedPriority}: ${rec.reasons?.join(', ')}`;
    const newUnit = {
      universeId: universeId,
      name: match ? match.name : rec.name,
      riskLevel: rec.recommendedPriority === 'Critical' ? 'Critical' : rec.recommendedPriority === 'High' ? 'High' : 'Medium',
      justification: justificationText,
      estDays: rec.recommendedPriority === 'Critical' ? 20 : 15,
      ktvCount: rec.recommendedPriority === 'Critical' ? 4 : 3,
    };

    setSelectedUnits(prev => [...prev, newUnit]);
    message.success(`Đã thêm "${rec.name}" vào Kế hoạch kiểm toán từ gợi ý Giám sát liên tục!`);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAuditPlans();
    fetchUniverseList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update a field in selectedUnits (e.g. estDays, ktvCount, justification)
  const updateUnitField = (universeId: number, field: string, value: any) => {
    setSelectedUnits(prev => prev.map(item => {
      if (item.universeId === universeId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setSelectedUnits([]);
    setUniverseSearch('');
    fetchUniverseList();
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setSelectedUnits(record.selectedUnits || []);
    setUniverseSearch('');
    fetchUniverseList();
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleView = (record: any) => {
    setSelectedPlanDetails(record);
    setIsDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/audit-plans/${id}`);
      message.success('Đã xóa kế hoạch kiểm toán năm');
      fetchAuditPlans();
    } catch (error) {
      message.error('Lỗi khi xóa kế hoạch');
    }
  };

  // Submit plan validation and request
  const handleSubmitPlan = async (record: any) => {
    // Validate justifications in frontend for better UX
    const units = record.selectedUnits || [];
    const missingJustifications = units.filter((u: any) => isLowRisk(u.riskLevel) && (!u.justification || u.justification.trim() === ''));

    if (missingJustifications.length > 0) {
      Modal.error({
        title: 'Không thể trình duyệt kế hoạch!',
        content: (
          <div>
            <p>Có <strong>{missingJustifications.length} đối tượng rủi ro thấp</strong> chưa được nhập lý do giải trình lý do lựa chọn:</p>
            <ul className="list-disc pl-4 mt-2 text-rose-600 font-semibold">
              {missingJustifications.map((mj: any) => (
                <li key={mj.universeId}>{mj.name}</li>
              ))}
            </ul>
            <p className="mt-4">Vui lòng chỉnh sửa kế hoạch và điền đầy đủ giải trình rủi ro thấp trước khi thực hiện trình duyệt.</p>
          </div>
        ),
        okText: 'Đã hiểu',
      });
      return;
    }

    try {
      await api.post(`/audit-plans/${record.id}/submit`);
      message.success('Đã trình duyệt kế hoạch kiểm toán thành công');
      fetchAuditPlans();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditPlan.errorWhenSubmittingPlan', 'Lỗi khi trình duyệt kế hoạch'));
    }
  };

  // Open Approval modal
  const openApprovalModal = (id: number, type: 'approve' | 'reject') => {
    setApprovalRecordId(id);
    setApprovalType(type);
    approvalForm.resetFields();
    setIsApprovalModalVisible(true);
  };

  // Handle Approve or Reject execution
  const handleApprovalSubmit = async () => {
    if (!approvalRecordId) return;
    try {
      const values = await approvalForm.validateFields();
      const endpoint = approvalType === 'approve' ? 'approve' : 'reject';
      
      await api.post(`/audit-plans/${approvalRecordId}/${endpoint}`, {
        notes: values.notes,
      });

      message.success(approvalType === 'approve' ? 'Phê duyệt kế hoạch thành công' : 'Đã từ chối kế hoạch');
      setIsApprovalModalVisible(false);
      fetchAuditPlans();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditPlan.theApprovalOperationFailed', 'Thao tác phê duyệt thất bại'));
    }
  };

  // Save/Update plan
  const handleModalOk = () => {
    form.validateFields().then(async values => {
      // Form payload
      const payload = {
        ...values,
        selectedUnits: selectedUnits,
        customFields: extractCustomFields(values),
      };

      try {
        if (editingRecord) {
          await api.patch(`/audit-plans/${editingRecord.id}`, payload);
          message.success('Cập nhật kế hoạch kiểm toán thành công');
        } else {
          await api.post('/audit-plans', {
            ...payload,
            status: 'Draft',
          });
          message.success('Tạo mới kế hoạch kiểm toán thành công');
        }
        setIsModalVisible(false);
        fetchAuditPlans();
      } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message.error((error as any).response?.data?.message || t('auditPlan.errorSavingPlan', 'Lỗi khi lưu kế hoạch'));
      }
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  // Start plan review cycle
  const handleStartReview = (record: any) => {
    setReviewPlan(record);
    setReviewPeriod(t('auditPlan.midyearReview', 'Đánh giá Giữa năm'));
    setReviewNotes('');
    setReviewSelectedUnits(JSON.parse(JSON.stringify(record.selectedUnits || [])));
    setRemovedUnitsLog({});
    setAddedReasons({});
    setUpdateReasons({});
    setReviewTabSearch('');
    fetchUniverseList();
    setIsReviewModalVisible(true);
  };

  // Add a unit from Universe to the revision list
  const handleAddUnitToRevision = (unit: any) => {
    const exists = reviewSelectedUnits.some(u => u.universeId === unit.id);
    if (exists) {
      message.warning(t('auditPlan.thisProcedureIsAlreadyInThe', 'Quy trình này đã có trong danh sách kế hoạch.'));
      return;
    }

    const newUnit = {
      universeId: unit.id,
      name: unit.name,
      riskLevel: unit.dynamicRiskRating || 'Low',
      justification: unit.priorityReason || t('auditPlan.addedInPlanReview', 'Bổ sung trong đợt review kế hoạch'),
      estDays: 10,
      ktvCount: 3,
    };

    setReviewSelectedUnits(prev => [...prev, newUnit]);
    setAddedReasons(prev => ({
      ...prev,
      [unit.id]: t('auditPlan.supplementAndSupplementAccordingToReview', 'Bổ sung bổ túc theo nhu cầu rà soát')
    }));
    message.success(`Đã thêm quy trình "${unit.name}" vào danh sách rà soát`);
  };

  // Mark a unit for removal in the revision workspace
  const handleRemoveUnitFromRevision = (universeId: number, name: string) => {
    // Save to removed list log
    setRemovedUnitsLog(prev => ({
      ...prev,
      [universeId]: {
        reason: t('auditPlan.changeTheUnitsAuditPlan', 'Thay đổi kế hoạch kiểm toán của đơn vị'),
        nextPeriodPriority: true // Default to prioritize next period
      }
    }));
    // Remove from active list
    setReviewSelectedUnits(prev => prev.filter(u => u.universeId !== universeId));
    message.info(`Đã tạm loại bỏ "${name}" khỏi kế hoạch hiện tại (Vui lòng điền lý do ở mục Thay đổi)`);
  };

  // Update a field in the review selected list
  const handleUpdateReviewUnitField = (universeId: number, field: string, value: any) => {
    setReviewSelectedUnits(prev => prev.map(item => {
      if (item.universeId === universeId) {
        return { ...item, [field]: value };
      }
      return item;
    }));

    // Mark as updated and ask for reason if not already recorded
    if (!updateReasons[universeId]) {
      setUpdateReasons(prev => ({
        ...prev,
        [universeId]: t('auditPlan.adjustingManpowerResourcesfieldTechnicians', 'Điều chỉnh định biên nguồn lực ngày công / KTV thực địa')
      }));
    }
  };

  // Calculate review diff changes and submit to backend
  const handleReviewOk = async () => {
    if (!reviewPeriod || reviewPeriod.trim() === '') {
      message.error('Vui lòng chọn hoặc điền tên kỳ review');
      return;
    }

    const originalUnits = reviewPlan.selectedUnits || [];
    const changedUnits: any[] = [];

    // 1. ADDED
    reviewSelectedUnits.forEach(u => {
      const isNew = !originalUnits.some((ou: any) => ou.universeId === u.universeId);
      if (isNew) {
        changedUnits.push({
          universeId: u.universeId,
          name: u.name,
          action: 'ADD',
          reason: addedReasons[u.universeId] || t('auditPlan.addNewAuditProcess', 'Bổ sung quy trình kiểm toán mới'),
          nextPeriodPriority: false,
          newValues: { estDays: u.estDays, ktvCount: u.ktvCount }
        });
      }
    });

    // 2. REMOVED
    originalUnits.forEach((ou: any) => {
      const isRemoved = !reviewSelectedUnits.some(u => u.universeId === ou.universeId);
      if (isRemoved) {
        const log = removedUnitsLog[ou.universeId] || { reason: t('auditPlan.review.defaultPostponeReason', 'Hoãn kiểm toán đơn vị'), nextPeriodPriority: true };
        changedUnits.push({
          universeId: ou.universeId,
          name: ou.name,
          action: 'REMOVE',
          reason: log.reason,
          nextPeriodPriority: log.nextPeriodPriority,
          oldValues: { estDays: ou.estDays, ktvCount: ou.ktvCount }
        });
      }
    });

    // 3. UPDATED
    reviewSelectedUnits.forEach(u => {
      const original = originalUnits.find((ou: any) => ou.universeId === u.universeId);
      if (original) {
        const isDifferent = original.estDays !== u.estDays || original.ktvCount !== u.ktvCount;
        if (isDifferent) {
          changedUnits.push({
            universeId: u.universeId,
            name: u.name,
            action: 'UPDATE',
            reason: updateReasons[u.universeId] || t('auditPlan.adjustResourceQuantity', 'Điều chỉnh định lượng nguồn lực'),
            nextPeriodPriority: false,
            oldValues: { estDays: original.estDays, ktvCount: original.ktvCount },
            newValues: { estDays: u.estDays, ktvCount: u.ktvCount }
          });
        }
      }
    });

    if (changedUnits.length === 0) {
      message.warning('Không có thay đổi nào so với kế hoạch ban đầu.');
      return;
    }

    // Payload
    const payload = {
      reviewPeriod,
      notes: reviewNotes,
      changedUnits
    };

    try {
      await api.post(`/audit-plans/${reviewPlan.id}/revisions`, payload);
      message.success('Đã lưu kỳ review và điều chỉnh kế hoạch năm thành công');
      setIsReviewModalVisible(false);
      fetchAuditPlans();
      fetchUniverseList(); // reload priorities in universe
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditPlan.errorWhileSavingReviewPeriod', 'Gặp lỗi khi lưu kỳ review'));
    }
  };

  // Summary Metrics calculations
  const totalUnits = selectedUnits.length;
  const totalEstDays = selectedUnits.reduce((sum, u) => sum + (Number(u.estDays) || 0), 0);
  const totalKtvCount = selectedUnits.reduce((sum, u) => sum + (Number(u.ktvCount) || 0), 0);

  // Filter universe list by search term and active tab category and risk rating
  const filteredUniverse = universeList.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(universeSearch.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(universeSearch.toLowerCase())) ||
      (u.auditCategory && u.auditCategory.toLowerCase().includes(universeSearch.toLowerCase()));
      
    const matchesCategory = activeUniverseTab === 'All' || u.auditCategory === activeUniverseTab;
    
    let matchesRisk = true;
    if (filterRiskRating) {
      const lvl = (u.dynamicRiskRating || '').toLowerCase();
      if (filterRiskRating === 'High') {
        matchesRisk = lvl.includes('high') || lvl.includes('critical') || lvl.includes(t('auditPlan.weak', 'yếu')) || lvl.includes(t('auditPlan.least', 'kém')) || lvl.includes(t('auditPlan.4thPlace', 'hạng 4')) || lvl.includes(t('auditPlan.rank5', 'hạng 5'));
      } else if (filterRiskRating === 'Medium') {
        matchesRisk = lvl.includes('medium') || lvl.includes(t('auditPlan.medium', 'trung bình')) || lvl.includes(t('auditPlan.3rdClass', 'hạng 3'));
      } else if (filterRiskRating === 'Low') {
        matchesRisk = lvl === 'low' || lvl.includes(t('auditPlan.short', 'thấp')) || lvl.includes(t('auditPlan.rank1', 'hạng 1')) || lvl.includes(t('auditPlan.2ndClass', 'hạng 2'));
      }
    }
    
    return matchesSearch && matchesCategory && matchesRisk;
  });

  const getMetricsByCategory = (cat: string) => {
    const unitsInCat = selectedUnits.filter(u => {
      const univ = universeList.find(x => x.id === u.universeId);
      return univ?.auditCategory === cat;
    });
    return {
      count: unitsInCat.length,
      days: unitsInCat.reduce((sum, u) => sum + (Number(u.estDays) || 0), 0),
      ktvs: unitsInCat.reduce((sum, u) => sum + (Number(u.ktvCount) || 0), 0),
    };
  };

  // Filter universe list for review workspace tab
  const filteredUniverseForReview = universeList.filter(u => 
    !reviewSelectedUnits.some(r => r.universeId === u.id) &&
    ((u.name && u.name.toLowerCase().includes(reviewTabSearch.toLowerCase())) ||
     (u.department && u.department.toLowerCase().includes(reviewTabSearch.toLowerCase())))
  );

  // Table row selection setup for Universe selection (Fix multi-select across tabs & pagination)
  const universeRowSelection: any = {
    selectedRowKeys: selectedUnits.map(u => u.universeId),
    preserveSelectedRowKeys: true,
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
      // 1. Giữ lại các selectedUnits có ID nằm trong selectedRowKeys
      const keySet = new Set(selectedRowKeys.map(k => Number(k)));
      const keptUnits = selectedUnits.filter(u => keySet.has(u.universeId));
      const existingKeySet = new Set(keptUnits.map(u => u.universeId));

      // 2. Thêm các key mới được chọn
      const newlyAddedKeys = selectedRowKeys.filter(k => !existingKeySet.has(Number(k)));
      const newItems = newlyAddedKeys.map(key => {
        const row = universeList.find(u => u.id === Number(key));
        return {
          universeId: Number(key),
          name: row?.name || 'Unknown',
          riskLevel: row?.dynamicRiskRating || 'Low',
          justification: '',
          estDays: 10,
          ktvCount: 3,
        };
      });

      setSelectedUnits([...keptUnits, ...newItems]);
    }
  };

  // Smart suggestions panel list
  const prioritizedSuggestions = universeList.filter(u => 
    u.planningPriority === 'Prioritized' && 
    !selectedUnits.some(su => su.universeId === u.id)
  );

  // Main table column definition
  const columns = [
    {
      title: t('auditPlan.cols.year', 'Năm'),
      dataIndex: 'year',
      key: 'year',
      width: '8%',
      render: (year: number) => <Text className="font-bold text-gray-800 text-base">{year}</Text>
    },
    {
      title: t('auditPlan.cols.name', 'Tên Kế hoạch'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space orientation="vertical" size={1}>
          <Text className="font-semibold text-blue-800 text-sm hover:underline cursor-pointer" onClick={() => handleView(record)}>
            {name}
          </Text>
          <Text type="secondary" className="text-xs">
            Tổng số quy trình: {record.selectedUnits?.length || 0} | Tổng ngày công: {record.selectedUnits?.reduce((sum: number, u: any) => sum + (u.estDays || 0), 0) || 0}
            {record.revisionCount > 0 && (
              <span className="ml-2 text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                ⚠️ {record.revisionCount} Lần yêu cầu sửa đổi (KPI)
              </span>
            )}
            {record.revisions && record.revisions.length > 0 && (
              <span className="ml-2 text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                <HistoryOutlined /> {record.revisions.length} Đợt điều chỉnh
              </span>
            )}
          </Text>
        </Space>
      )
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status: string) => (
        <Tag color={getStatusTagColor(status)} className="px-3 py-1 font-semibold rounded-md border-0 uppercase tracking-wider text-xs">
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Ý kiến phê duyệt',
      dataIndex: 'approvalNotes',
      key: 'approvalNotes',
      width: '20%',
      render: (notes: string) => notes ? (
        <Tooltip title={notes}>
          <Text className="text-gray-600 block truncate max-w-[180px]" type="secondary">
            {notes}
          </Text>
        </Tooltip>
      ) : <Text type="secondary" className="italic">—</Text>
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: '37%',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            className="text-slate-600 hover:bg-slate-50 rounded-lg"
            onClick={() => handleView(record)}
          >
            Xem
          </Button>

          {record.status === 'Approved' && hasPermission(currentUser, 'plan:create') && (
            <>
              <Button 
                type="text" 
                icon={<ThunderboltOutlined />} 
                className="text-emerald-600 hover:bg-emerald-50 rounded-lg font-semibold"
                onClick={async () => {
                  try {
                    const res = await api.post(`/audit-plans/${record.id}/decompose`);
                    message.success(res.data?.message || 'Đã phân rã thành các đoàn kiểm toán thành công!');
                  } catch (err: any) {
                    message.error(err.response?.data?.message || 'Lỗi khi phân rã kế hoạch thành các đoàn');
                  }
                }}
              >
                ⚡ Khởi tạo Đoàn KT
              </Button>
              <Button 
                type="primary" 
                size="small"
                icon={<ArrowRightOutlined />} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs text-xs px-2.5 h-7"
                onClick={() => navigate('/audit-engagements', { state: { planId: record.id, planName: record.name } })}
              >
                Đến Đoàn KT →
              </Button>
              <Button 
                type="text" 
                icon={<HistoryOutlined />} 
                className="text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold"
                onClick={() => handleStartReview(record)}
              >
                Review & Điều chỉnh
              </Button>
            </>
          )}

          {record.status === 'Draft' && hasPermission(currentUser, 'plan:create') && (
            <Button 
              type="text" 
              icon={<SendOutlined />} 
              className="text-amber-600 hover:bg-amber-50 rounded-lg" 
              onClick={() => handleSubmitPlan(record)}
            >
              {t('auditPlan.actions.submit', 'Trình duyệt')}
            </Button>
          )}

          {record.status === 'PendingApproval' && hasPermission(currentUser, 'plan:approve') && (
            <>
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />} 
                className="text-emerald-500 hover:bg-emerald-50 rounded-lg font-semibold" 
                onClick={() => openApprovalModal(record.id, 'approve')}
              >
                Duyệt
              </Button>
              <Button 
                type="text" 
                icon={<CloseCircleOutlined />} 
                danger 
                className="hover:bg-rose-50 rounded-lg font-semibold" 
                onClick={() => openApprovalModal(record.id, 'reject')}
              >
                {t('workingPapers.status.Rejected', 'Từ chối')}
              </Button>
            </>
          )}

          {record.status !== 'Approved' && hasPermission(currentUser, 'plan:create') && (
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              className="text-blue-500 hover:bg-blue-50 rounded-lg" 
              onClick={() => handleEdit(record)} 
            />
          )}

          {hasPermission(currentUser, 'plan:approve') && (
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              danger 
              className="hover:bg-rose-50 rounded-lg" 
              onClick={() => handleDelete(record.id)} 
            />
          )}
        </Space>
      ),
    },
  ];

  const filteredData = data.filter((item: any) => filterRecursive(item, searchText));

  const handleExportExcel = async () => {
    if (!filteredData || filteredData.length === 0) {
      message.warning('Không có dữ liệu kế hoạch để xuất Excel');
      return;
    }

    const exportRows: any[] = [];

    filteredData.forEach((plan: any) => {
      const units = plan.selectedUnits;
      if (Array.isArray(units) && units.length > 0) {
        units.forEach((unit: any, idx: number) => {
          const monthStr = unit.scheduledMonth
            ? `Tháng ${unit.scheduledMonth < 10 ? '0' : ''}${unit.scheduledMonth}`
            : '';
          const quarterStr =
            unit.targetQuarter ||
            (unit.scheduledMonth ? `Q${Math.ceil(unit.scheduledMonth / 3)}` : 'Q1');

          exportRows.push({
            'Năm kế hoạch': plan.year,
            'Tên kế hoạch': plan.name,
            'Phòng KTNB phụ trách': plan.ownerTeam || 'Toàn khối',
            'Mã đối tượng KT': unit.universeId || idx + 1,
            'Tên đối tượng / Quy trình kiểm toán': unit.name || '',
            'Phân loại': unit.auditCategory || '',
            'Mức độ rủi ro': unit.riskLevel || 'Chưa đánh giá',
            'Quý dự kiến': quarterStr,
            'Tháng dự kiến': monthStr,
            'Ngày công dự kiến': Number(unit.estDays) || 0,
            'Số lượng KTV': Number(unit.ktvCount) || 0,
            'Trưởng đoàn dự kiến': unit.leadAuditorName || '',
            'Căn cứ / Giải trình lựa chọn': unit.justification || '',
            'Trạng thái kế hoạch': getStatusText(plan.status),
            'Ý kiến phê duyệt': plan.approvalNotes || '',
          });
        });
      } else {
        exportRows.push({
          'Năm kế hoạch': plan.year,
          'Tên kế hoạch': plan.name,
          'Phòng KTNB phụ trách': plan.ownerTeam || 'Toàn khối',
          'Mã đối tượng KT': '',
          'Tên đối tượng / Quy trình kiểm toán': 'Chưa chọn đối tượng',
          'Phân loại': '',
          'Mức độ rủi ro': '',
          'Quý dự kiến': '',
          'Tháng dự kiến': '',
          'Ngày công dự kiến': 0,
          'Số lượng KTV': 0,
          'Trưởng đoàn dự kiến': '',
          'Căn cứ / Giải trình lựa chọn': '',
          'Trạng thái kế hoạch': getStatusText(plan.status),
          'Ý kiến phê duyệt': plan.approvalNotes || '',
        });
      }
    });

    try {
      const response = await api.post(
        '/import/export-template',
        { templateData: exportRows },
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Ke_Hoach_Kiem_Toan_Nam_Chi_Tiet_${new Date().getFullYear()}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      message.success(
        `Đã xuất ${exportRows.length} dòng chi tiết kế hoạch năm ra Excel thành công!`,
      );
    } catch (err) {
      message.error('Lỗi khi xuất file Excel');
    }
  };

  const auditPlanTemplateData = [
    {
      'Năm kế hoạch': 2026,
      'Tên kế hoạch': 'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Phòng KTNB phụ trách': 'Toàn khối',
      'Mã đối tượng KT': 'CN-TB',
      'Tên đối tượng / Quy trình kiểm toán':
        'Chi nhánh Thái Bình - Hoạt động Tín dụng & Huy động',
      'Phân loại': 'ChiNhanh',
      'Mức độ rủi ro': 'Hạng 4 (Cao)',
      'Quý dự kiến': 'Q1',
      'Tháng dự kiến': 'Tháng 03',
      'Ngày công dự kiến': 15,
      'Số lượng KTV': 4,
      'Trưởng đoàn dự kiến': 'Nguyễn Văn Kiểm',
      'Căn cứ / Giải trình lựa chọn':
        'Dư nợ tín dụng tăng trưởng nhanh > 35%, quá 2 năm chưa kiểm toán toàn diện theo QC 3001',
      'Trạng thái kế hoạch': 'Bản nháp',
      'Ý kiến phê duyệt': '',
    },
    {
      'Năm kế hoạch': 2026,
      'Tên kế hoạch': 'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Phòng KTNB phụ trách': 'Toàn khối',
      'Mã đối tượng KT': 'IT-SEC',
      'Tên đối tượng / Quy trình kiểm toán':
        'Khối CNTT - Quản lý An toàn thông tin & Ngân hàng số',
      'Phân loại': 'HeThong',
      'Mức độ rủi ro': 'Hạng 5 (Rất cao)',
      'Quý dự kiến': 'Q2',
      'Tháng dự kiến': 'Tháng 05',
      'Ngày công dự kiến': 20,
      'Số lượng KTV': 3,
      'Trưởng đoàn dự kiến': 'Trần Công Nghệ',
      'Căn cứ / Giải trình lựa chọn':
        'Hệ thống trọng yếu ngân hàng số, bắt buộc kiểm toán hàng năm theo Thông tư 09/2020/TT-NHNN',
      'Trạng thái kế hoạch': 'Bản nháp',
      'Ý kiến phê duyệt': '',
    },
    {
      'Năm kế hoạch': 2026,
      'Tên kế hoạch': 'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Phòng KTNB phụ trách': 'Toàn khối',
      'Mã đối tượng KT': 'CN-TNA',
      'Tên đối tượng / Quy trình kiểm toán':
        'Chi nhánh Tây Nghệ An - Nghiệp vụ Tín dụng & Quản lý nợ',
      'Phân loại': 'ChiNhanh',
      'Mức độ rủi ro': 'Hạng 3 (Trung bình)',
      'Quý dự kiến': 'Q3',
      'Tháng dự kiến': 'Tháng 08',
      'Ngày công dự kiến': 12,
      'Số lượng KTV': 3,
      'Trưởng đoàn dự kiến': 'Lê Thị Thu',
      'Căn cứ / Giải trình lựa chọn':
        'Đến hạn kiểm toán định kỳ 2 năm, có biến động Giám đốc chi nhánh',
      'Trạng thái kế hoạch': 'Bản nháp',
      'Ý kiến phê duyệt': '',
    },
    {
      'Năm kế hoạch': 2026,
      'Tên kế hoạch': 'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Phòng KTNB phụ trách': 'Toàn khối',
      'Mã đối tượng KT': 'HS-TC',
      'Tên đối tượng / Quy trình kiểm toán':
        'Khối Tài chính Kế toán - Quản lý Chi phí hoạt động & Mua sắm',
      'Phân loại': 'HoiSo',
      'Mức độ rủi ro': 'Hạng 2 (Thấp)',
      'Quý dự kiến': 'Q4',
      'Tháng dự kiến': 'Tháng 11',
      'Ngày công dự kiến': 10,
      'Số lượng KTV': 2,
      'Trưởng đoàn dự kiến': 'Phạm Kế Toán',
      'Căn cứ / Giải trình lựa chọn':
        'Rủi ro thấp nhưng cần kiểm tra tính tuân thủ quy chế tài chính và chi phí tập trung theo chỉ đạo BKS',
      'Trạng thái kế hoạch': 'Bản nháp',
      'Ý kiến phê duyệt': '',
    },
  ];

  // Risk Rating tag helper
  const renderRiskTag = (risk: string) => {
    if (!risk || risk === 'Unassessed' || risk === 'Chưa đánh giá') {
      return (
        <Tag color="default" className="font-medium text-slate-500 bg-slate-50 border-slate-200">
          Chưa đánh giá
        </Tag>
      );
    }
    const isLow = isLowRisk(risk);
    const isMed = risk?.toLowerCase().includes('medium') || risk?.includes('Trung') || risk?.includes('Hạng 3');
    const color = isLow ? 'blue' : (isMed ? 'orange' : 'red');
    const label = isLow ? [t('auditPlan.tabs2.filterRisk.low', 'Thấp')] : (isMed ? [t('auditPlan.tabs2.filterRisk.medium', 'Trung bình')] : 'Cao');
    return <Tag color={color} className="font-semibold">{risk.includes('Hạng') ? risk : label}</Tag>;
  };

  if (isModalVisible) {
    return (
      <PlanCreateEditView
        editingRecord={editingRecord}
        onClose={() => setIsModalVisible(false)}
        onSave={handleModalOk}
        form={form}
        totalUnits={totalUnits}
        totalEstDays={totalEstDays}
        totalKtvCount={totalKtvCount}
        uncoveredHighRiskUnits={uncoveredHighRiskUnits}
        setUncoveredHighRiskUnits={setUncoveredHighRiskUnits}
        planYear={planYear}
        setSelectedUnits={setSelectedUnits}
        prioritizedSuggestions={prioritizedSuggestions}
        activeUniverseTab={activeUniverseTab}
        setActiveUniverseTab={setActiveUniverseTab}
        getMetricsByCategory={getMetricsByCategory}
        cmLoading={cmLoading}
        fetchCmRecommendations={fetchCmRecommendations}
        filterRiskRating={filterRiskRating}
        setFilterRiskRating={setFilterRiskRating}
        universeSearch={universeSearch}
        setUniverseSearch={setUniverseSearch}
        universeLoading={universeLoading}
        universeRowSelection={universeRowSelection}
        filteredUniverse={filteredUniverse}
        renderRiskTag={renderRiskTag}
        selectedUnits={selectedUnits}
        updateUnitField={updateUnitField}
        usersList={usersList}
        isLowRisk={isLowRisk}
      />
    );
  }

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1 text-slate-800">Kế hoạch Kiểm toán Năm</Title>
          <Text type="secondary" className="text-sm">Quản lý, xây dựng, phê duyệt kế hoạch năm và tiến hành các đợt rà soát định kỳ (Review Cycles).</Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm kế hoạch..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            className="rounded-lg shadow-sm"
            style={{ width: 220 }}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            disabled={filteredData.length === 0}
            className="shadow-sm rounded-lg font-medium text-slate-700 hover:text-[#ea9105]"
          >
            Tải Excel Chi tiết
          </Button>
          {hasPermission(currentUser, 'plan:create') && (
            <BulkImport
              module="audit-plans"
              fileName="Ke_Hoach_Kiem_Toan_Nam"
              templateData={auditPlanTemplateData}
              onSuccess={() => {
                fetchAuditPlans();
                message.success('Đã nạp Kế hoạch kiểm toán năm từ Excel thành công!');
              }}
            />
          )}
          {hasPermission(currentUser, 'plan:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="shadow-xs rounded-lg bg-[#ea9105] hover:!bg-[#d07e00] border-none font-semibold"
            >
              Tạo Kế hoạch mới
            </Button>
          )}
        </Space>
      </div>

      {/* Quy định Pháp lý & Mốc thời gian cốt lõi (QC 3001 & QT 3002) */}
      <div className="mb-6 rounded-2xl p-5 text-white shadow-md border border-[#fde68a]/50" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #ea580c 100%)' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-white/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/20 text-white font-bold text-xs uppercase tracking-wider border border-white/30 backdrop-blur-sm">
                ⚖️ Quy chế KTNB 3001 & Quy trình KTNB 3002
              </span>
              <span className="text-xs text-amber-100 font-medium">Hiệu lực từ 30/06/2026</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1.5 mb-0 drop-shadow-xs">Mốc Thời hạn & Định chế Pháp lý Lập Kế hoạch Kiểm toán Năm</h4>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/25 text-center">
              <span className="text-[11px] text-amber-100 block uppercase font-semibold">Quỹ Ngày công Dự phòng</span>
              <span className="text-xs font-black text-white">Tối thiểu 10% (Kiểm toán Đột xuất)</span>
            </div>
            <Button
              size="small"
              type="text"
              onClick={() => setIsLegalBannerOpen(!isLegalBannerOpen)}
              className="text-white hover:bg-white/10 border border-white/20 rounded-lg text-xs"
              icon={isLegalBannerOpen ? <UpOutlined /> : <DownOutlined />}
            >
              {isLegalBannerOpen ? 'Thu gọn' : 'Xem chi tiết'}
            </Button>
          </div>
        </div>

        {isLegalBannerOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs transition-all duration-300">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-3">
              <span className="text-xl">📅</span>
              <div>
                <span className="font-bold text-amber-300 block text-sm mb-0.5">Trước ngày 15/11</span>
                <span className="text-blue-100 leading-relaxed">
                  Trưởng Ban KTNB hoàn thành dự thảo KHKT năm và tờ trình để <strong>báo cáo Ban Kiểm soát</strong> xem xét (Mục 19.2.b QC 3001).
                </span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-3">
              <span className="text-xl">🏛️</span>
              <div>
                <span className="font-bold text-emerald-300 block text-sm mb-0.5">Trước ngày 15/12</span>
                <span className="text-blue-100 leading-relaxed">
                  <strong>Ban Kiểm soát phê duyệt và ban hành</strong> Kế hoạch kiểm toán năm của Ngân hàng (Mục 19.2.b QC 3001).
                </span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-3">
              <span className="text-xl">📮</span>
              <div>
                <span className="font-bold text-cyan-300 block text-sm mb-0.5">Trong 10 ngày làm việc</span>
                <span className="text-blue-100 leading-relaxed">
                  Sau khi BKS ban hành, gửi KHKT năm cho <strong>NHNN (Cơ quan TTGSNH)</strong> và <strong>Vietnam Post</strong> (Điều 4.5 QT 3002).
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Card variant="borderless" className="shadow-xs rounded-2xl overflow-hidden border border-[#f1e5d8] bg-white">
        <Table 
          columns={columns} 
          dataSource={filteredData} 
          rowKey="id" 
          pagination={{ pageSize: 8 }} 
          loading={loading}
          scroll={{ x: 1200 }}
          className="custom-table"
        />
      </Card>

      {/* Plan Review & Adjustments Cycle Modal */}
      <PlanRevisionModal
        open={isReviewModalVisible}
        onOk={handleReviewOk}
        onCancel={() => setIsReviewModalVisible(false)}
        reviewPlan={reviewPlan}
        reviewPeriod={reviewPeriod}
        setReviewPeriod={setReviewPeriod}
        reviewNotes={reviewNotes}
        setReviewNotes={setReviewNotes}
        reviewSelectedUnits={reviewSelectedUnits}
        handleUpdateReviewUnitField={handleUpdateReviewUnitField}
        removedUnitsLog={removedUnitsLog}
        setRemovedUnitsLog={setRemovedUnitsLog}
        handleRemoveUnitFromRevision={handleRemoveUnitFromRevision}
        updateReasons={updateReasons}
        setUpdateReasons={setUpdateReasons}
        reviewTabSearch={reviewTabSearch}
        setReviewTabSearch={setReviewTabSearch}
        filteredUniverseForReview={filteredUniverseForReview}
        addedReasons={addedReasons}
        setAddedReasons={setAddedReasons}
        handleAddUnitToRevision={handleAddUnitToRevision}
        renderRiskTag={renderRiskTag}
      />

      {/* Plan Inspection Detail Drawer */}
      <PlanDetailDrawer
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        selectedPlanDetails={selectedPlanDetails}
        getStatusTagColor={getStatusTagColor}
        getStatusText={getStatusText}
        renderRiskTag={renderRiskTag}
        isLowRisk={isLowRisk}
      />

      {/* Approve/Reject confirmation dialog modal */}
      <PlanApprovalModal
        open={isApprovalModalVisible}
        approvalType={approvalType}
        onOk={handleApprovalSubmit}
        onCancel={() => setIsApprovalModalVisible(false)}
        form={approvalForm}
      />

      {/* Continuous Monitoring Recommendations Modal */}
      <PlanAiSuggestionsModal
        open={cmPlanModalVisible}
        onCancel={() => setCmPlanModalVisible(false)}
        cmRecommendations={cmRecommendations}
        selectedUnits={selectedUnits}
        applyCmRecommendationToPlan={applyCmRecommendationToPlan}
      />
    </div>
  );
};

export default AuditPlan;
