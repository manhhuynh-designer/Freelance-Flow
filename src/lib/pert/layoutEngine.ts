import dagre from 'dagre';
import type { Task, PertNode, PertEdge } from '@/lib/types';
import { getTaskDuration } from './calculator';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export interface LayoutOptions {
  direction: LayoutDirection;
  nodeWidth: number;
  nodeHeight: number;
  rankSeparation: number;
  nodeSeparation: number;
}

const defaultLayoutOptions: LayoutOptions = {
  direction: 'TB',
  nodeWidth: 200,
  nodeHeight: 120,
  rankSeparation: 100,
  nodeSeparation: 50,
};

/**
 * Generate PERT layout from tasks using Dagre
 */
export function generatePertLayout(
  tasks: Task[],
  options: Partial<LayoutOptions> = {}
): { nodes: PertNode[]; edges: PertEdge[] } {
  const opts = { ...defaultLayoutOptions, ...options };
  
  // Create Dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSeparation,
    nodesep: opts.nodeSeparation,
    edgesep: 20,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: PertNode[] = [];
  const edges: PertEdge[] = [];

  // Create start node
  const startNodeId = 'start';
  g.setNode(startNodeId, { width: 80, height: 80 });
  nodes.push({
    id: startNodeId,
    type: 'event',
    position: { x: 0, y: 0 },
    data: {
      label: 'Start',
      eventNumber: 1,
      earlyTime: 0,
      lateTime: 0,
    },
  });

  // Create task nodes
  let eventNumber = 2;
  const taskNodeMap = new Map<string, string>();

  for (const task of tasks) {
    const nodeId = `task-${task.id}`;
    taskNodeMap.set(task.id, nodeId);
    
    g.setNode(nodeId, { width: opts.nodeWidth, height: opts.nodeHeight });
    
    nodes.push({
      id: nodeId,
      type: 'task',
      position: { x: 0, y: 0 }, // Will be updated by layout
      data: {
        label: task.name,
        taskId: task.id,
        earlyTime: task.earlyStart,
        lateTime: task.lateStart,
      },
    });
  }

  // Create end node
  const endNodeId = 'end';
  g.setNode(endNodeId, { width: 80, height: 80 });
  nodes.push({
    id: endNodeId,
    type: 'event',
    position: { x: 0, y: 0 },
    data: {
      label: 'End',
      eventNumber: eventNumber + tasks.length,
      earlyTime: 0, // Will be calculated
      lateTime: 0, // Will be calculated
    },
  });

  // Add edges based on dependencies
  for (const task of tasks) {
    const taskNodeId = taskNodeMap.get(task.id)!;
    
    if (!task.dependencies || task.dependencies.length === 0) {
      // Task depends on start node
      g.setEdge(startNodeId, taskNodeId);
      edges.push({
        id: `${startNodeId}-${taskNodeId}`,
        source: startNodeId,
        target: taskNodeId,
        type: 'dependency',
        data: {
          duration: 0,
          label: '',
        },
      });
    } else {
      // Task depends on other tasks
      for (const depId of task.dependencies) {
        const depNodeId = taskNodeMap.get(depId);
        if (depNodeId) {
          g.setEdge(depNodeId, taskNodeId);
          const depTask = tasks.find(t => t.id === depId);
          const duration = depTask ? getTaskDuration(depTask) : 0;
          
          edges.push({
            id: `${depNodeId}-${taskNodeId}`,
            source: depNodeId,
            target: taskNodeId,
            type: 'dependency',
            data: {
              duration,
              taskId: depId,
              label: duration > 0 ? `${duration}d` : '',
            },
          });
        }
      }
    }
  }

  // Connect tasks without successors to end node
  const tasksWithSuccessors = new Set<string>();
  for (const task of tasks) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        tasksWithSuccessors.add(depId);
      }
    }
  }

  for (const task of tasks) {
    if (!tasksWithSuccessors.has(task.id)) {
      const taskNodeId = taskNodeMap.get(task.id)!;
      g.setEdge(taskNodeId, endNodeId);
      const duration = getTaskDuration(task);
      
      edges.push({
        id: `${taskNodeId}-${endNodeId}`,
        source: taskNodeId,
        target: endNodeId,
        type: 'dependency',
        data: {
          duration,
          taskId: task.id,
          label: duration > 0 ? `${duration}d` : '',
        },
      });
    }
  }

  // Run layout algorithm
  dagre.layout(g);

  // Update node positions from layout
  g.nodes().forEach(nodeId => {
    const node = g.node(nodeId);
    const pertNode = nodes.find(n => n.id === nodeId);
    if (pertNode) {
      pertNode.position = {
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
      };
    }
  });

  return { nodes, edges };
}

/**
 * Auto-layout existing PERT diagram
 */
export function autoLayoutPertDiagram(
  existingNodes: PertNode[],
  existingEdges: PertEdge[],
  options: Partial<LayoutOptions> = {}
): { nodes: PertNode[]; edges: PertEdge[] } {
  const opts = { ...defaultLayoutOptions, ...options };
  
  // Create Dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSeparation,
    nodesep: opts.nodeSeparation,
    edgesep: 20,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to graph
  for (const node of existingNodes) {
    const width = node.type === 'event' ? 80 : opts.nodeWidth;
    const height = node.type === 'event' ? 80 : opts.nodeHeight;
    g.setNode(node.id, { width, height });
  }

  // Add edges to graph
  for (const edge of existingEdges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run layout algorithm
  dagre.layout(g);

  // Update node positions
  const updatedNodes = existingNodes.map(node => {
    const layoutNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
      },
    };
  });

  return {
    nodes: updatedNodes,
    edges: existingEdges,
  };
}

/**
 * Calculate optimal layout bounds
 */
export function calculateLayoutBounds(nodes: PertNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const nodeWidth = node.type === 'event' ? 80 : 200;
    const nodeHeight = node.type === 'event' ? 80 : 120;
    
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Center layout in viewport
 */
export function centerLayout(
  nodes: PertNode[],
  viewportWidth: number,
  viewportHeight: number
): PertNode[] {
  const bounds = calculateLayoutBounds(nodes);
  
  const offsetX = (viewportWidth - bounds.width) / 2 - bounds.minX;
  const offsetY = (viewportHeight - bounds.height) / 2 - bounds.minY;

  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}