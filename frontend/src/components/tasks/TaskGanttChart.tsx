import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../types/task';
import dayjs from 'dayjs';
import { Tooltip, Progress } from 'antd';

interface GanttProps {
  tasks: Task[];
}

export default function TaskGanttChart({ tasks }: GanttProps) {
  const { t } = useTranslation();
  // Flatten tree tasks to list for Gantt
  const flattenTasks = (list: Task[]): Task[] => {
    return list.reduce((acc: Task[], curr: Task) => {
      acc.push(curr);
      if (curr.subTasks && curr.subTasks.length > 0) {
        acc.push(...flattenTasks(curr.subTasks));
      }
      return acc;
    }, []);
  };

  const flatTasks = useMemo(() => {
    // Only show tasks that have at least a startDate or dueDate
    return flattenTasks(tasks).filter(t => t.startDate || t.dueDate).sort((a, b) => {
      const dateA = dayjs(a.startDate || a.dueDate);
      const dateB = dayjs(b.startDate || b.dueDate);
      return dateA.valueOf() - dateB.valueOf();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const { minDate, maxDate, dateRange } = useMemo(() => {
    if (flatTasks.length === 0) {
      const today = dayjs();
      return { minDate: today, maxDate: today, dateRange: [] };
    }

    let min = dayjs(flatTasks[0].startDate || flatTasks[0].dueDate);
    let max = dayjs(flatTasks[0].dueDate || flatTasks[0].startDate);

    flatTasks.forEach(t => {
      if (t.startDate && dayjs(t.startDate).isBefore(min)) min = dayjs(t.startDate);
      if (t.dueDate && dayjs(t.dueDate).isAfter(max)) max = dayjs(t.dueDate);
    });

    // Add some padding
    min = min.subtract(3, 'day');
    max = max.add(7, 'day');

    const diff = max.diff(min, 'day');
    const range = Array.from({ length: diff + 1 }, (_, i) => min.add(i, 'day'));

    return { minDate: min, maxDate: max, dateRange: range };
  }, [flatTasks]);

  if (flatTasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks with dates available for Gantt chart.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="min-w-max">
        {/* Header Row: Dates */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="w-64 min-w-[256px] p-3 font-semibold text-gray-700 border-r border-gray-200 flex-shrink-0 sticky left-0 bg-gray-50 z-20">
            Task Name
          </div>
          <div className="flex flex-1">
            {dateRange.map((date, idx) => (
              <div 
                key={idx} 
                className={`w-10 min-w-[40px] border-r border-gray-200 flex flex-col items-center justify-center py-1 text-xs
                  ${date.day() === 0 || date.day() === 6 ? 'bg-gray-100 text-gray-400' : 'text-gray-600'}
                  ${date.isSame(dayjs(), 'day') ? 'bg-blue-50 text-blue-600 font-bold' : ''}
                `}
              >
                <span>{date.format('DD')}</span>
                <span className="text-[10px]">{date.format('MMM')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="flex flex-col relative">
          {/* Vertical Grid Lines (Background) */}
          <div className="absolute inset-0 flex left-64 pointer-events-none">
            {dateRange.map((_, idx) => (
              <div key={idx} className="w-10 min-w-[40px] border-r border-gray-100 h-full" />
            ))}
          </div>

          {flatTasks.map((task, idx) => {
            const start = task.startDate ? dayjs(task.startDate) : dayjs(task.dueDate).subtract(1, 'day');
            const end = task.dueDate ? dayjs(task.dueDate) : dayjs(task.startDate).add(1, 'day');
            
            // Calculate position and width
            const startOffset = start.diff(minDate, 'day');
            const duration = Math.max(1, end.diff(start, 'day') + 1); // +1 to include end date

            // Determine color based on status
            let bgColor = 'bg-blue-500';
            if (task.status === 'Done') bgColor = 'bg-green-500';
            if (task.status === 'Review') bgColor = 'bg-yellow-500';
            if (task.status === 'Open') bgColor = 'bg-gray-400';

            return (
              <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                <div className="w-64 min-w-[256px] p-3 text-sm text-gray-800 border-r border-gray-200 flex-shrink-0 sticky left-0 bg-white group-hover:bg-gray-50 z-10 truncate">
                  <Tooltip title={task.title}>
                    {task.parentId ? <span className="text-gray-400 mr-2">↳</span> : null}
                    {task.title}
                  </Tooltip>
                </div>
                <div className="flex-1 relative h-12 flex items-center">
                  <Tooltip 
                    title={
                      <div>
                        <strong>{task.title}</strong><br/>
                        Start: {start.format('YYYY-MM-DD')}<br/>
                        Due: {end.format('YYYY-MM-DD')}<br/>
                        Progress: {task.progress}%
                      </div>
                    }
                  >
                    <div 
                      className={`absolute h-6 rounded-md ${bgColor} bg-opacity-80 border border-black border-opacity-10 shadow-sm cursor-pointer overflow-hidden`}
                      style={{ 
                        left: `${startOffset * 40}px`, // 40px is the width of a day column
                        width: `${duration * 40}px`,
                      }}
                    >
                      {/* Progress Bar overlay inside the Gantt bar */}
                      <div 
                        className="h-full bg-black bg-opacity-20" 
                        style={{ width: `${task.progress}%` }} 
                      />
                    </div>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
