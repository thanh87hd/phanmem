import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Task } from '../../types/task';
import { Tag } from 'antd';

interface PertProps {
  tasks: Task[];
}

export default function TaskPertChart({ tasks }: PertProps) {
  const { t } = useTranslation();
  // A simple auto-layout for tree structure using basic math.
  // In a real production app, dagre or elk.js is used for advanced auto-layout.
  
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let yOffset = 0;

    const processTask = (task: Task, x: number, y: number) => {
      // Determine node color based on status
      let borderColor = '#9ca3af'; // gray
      let bgColor = '#f9fafb';
      if (task.status === 'Done') { borderColor = '#22c55e'; bgColor = '#f0fdf4'; }
      else if (task.status === 'InProgress') { borderColor = '#3b82f6'; bgColor = '#eff6ff'; }
      else if (task.status === 'Review') { borderColor = '#f59e0b'; bgColor = '#fffbeb'; }

      nodes.push({
        id: task.id.toString(),
        position: { x, y },
        data: { 
          label: (
            <div className="text-left p-1 w-48">
              <div className="font-bold text-xs mb-1 truncate" title={task.title}>{task.title}</div>
              <div className="text-[10px] text-gray-500 flex justify-between">
                <span>{task.assignedToName || 'Unassigned'}</span>
                <span>{task.progress}%</span>
              </div>
            </div>
          ) 
        },
        style: { 
          border: `2px solid ${borderColor}`,
          backgroundColor: bgColor,
          borderRadius: '8px',
          padding: '4px',
        }
      });

      const currentY = y;
      const children = task.subTasks;
      
      if (children && children.length > 0) {
        children.forEach((child: Task, idx: number) => {
          // Space out children vertically
          const childY = currentY + (idx * 80);
          const childX = x + 250;
          
          edges.push({
            id: `e-${task.id}-${child.id}`,
            source: task.id.toString(),
            target: child.id.toString(),
            animated: child.status === 'InProgress',
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          });
          
          processTask(child, childX, childY);
          
          // Keep track of maximum Y used by children to avoid overlaps with siblings
          yOffset = Math.max(yOffset, childY);
        });
      }
    };

    // Process root tasks
    tasks.forEach((rootTask, idx) => {
      processTask(rootTask, 50, yOffset + (idx * 100));
      yOffset += 100;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges if tasks prop changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks available for PERT Chart.</div>;
  }

  return (
    <div style={{ height: '600px', width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
