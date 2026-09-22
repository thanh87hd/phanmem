export interface Task {
  id: number;
  sourceType: string;
  engagementId?: number;
  engagementName?: string;
  title: string;
  description?: string;
  category?: string;
  parentId?: number;
  parent?: Task;
  subTasks?: Task[];
  assignedToId?: number;
  assignedToName?: string;
  assignedById?: number;
  assignedByName?: string;
  assignedDepartmentId?: number;
  teamCode?: string;
  priority: string;
  durationCategory: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  isPeriodic: boolean;
  frequency?: string;
  status: string;
  progress: number;
  notes?: string;
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  sourceType?: string;
  engagementId?: number;
  engagementName?: string;
  title: string;
  description?: string;
  category?: string;
  parentId?: number;
  assignedToId?: number;
  assignedToName?: string;
  assignedById?: number;
  assignedByName?: string;
  assignedDepartmentId?: number;
  teamCode?: string;
  priority?: string;
  durationCategory?: string;
  startDate?: string;
  dueDate?: string;
  isPeriodic?: boolean;
  frequency?: string;
  status?: string;
  estimatedHours?: number;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
}
