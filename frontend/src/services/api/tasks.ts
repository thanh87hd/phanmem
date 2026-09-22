const t = (k: string, f?: string) => f || k;
import api from '../api';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../../types/task';

export const tasksApi = {
  findAll: async (params?: Record<string, unknown>): Promise<Task[]> => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  findMyTasks: async (params?: Record<string, unknown>): Promise<Task[]> => {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },

  findDelegatedTasks: async (params?: Record<string, unknown>): Promise<Task[]> => {
    const response = await api.get('/tasks/delegated', { params });
    return response.data;
  },

  findDepartmentTasks: async (deptId: number | string, params?: Record<string, unknown>): Promise<Task[]> => {
    const response = await api.get(`/tasks/department/${deptId}`, { params });
    return response.data;
  },

  findOne: async (id: number): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTaskDto): Promise<Task> => {
    const response = await api.patch(`/tasks/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};
