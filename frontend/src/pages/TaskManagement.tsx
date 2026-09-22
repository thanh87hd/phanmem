import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Tabs, Tag, Progress, Space, Tooltip, message, Segmented } from 'antd';
import { Plus, Edit2, Trash2, CheckCircle, Table as TableIcon, Kanban, BarChart2, Calendar as CalendarIcon, GitMerge } from 'lucide-react';
import type { Task } from '../types/task';
import { tasksApi } from '../services/api/tasks';
import { useAuth } from '../context/AuthContext';
import TaskDelegationModal from '../components/TaskDelegationModal';
import TaskKanbanBoard from '../components/tasks/TaskKanbanBoard';
import TaskGanttChart from '../components/tasks/TaskGanttChart';
import TaskTimeline from '../components/tasks/TaskTimeline';
import TaskPertChart from '../components/tasks/TaskPertChart';
import dayjs from 'dayjs';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { TabPane } = Tabs;

export default function TaskManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [viewMode, setViewMode] = useState<string>('list');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data: Task[] = [];
      if (activeTab === 'my-tasks') {
        data = await tasksApi.findMyTasks({ parentId: 'null' });
      } else if (activeTab === 'delegated') {
        data = await tasksApi.findDelegatedTasks({ parentId: 'null' });
      } else if (activeTab === 'department') {
        if (user?.department) {
           data = await tasksApi.findDepartmentTasks(user.department, { parentId: 'null' });
        }
      }
      const formatTree = (tasksList: Task[]): any[] => {
        return tasksList.map(t => ({
          ...t,
          key: t.id,
          children: t.subTasks && t.subTasks.length > 0 ? formatTree(t.subTasks) : undefined
        }));
      };
      setTasks(formatTree(data));
    } catch (error) {
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalVisible(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await tasksApi.remove(id);
      message.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      message.error('Failed to delete task');
    }
  };

  const handleUpdateProgress = async (id: number, progress: number) => {
    try {
      await tasksApi.update(id, { progress });
      message.success('Progress updated');
      fetchTasks();
    } catch (error) {
      message.error('Failed to update progress');
    }
  };

  const columns = [
    {
      title: 'Task Title',
      dataIndex: 'title',
      key: 'title',
      ...getColumnSearchProps<Task>('title', 'Task Title'),
      sorter: getColumnSorter<Task>('title', 'string'),
      render: (text: string, record: Task) => (
        <div>
          <span className="font-medium text-gray-800">{text}</span>
          {record.isPeriodic && <Tag color="blue" className="ml-2">{record.frequency}</Tag>}
          {record.sourceType === 'Audit' && <Tag color="purple" className="ml-2">Audit</Tag>}
        </div>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      ...getColumnSearchProps<Task>('assignedToName', 'Assignee'),
      sorter: getColumnSorter<Task>('assignedToName', 'string'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      ...getColumnSelectFilterProps<Task>('priority', undefined, tasks),
      sorter: getColumnSorter<Task>('priority', 'string'),
      render: (priority: string) => {
        let color = 'green';
        if (priority === 'High') color = 'red';
        if (priority === 'Medium') color = 'orange';
        return <Tag color={color}>{priority}</Tag>;
      }
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: getColumnSorter<Task>('dueDate', 'date'),
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      ...getColumnSelectFilterProps<Task>('status', undefined, tasks),
      render: (status: string) => {
        let color = 'default';
        if (status === 'InProgress') color = 'processing';
        if (status === 'Done') color = 'success';
        if (status === 'Review') color = 'warning';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      sorter: getColumnSorter<Task>('progress', 'number'),
      render: (progress: number, record: Task) => (
        <div className="flex items-center gap-2" style={{ minWidth: 120 }}>
          <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
          {progress < 100 && (
            <Tooltip title="Mark as 100%">
              <Button 
                type="text" 
                size="small" 
                icon={<CheckCircle size={16} className="text-green-500 hover:text-green-700" />} 
                onClick={() => handleUpdateProgress(record.id, 100)}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Task) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<Edit2 size={16} className="text-blue-500" />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<Trash2 size={16} />} 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      message.success('Status updated');
      fetchTasks();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const renderView = () => {
    switch (viewMode) {
      case 'kanban':
        return <TaskKanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />;
      case 'gantt':
        return <TaskGanttChart tasks={tasks} />;
      case 'timeline':
        return <TaskTimeline tasks={tasks} />;
      case 'pert':
        return <TaskPertChart tasks={tasks} />;
      case 'list':
      default:
        return (
          <Table
            columns={columns}
            dataSource={tasks}
            loading={loading}
            pagination={false}
            className="mt-4"
          />
        );
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Unified Task Management</h1>
          <p className="text-gray-500 mt-1">Manage and track all assignments across the organization</p>
        </div>
        <div className="flex items-center gap-4">
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as string)}
            options={[
              { label: 'List/Tree', value: 'list', icon: <TableIcon size={16} /> },
              { label: 'Kanban', value: 'kanban', icon: <Kanban size={16} /> },
              { label: 'Gantt', value: 'gantt', icon: <BarChart2 size={16} /> },
              { label: 'Timeline', value: 'timeline', icon: <CalendarIcon size={16} /> },
              { label: 'PERT', value: 'pert', icon: <GitMerge size={16} /> },
            ]}
          />
          <Button type="primary" icon={<Plus size={16} />} onClick={handleCreate} className="bg-indigo-600">
            {t('common.btnAdd', 'Assign New Task')}
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="custom-tabs">
          <TabPane tab="My Tasks" key="my-tasks" />
          <TabPane tab="Delegated By Me" key="delegated" />
          {user?.jobTitle === 'Manager' || user?.role?.name === 'Admin' ? (
            <TabPane tab="Department Tasks" key="department" />
          ) : null}
        </Tabs>

        <div className="mt-4 min-h-[500px]">
          {renderView()}
        </div>
      </div>

      {isModalVisible && (
        <TaskDelegationModal
          visible={isModalVisible}
          task={editingTask}
          onClose={() => setIsModalVisible(false)}
          onSuccess={() => {
            setIsModalVisible(false);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}
