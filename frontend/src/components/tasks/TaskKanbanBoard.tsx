import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Card, Tag, Avatar, Tooltip } from 'antd';
import { UserOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Task } from '../../types/task';
import dayjs from 'dayjs';

interface KanbanProps {
  tasks: Task[];
  onStatusChange: (taskId: number, newStatus: string) => void;
}

const COLUMNS = [
  { id: 'Open', title: 'Open', color: 'border-l-4 border-gray-400' },
  { id: 'InProgress', title: 'In Progress', color: 'border-l-4 border-blue-500' },
  { id: 'Review', title: 'Under Review', color: 'border-l-4 border-yellow-500' },
  { id: 'Done', title: 'Done', color: 'border-l-4 border-green-500' },
];

export default function TaskKanbanBoard({ tasks, onStatusChange }: KanbanProps) {
  // Flatten tree tasks to list for Kanban, or just use root tasks. 
  // Let's flatten them so we see all sub-tasks as well, or we can just show root tasks.
  // Showing only root tasks might be cleaner, but if we flattened them:
  const flattenTasks = (list: Task[]): Task[] => {
    return list.reduce((acc: Task[], curr: Task) => {
      acc.push(curr);
      if (curr.subTasks && curr.subTasks.length > 0) {
        acc.push(...flattenTasks(curr.subTasks));
      }
      return acc;
    }, []);
  };

  const flatTasks = flattenTasks(tasks);

  const getTasksByStatus = (statusId: string) => {
    return flatTasks.filter((t) => t.status === statusId);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Call API to update status
    onStatusChange(Number(draggableId), destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4 h-full">
        {COLUMNS.map((column) => (
          <div key={column.id} className="min-w-[300px] w-[300px] flex flex-col bg-gray-50 rounded-lg p-3">
            <h3 className="font-semibold text-gray-700 mb-3 flex justify-between items-center">
              {column.title}
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                {getTasksByStatus(column.id).length}
              </span>
            </h3>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 min-h-[200px] transition-colors rounded ${
                    snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                  }`}
                >
                  {getTasksByStatus(column.id).map((task, index) => (
                    <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`mb-3 ${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}`}
                        >
                          <Card 
                            size="small" 
                            className={`shadow-sm cursor-grab ${column.color}`}
                            styles={{ body: {} }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-800 text-sm">{task.title}</span>
                              {task.priority === 'High' && <Tag color="red">High</Tag>}
                              {task.priority === 'Medium' && <Tag color="orange">Med</Tag>}
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-3 line-clamp-2">
                              {task.description || 'No description provided.'}
                            </div>
                            
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                              <Tooltip title={task.assignedToName || 'Unassigned'}>
                                <Avatar size="small" icon={<UserOutlined />} className="bg-indigo-100 text-indigo-600" />
                              </Tooltip>
                              
                              {task.dueDate && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <CalendarOutlined />
                                  {dayjs(task.dueDate).format('MMM D')}
                                </span>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
