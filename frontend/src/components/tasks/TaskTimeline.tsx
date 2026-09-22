import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Timeline, Card, Tag } from 'antd';
import type { Task } from '../../types/task';
import dayjs from 'dayjs';

interface TimelineProps {
  tasks: Task[];
}

export default function TaskTimeline({ tasks }: TimelineProps) {
  const { t } = useTranslation();
  // Flatten tree tasks to list
  const flattenTasks = (list: Task[]): Task[] => {
    return list.reduce((acc: Task[], curr: Task) => {
      acc.push(curr);
      if (curr.subTasks && curr.subTasks.length > 0) {
        acc.push(...flattenTasks(curr.subTasks));
      }
      return acc;
    }, []);
  };

  const timelineItems = useMemo(() => {
    const flatTasks = flattenTasks(tasks).filter(t => t.dueDate);
    
    // Sort by due date ascending
    flatTasks.sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf());

    return flatTasks.map(task => {
      let color = 'gray';
      if (task.status === 'Done') color = 'green';
      else if (task.status === 'InProgress') color = 'blue';
      else if (task.status === 'Review') color = 'orange';

      const isOverdue = task.status !== 'Done' && dayjs(task.dueDate).isBefore(dayjs(), 'day');
      if (isOverdue) color = 'red';

      return {
        color,
        children: (
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-500 mb-1">
              {dayjs(task.dueDate).format('DD MMM YYYY')} 
              {isOverdue && <Tag color="red" className="ml-2">Overdue</Tag>}
            </div>
            <Card size="small" className={`shadow-sm ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-800 text-base">{task.title}</span>
                <Tag color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'green'}>
                  {task.priority}
                </Tag>
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
              )}
              <div className="text-xs text-gray-500 flex items-center justify-between">
                <span>Assignee: <strong>{task.assignedToName || 'Unassigned'}</strong></span>
                <span>Progress: {task.progress}%</span>
              </div>
            </Card>
          </div>
        )
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  if (timelineItems.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks with due dates available for Timeline.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Task Timeline (By Due Date)</h2>
      <Timeline mode="left" items={timelineItems} />
    </div>
  );
}
