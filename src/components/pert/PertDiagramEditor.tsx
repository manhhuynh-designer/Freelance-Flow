"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  Layout,
  RotateCcw,
  Play,
  Pause,
  CalculatorIcon,
  MapPin,
  GitBranch,
  Timer,
  TrendingUp,
  Info,
  Plus,
  Minus,
  Search
} from 'lucide-react';

// Import our custom components
import PertTaskNode from './nodes/PertTaskNode';
import PertEventNode from './nodes/PertEventNode';
import PertEdge from './edges/PertEdge';
import PertTaskDetailsDialog from './PertTaskDetailsDialog';

// Import PERT utilities
import { autoLayoutPertDiagram } from '@/lib/pert/layoutEngine';
import { findCriticalPath, type CriticalPathResult } from '@/lib/pert/criticalPath';
import { calculateExpectedTime } from '@/lib/pert/calculator';
import { CreateTaskForm } from '@/components/create-task-form-new';
import { useDashboard } from '@/contexts/dashboard-context';

import type { Task, Client, Category, Collaborator, PertNode, PertEdge as PertEdgeType, PertDiagram } from '@/lib/types';

// CSS for selected edge highlight
const edgeStyles = `
  .react-flow__edge.selected .react-flow__edge-path {
    stroke-width: 3 !important;
    filter: drop-shadow(0 0 6px currentColor);
    animation: pulse-edge 1.5s ease-in-out infinite;
  }
  
  .react-flow__edge.selected .react-flow__edge-text {
    font-weight: 600;
    fill: #1e40af;
  }
  
  @keyframes pulse-edge {
    0%, 100% { 
      opacity: 1;
      filter: drop-shadow(0 0 4px currentColor);
    }
    50% { 
      opacity: 0.8;
      filter: drop-shadow(0 0 8px currentColor);
    }
  }
`;


interface PertDiagramEditorProps {
  tasks: Task[];
  clients?: Client[];
  categories?: Category[];
  collaborators?: Collaborator[];
  onTaskDelete?: (taskId: string) => void;
  onTaskPartialUpdate?: (partial: Pick<Task, 'id' | 'optimisticTime' | 'mostLikelyTime' | 'pessimisticTime' | 'expectedTime' | 'dependencies'>) => void;
  className?: string;
  
  // Project filtering
  projects?: any[];
  selectedProject?: string;
  onProjectChange?: (project: string) => void;
  onCreateProject?: (data: { name: string; description?: string }) => void;
  T?: any;
  onUpdateProjectDates?: (projectId: string, start?: Date | string, end?: Date | string) => void;
}

const nodeTypes: NodeTypes = {
  taskNode: PertTaskNode,
  eventNode: PertEventNode,
};

const edgeTypes: EdgeTypes = {
  pertEdge: PertEdge,
};

const PertDiagramEditor: React.FC<PertDiagramEditorProps> = ({
  tasks,
  clients = [],
  categories = [],
  collaborators = [],
  onTaskDelete,
  onTaskPartialUpdate,
  className,
  projects = [],
  selectedProject,
  onProjectChange,
  onCreateProject,
  T = {},
  onUpdateProjectDates,
}) => {
  const dashboard = useDashboard();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [pertDialogTaskId, setPertDialogTaskId] = useState<string | null>(null);
  const [pertDialogEdge, setPertDialogEdge] = useState<any | null>(null);
  // Snapshot of task when dialog opens (used if task is filtered out later)
  const [pertDialogTaskSnapshot, setPertDialogTaskSnapshot] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [criticalPathResult, setCriticalPathResult] = useState<CriticalPathResult | null>(null);
  const [showQuickCreateProject, setShowQuickCreateProject] = useState(false); // toolbar (+) dialog
  
  // Full project form state for quick-create dialog
  // Flag to prevent regeneration immediately after edge style update
  const skipNextRegenerationRef = useRef(false);
  
  // Track last edge click for double-click detection
  const lastEdgeClickRef = useRef<{ edgeId: string; time: number } | null>(null);
  
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning' as const,
    clientId: 'none',
    links: ['']
  });
  const [pertStats, setPertStats] = useState({
    totalDuration: 0,
    criticalPathLength: 0,
    totalTasks: 0,
    completedTasks: 0,
  });
  const [showPickTasksDialog, setShowPickTasksDialog] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showProjectTasksList, setShowProjectTasksList] = useState(false);
  const [manageForm, setManageForm] = useState<Partial<any>>({});
  const { toast } = useToast();
  

  // When there are projects, we don't allow selecting 'none' in the selector.
  // Coerce a lingering 'none' selection to 'all' to avoid invalid Select values.
  const effectiveSelectedProject = useMemo(() => {
    if (projects.length === 0) return 'none';
    return selectedProject === 'none' ? 'all' : (selectedProject || 'all');
  }, [projects.length, selectedProject]);

  // Build a stable signature of tasks content to avoid re-initializing on every identity change
  const tasksSignature = useMemo(() => {
    try {
      // Use dashboard tasks if available, fallback to props
      const allTasks = dashboard?.appData?.tasks || tasks || [];
      
      // Create signature including project filtering
      const projectFilteredTasks = effectiveSelectedProject && effectiveSelectedProject !== 'all' 
        ? (effectiveSelectedProject === 'none' 
          ? allTasks.filter(task => !task.projectId || task.projectId === 'none')
          : allTasks.filter(task => task.projectId === effectiveSelectedProject))
        : allTasks;
      
      // Stable signature without timestamp to prevent unnecessary re-renders
      const signature = JSON.stringify({
        selectedProject: effectiveSelectedProject,
        totalTasks: allTasks.length,
        projectTaskCount: projectFilteredTasks.length,
        projectTaskIds: projectFilteredTasks.map(t => t.id).sort(),
        taskProjectMappings: allTasks.map(t => ({
          id: t.id,
          projectId: (t as any).projectId || null,
          deleted: !!t.deletedAt,
          name: t.name, // Include name for content changes
          status: t.status, // Include status for changes
          eisenhowerQuadrant: t.eisenhowerQuadrant // Include priority flag for changes
        })).sort((a, b) => a.id.localeCompare(b.id))
      });
      
      console.log('📝 Tasks signature updated:', {
        selectedProject: effectiveSelectedProject,
        totalTasks: allTasks.length,
        projectTaskCount: projectFilteredTasks.length,
        tasksWithProject: allTasks.filter(t => (t as any).projectId).length,
        signatureHash: signature.substring(0, 50) + '...'
      });
      
      return signature;
    } catch (e) {
      console.error('Error creating tasks signature:', e);
      return 'error-' + Date.now();
    }
  }, [tasks, dashboard?.appData?.tasks, effectiveSelectedProject]);

  // Convert tasks to PERT nodes and edges
  const convertTasksToPertDiagram = useCallback(() => {
    // Use dashboard tasks directly to ensure we have the latest data
    const allDashboardTasks = dashboard?.appData?.tasks || tasks || [];
    
    // Filter tasks by selected project
    let projectTasks = allDashboardTasks;
    if (effectiveSelectedProject && effectiveSelectedProject !== 'all') {
      if (effectiveSelectedProject === 'none') {
        projectTasks = allDashboardTasks.filter(task => !task.projectId || task.projectId === 'none');
      } else {
        projectTasks = allDashboardTasks.filter(task => task.projectId === effectiveSelectedProject);
      }
    }
    
    const pertNodes: Node[] = [];
    const pertEdges: Edge[] = [];
    const eventNodes: Map<string, PertNode> = new Map();

    // If no tasks for selected project, return empty diagram
    if (projectTasks.length === 0) {
      return { nodes: pertNodes, edges: pertEdges };
    }

    // Create project start and end events
    const projectStartId = 'project-start';
    const projectEndId = 'project-end';
    
    const projectStartEvent: PertNode = {
      id: projectStartId,
      type: 'event',
      position: { x: 50, y: 200 },
      name: T.projectStart || 'Project Start',
      earlyTime: 0,
      lateTime: 0,
    };
    eventNodes.set(projectStartId, projectStartEvent);

    // Create task nodes and their connections
    projectTasks.forEach((task, index) => {
      
      // Create task node
      const taskNode: Node = {
        id: `task-${task.id}`,
        type: 'taskNode',
        position: { x: 200 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
        data: {
          task,
          clients,
          categories,
          collaborators,
          // Add data signature to force re-render when eisenhowerQuadrant changes
          dataSignature: `${task.id}-${task.name}-${task.status}-${task.eisenhowerQuadrant || 'none'}`,
          onDelete: onTaskDelete,
          onOpenPertDetails: (taskId: string) => {
            const taskToOpen = projectTasks.find(t => t.id === taskId);
            if (taskToOpen) {
              setPertDialogTaskId(taskId);
              setPertDialogTaskSnapshot(taskToOpen);
            }
          },
          onRemoveFromProject: async (taskId: string) => {
            try {
              await dashboard.updateTask?.({ id: taskId, projectId: undefined } as any);
              toast({ title: T.taskRemoved || 'Task removed', description: `${task.name} ${T.removedFromProject || 'removed from project'}` });
              const { nodes: refreshedNodes, edges: refreshedEdges } = convertTasksToPertDiagram();
              setNodes(refreshedNodes);
              setEdges(refreshedEdges);
            } catch (err) {
              console.error('Error removing task from project', err);
              toast({ title: T.error || 'Error', description: T.failedToRemoveTask || 'Failed to remove task' });
            }
          }
        },
        draggable: true,
      };
      pertNodes.push(taskNode);

      // Calculate expected time
      const expectedTime = task.expectedTime || 
        (task.optimisticTime && task.mostLikelyTime && task.pessimisticTime 
          ? calculateExpectedTime(task.optimisticTime, task.mostLikelyTime, task.pessimisticTime)
          : task.duration || 1);

        // Auto-connect behavior:
        // By default we do NOT auto-connect new/added tasks together. Users should create manual connections via the UI.
        // If a task has explicit dependencies stored, we will NOT auto-create edges here to avoid surprising behavior.
        // However, to preserve a minimal diagram, connect tasks without dependencies to the project start optionally.
        // NOTE: this preserves existing edges for imported diagrams but avoids creating new dependency edges automatically.
        const shouldConnectToStart = false; // set to true if you want implicit start connections
        if (shouldConnectToStart && (!task.dependencies || task.dependencies.length === 0)) {
          pertEdges.push({
            id: `start-${task.id}`,
            source: projectStartId,
            target: `task-${task.id}`,
            type: 'pertEdge',
            data: {
              duration: 0,
              taskId: task.id,
              label: 'Start',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#64748b',
            },
          });
        }
    });

    // Create project end event and connect final tasks
    const finalTasks = projectTasks.filter(task => {
      // Tasks that are not dependencies of other tasks are final tasks
      return !projectTasks.some(otherTask => 
        otherTask.dependencies && otherTask.dependencies.includes(task.id)
      );
    });

    const projectEndEvent: PertNode = {
      id: projectEndId,
      type: 'event',
      position: { x: 200 + (projectTasks.length % 3) * 250 + 200, y: 200 },
      name: T.projectEnd || 'Project End',
      earlyTime: 0, // Will be calculated by PERT algorithm
      lateTime: 0,
    };
    eventNodes.set(projectEndId, projectEndEvent);

    // Connect final tasks to project end
    // NOTE: Auto-connecting final tasks to the project end causes surprising wiring when
    // users add tasks. We intentionally DO NOT automatically connect tasks to the end.
    // Users should create the end connections manually via the UI when desired.
    // (If you need implicit end connections for specific import flows, add a flag here.)

    // Convert event nodes to ReactFlow nodes
    eventNodes.forEach(eventNode => {
      pertNodes.push({
        id: eventNode.id,
        type: 'eventNode',
        position: eventNode.position,
        draggable: true,
        data: {
          node: eventNode,
          isStart: eventNode.id === projectStartId,
          isEnd: eventNode.id === projectEndId,
        },
      });
    });

    // Helper: mapping from dependencyType -> stroke/dash (kept in sync with PertEdge.tsx)
    const mapDependencyToVisual = (dep?: string) => {
      switch (dep) {
        case 'FS': return { stroke: '#3b82f6', strokeDasharray: undefined };
        case 'SS': return { stroke: '#22c55e', strokeDasharray: '8,4' };
        case 'FF': return { stroke: '#a855f7', strokeDasharray: '2,4' };
        case 'SF': return { stroke: '#f97316', strokeDasharray: '10,2,2,2' };
        default: return { stroke: '#64748b', strokeDasharray: undefined };
      }
    };

    // If the project has a persisted pertDiagram, merge saved positions and edges
    try {
      // Prefer persisted projects from dashboard context (the source-of-truth) when available
      const persistedProjects = dashboard?.appData?.projects || projects || [];
      const savedDiagram = persistedProjects.find((p: any) => p.id === effectiveSelectedProject)?.pertDiagram;
      
      // Note: We no longer skip merge based on lastLocalSaveAtRef because:
      // 1. The save operation updates dashboard.appData synchronously in most cases
      // 2. Skipping merge would lose the saved diagram data and revert to default edges
      // 3. The debounced save (150ms) plus dashboard update should be fast enough
      
      if (savedDiagram) {
        try {
          const info = {
            projectId: effectiveSelectedProject,
            savedNodeCount: (savedDiagram.nodes || []).length,
            savedEdgeCount: (savedDiagram.edges || []).length,
            savedEdgeIds: (savedDiagram.edges || []).map((e:any)=>e.id).slice(0,50)
          };
          console.debug('Found persisted pertDiagram (snapshot):', JSON.stringify(info));
        } catch (err) {
          console.debug('Found persisted pertDiagram for', effectiveSelectedProject, 'nodes=', (savedDiagram.nodes || []).length, 'edges=', (savedDiagram.edges || []).length);
        }
      }
      if (savedDiagram && savedDiagram.nodes && savedDiagram.nodes.length > 0) {
        const posMap = new Map(savedDiagram.nodes.map((n: any) => [n.id, n.position]));
        pertNodes.forEach((pn) => {
          const savedPos = posMap.get(pn.id) as any;
          if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
            pn.position = { x: savedPos.x, y: savedPos.y } as any;
          }
        });
      }

      if (savedDiagram && Array.isArray(savedDiagram.edges) && savedDiagram.edges.length > 0) {
        // Convert saved edges to ReactFlow edges
        const savedEdges = savedDiagram.edges.map((se: any) => {
          // Reconstruct style from saved edge (fallback to data.dependencyType mapping)
          let style: any = {};
          if (se.style && (se.style.stroke || se.style.strokeDasharray)) {
            style = { ...se.style };
          } else if (se.data && se.data.dependencyType) {
            style = mapDependencyToVisual(se.data.dependencyType);
          } else {
            // Backwards-compat: consider stored values in data
            if (se.data && se.data.edgeColor) style.stroke = se.data.edgeColor;
            if (se.data && se.data.lineType) {
              if (se.data.lineType === 'dashed') style.strokeDasharray = '5,5';
              if (se.data.lineType === 'dotted') style.strokeDasharray = '1,4';
            }
          }

          // Decide marker color: prefer explicit stroke, else derive from dependencyType
          const markerColor = style.stroke || (se.data && se.data.dependencyType ? mapDependencyToVisual(se.data.dependencyType).stroke : '#64748b');

          return ({
            id: se.id,
            source: se.source,
            target: se.target,
            type: 'pertEdge',
            data: se.data || {},
            style: style,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: markerColor,
            },
          } as Edge);
        });
        // Prefer saved edges if they exist (they represent user-made connections)
        if (savedEdges.length > 0) {
          try { console.debug('Loading persisted pertDiagram first saved edge id:', savedEdges[0]?.id); } catch (e) {}
          return {
            nodes: pertNodes,
            edges: savedEdges.map((e: Edge) => {
                // Keep all original edge properties including style
                // Only ensure data.dependencyType is preserved if present
                return {
                  ...e,
                  data: {
                    ...(e.data || {}),
                    ...(e.data?.dependencyType ? { dependencyType: e.data.dependencyType } : {})
                  }
                };
            })
          };
        }
      }
    } catch (err) {
      console.warn('Failed to merge saved pertDiagram:', err);
    }

    return { nodes: pertNodes, edges: pertEdges };
  }, [tasks, dashboard?.appData?.tasks, clients, categories, collaborators, selectedProject]);

  // Helpers to avoid redundant state updates
  const areNodesSame = (a: Node[], b: Node[]) => {
    if (a.length !== b.length) return false;
    const aIds = a.map(n => n.id).join('|');
    const bIds = b.map(n => n.id).join('|');
    return aIds === bIds;
  };
  const areEdgesSame = (a: Edge[], b: Edge[]) => {
    if (a.length !== b.length) return false;
    const aIds = a.map(e => e.id).join('|');
    const bIds = b.map(e => e.id).join('|');
    return aIds === bIds;
  };

  // Auto-layout using Dagre
  const applyAutoLayout = useCallback(() => {
    // Convert ReactFlow nodes to PERT nodes for layout calculation
    const pertNodes: PertNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type as 'event' | 'task',
      position: node.position,
      name: node.data?.task?.name || node.data?.node?.name || '',
    }));

    const pertEdges: PertEdgeType[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'dependency' as const,
      data: edge.data || {},
    }));

    // Apply layout and convert back to ReactFlow format
    const layoutedDiagram = autoLayoutPertDiagram(pertNodes, pertEdges);
    
    const layoutedNodes = nodes.map(node => {
      const layoutedNode = layoutedDiagram.nodes.find(n => n.id === node.id);
      return layoutedNode ? { ...node, position: layoutedNode.position } : node;
    });

    setNodes(layoutedNodes);
  }, [nodes, edges, setNodes]);

  // ...diagram persistence helpers moved lower where currentProject is defined

  // Calculate PERT times and critical path
  const calculatePert = useCallback(async () => {
    setIsCalculating(true);
    try {
      // Build task list from current nodes to reflect latest inline edits immediately
      const nodeTasks: Task[] = nodes
        .filter((n) => n.type === 'taskNode' && n.data?.task)
        .map((n) => n.data.task as Task);

      const taskList = nodeTasks.filter((task) =>
        Boolean(task.optimisticTime && task.mostLikelyTime && task.pessimisticTime)
      );

      if (taskList.length === 0) {
        console.warn('No tasks with PERT estimates found for critical path calculation');
        // Still update stats for all tasks
        setPertStats({
          totalDuration: 0,
          criticalPathLength: 0,
          totalTasks: nodeTasks.length,
          completedTasks: nodeTasks.filter(t => t.status === 'done').length,
        });
        return;
      }
      
      // Find critical path
      const criticalPathResult = findCriticalPath(taskList);
      setCriticalPathResult(criticalPathResult);
      
      // Update nodes with critical path information
      const criticalPathIds = new Set(criticalPathResult.criticalPath);
      const nodesWithCriticalPath = nodes.map(node => {
        const taskId = node.data?.task?.id;
        const isCritical = taskId && criticalPathIds.has(taskId);
        
        return {
          ...node,
          data: {
            ...node.data,
            isCritical,
          },
        };
      });
      
      // Update edges with critical path information
      const edgesWithCriticalPath = edges.map(edge => {
        const sourceTaskId = edge.data?.taskId;
        const isCritical = sourceTaskId && criticalPathIds.has(sourceTaskId);
        
        return {
          ...edge,
          data: {
            ...edge.data,
            isCritical,
          },
          // Preserve style explicitly to ensure it's not lost during mapping
          style: edge.style,
        };
      });
      
      setNodes(nodesWithCriticalPath);
      setEdges(edgesWithCriticalPath);
      
      // Calculate statistics
      setPertStats({
        totalDuration: criticalPathResult.projectDuration,
        criticalPathLength: criticalPathResult.criticalPath.length,
        totalTasks: nodeTasks.length,
        completedTasks: nodeTasks.filter(t => t.status === 'done').length,
      });
      
    } catch (error) {
      console.error('Error calculating PERT:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Handle new edge connections

  // Initialize diagram guarded by a stable tasks signature
  useEffect(() => {
    // Skip if we just saved an edge style change
    if (skipNextRegenerationRef.current) {
      console.log('⏭️ Skipping regeneration - edge style just updated');
      skipNextRegenerationRef.current = false;
      return;
    }
    
    console.log('useEffect triggered - regenerating PERT diagram');
    const { nodes: initialNodes, edges: initialEdges } = convertTasksToPertDiagram();
    console.log('Generated nodes/edges:', {
      nodeCount: initialNodes.length,
      edgeCount: initialEdges.length,
      nodeIds: initialNodes.map(n => n.id)
    });
    
    // Always update nodes when tasksSignature changes (includes eisenhowerQuadrant changes)
    setNodes(initialNodes);
    setEdges(prev => {
      const shouldUpdate = !areEdgesSame(prev, initialEdges);
      if (shouldUpdate) {
        console.log('Updating edges - topology changed');
      }
      return shouldUpdate ? initialEdges : prev;
    });
  }, [tasksSignature, convertTasksToPertDiagram, setNodes, setEdges]);

  // Memoized values for performance
  const progressPercentage = useMemo(() => {
    return pertStats.totalTasks > 0 ? (pertStats.completedTasks / pertStats.totalTasks) * 100 : 0;
  }, [pertStats]);

  // Helper functions
  const getProjectName = (projectId: string) => {
    if (projectId === 'none') return T.none || 'None';
    if (projectId === 'all') return T.allProjects || 'All Projects';
    return projects.find((p: any) => p.id === projectId)?.name || projectId;
  };

  const handleCreateProject = () => {
    if (!newProjectForm.name.trim()) return;
    
    // Use form data from expanded dialog
    const projectData = {
      name: newProjectForm.name.trim(),
      description: newProjectForm.description || undefined,
      startDate: newProjectForm.startDate ? new Date(newProjectForm.startDate) : undefined,
      endDate: newProjectForm.endDate ? new Date(newProjectForm.endDate) : undefined,
      status: newProjectForm.status,
      clientId: newProjectForm.clientId === 'none' ? undefined : newProjectForm.clientId,
      links: newProjectForm.links.filter(link => link.trim()).length > 0 
        ? newProjectForm.links.filter(link => link.trim()) 
        : undefined
    };
    
    // Prefer context addProject when available to get the new id immediately
    let newId: string | undefined;
    if ((dashboard as any)?.addProject) {
      newId = (dashboard as any).addProject(projectData);
    } else if (onCreateProject) {
      onCreateProject(projectData);
    }
    
    // Reset form state
    setNewProjectForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'planning',
      clientId: 'none',
      links: ['']
    });
    setShowQuickCreateProject(false);
    
    if (newId && onProjectChange) {
      onProjectChange(newId);
    }
  };

  // Derived helpers for All Projects and empty state actions
  const currentProject = useMemo(() => {
    if (!effectiveSelectedProject || effectiveSelectedProject === 'all' || effectiveSelectedProject === 'none') return null; // Sửa lỗi
    return projects.find((p: any) => p.id === effectiveSelectedProject) || null;
  }, [effectiveSelectedProject, projects]);

  // Refs to access latest nodes/edges inside debounced save
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Debounced persistence for storing diagram (positions + connections) into project.pertDiagram
  const saveTimerRef = useRef<any>(null);
  
  // Actual save logic extracted so it can be called immediately when needed
  const performSave = useCallback(async () => {
    try {
      if (!currentProject) return;
      const nowIso = new Date().toISOString();
      const diagram = {
        id: (currentProject as any)?.pertDiagram?.id || `diagram-${Date.now()}`,
        projectId: currentProject.id,
        nodes: nodesRef.current.map(n => ({
          id: n.id,
          type: n.type === 'taskNode' ? 'task' : 'event',
          position: n.position,
          name: n.data?.task?.name || n.data?.node?.name || '',
          earlyTime: n.data?.node?.earlyTime || 0,
          lateTime: n.data?.node?.lateTime || 0,
        })),
        edges: edgesRef.current.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'dependency' as const,
          // Persist dependencyType for semantic meaning plus any explicit style overrides
          data: {
            ...(e.data?.dependencyType ? { dependencyType: e.data.dependencyType } : {}),
          },
          // Persist visual style (stroke, strokeDasharray) if present on the edge
          style: e.style && (e.style as any).stroke ? { stroke: (e.style as any).stroke, strokeDasharray: (e.style as any).strokeDasharray } : undefined,
        })),
        createdAt: (currentProject as any)?.pertDiagram?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      // Persist into project's pertDiagram via dashboard helper
      try {
        // stringify so console captures a snapshot rather than a live object reference
        const snapshot = {
          projectId: currentProject?.id,
          nodeCount: diagram.nodes.length,
          edgeCount: diagram.edges.length,
          edgeIds: diagram.edges.map((e:any)=>e.id).slice(0,50),
          edgesSample: diagram.edges.slice(0,10)
        } as any;
        console.debug('Saving pertDiagram (snapshot):', JSON.stringify(snapshot));
        try {
          // also log first edge style if present to help debugging per-edge visuals
          const firstEdge = diagram.edges && diagram.edges.length > 0 ? diagram.edges[0] : null;
          if (firstEdge) console.debug('Saving pertDiagram sample edge style:', { id: firstEdge.id, style: (firstEdge as any).style, data: firstEdge.data });
        } catch (e) {}
      } catch (err) {
        console.debug('Saving pertDiagram: (could not stringify)', { projectId: currentProject?.id, nodeCount: diagram.nodes.length, edgeCount: diagram.edges.length });
      }
      if ((dashboard as any)?.updateProject) {
        (dashboard as any).updateProject(currentProject.id, { pertDiagram: diagram });
        console.debug('Persisted pertDiagram for project', currentProject.id);
      } else {
        // fallback to setAppData if updateProject missing
        dashboard.setAppData((prev: any) => ({
          ...prev,
          projects: (prev.projects || []).map((p: any) => p.id === currentProject.id ? { ...p, pertDiagram: diagram } : p)
        }));
      }
    } catch (err) {
      console.error('Failed to save pert diagram', err);
    }
  }, [currentProject, dashboard, nodesRef, edgesRef]);
  
  const scheduleSaveDiagram = useCallback((immediate = false) => {
    if (immediate) {
      // Clear any pending save and execute immediately
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      performSave();
    } else {
      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(performSave, 150);
    }
  }, [performSave]);

  // Handle new edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'pertEdge',
        data: {
          duration: 1,
          label: '1d',
          // Mặc định cho dependencyType khi tạo edge mới
          dependencyType: 'FS',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#64748b',
        },
      };
      setEdges(eds => {
        const next = addEdge(newEdge, eds);
        try {
          // update ref immediately so scheduled save sees the new edge
          edgesRef.current = next;
        } catch (e) {
          // ignore
        }
        return next;
      });

      // call scheduleSaveDiagram immediately (debounce will coalesce frequent updates)
      try { scheduleSaveDiagram(); } catch (err) { /* ignore early lifecycle */ }
    },
    [setEdges, scheduleSaveDiagram]
  );

  // Wrap nodes/edges change handlers so we can persist positions/connection changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // slight delay to allow reactflow to apply internal updates then persist
    scheduleSaveDiagram();
  }, [onNodesChange, scheduleSaveDiagram]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    scheduleSaveDiagram();
  }, [onEdgesChange, scheduleSaveDiagram]);

  // When user finishes dragging a node, update its position in state and persist
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, position: node.position } : n));
    scheduleSaveDiagram();
  }, [setNodes, scheduleSaveDiagram]);

  const [projectStartDateDraft, setProjectStartDateDraft] = useState<string>('');
  const [projectEndDateDraft, setProjectEndDateDraft] = useState<string>('');
  useEffect(() => {
    if (currentProject) {
      setProjectStartDateDraft(currentProject.startDate ? new Date(currentProject.startDate).toISOString().slice(0,10) : '');
      setProjectEndDateDraft(currentProject.endDate ? new Date(currentProject.endDate).toISOString().slice(0,10) : '');
    } else {
      setProjectStartDateDraft('');
      setProjectEndDateDraft('');
    }
  }, [currentProject]);

  // Populate manage dialog form when opening Manage dialog or when project changes
  useEffect(() => {
    if (showProjectTasksList && currentProject) {
      setManageForm({
        name: currentProject.name,
        description: (currentProject as any).description || '',
        startDate: currentProject.startDate ? new Date(currentProject.startDate).toISOString().slice(0,10) : '',
        endDate: currentProject.endDate ? new Date(currentProject.endDate).toISOString().slice(0,10) : '',
        status: (currentProject as any).status || 'planning',
        clientId: (currentProject as any).clientId || 'none',
        links: Array.isArray(currentProject.links) ? [...currentProject.links] : []
      });
    } else if (!showProjectTasksList) {
      setManageForm({});
    }
  }, [showProjectTasksList, currentProject]);

  const [taskSearch, setTaskSearch] = useState('');
  // Use all tasks from dashboard context for searching, not just the prop (which may be project-filtered)
  const allTasks = useMemo(() => (dashboard?.appData?.tasks ?? tasks ?? []), [dashboard?.appData?.tasks, tasks]);
  
  // Debug tasks immediately when component mounts
  useEffect(() => {
    console.log('=== PertDiagramEditor Debug ===', {
      totalTasks: tasks?.length || 0,
      tasks: tasks?.slice(0, 3)?.map(t => ({ id: t.id, name: t.name, deletedAt: t.deletedAt })) || [],
      tasksProvided: !!tasks,
      tasksType: Array.isArray(tasks)
    });
  }, [tasks]);

  // Monitor dashboard tasks changes and force refresh when needed
  useEffect(() => {
    let refreshTimer: any | null = null;
    const dashboardTasks = dashboard?.appData?.tasks;
    if (dashboardTasks && effectiveSelectedProject && effectiveSelectedProject !== 'all') {
      const projectTasks = effectiveSelectedProject === 'none' 
        ? dashboardTasks.filter(task => !task.projectId || task.projectId === 'none')
        : dashboardTasks.filter(task => task.projectId === effectiveSelectedProject);

      const projectTaskIds = projectTasks.map(t => t.id).sort();
      const displayedTaskIds = nodes.filter(n => n.type === 'taskNode').map(n => n.data?.task?.id).filter(Boolean).sort();

      console.log('🔍 Dashboard tasks changed — comparing displayed vs project tasks', {
        selectedProject: effectiveSelectedProject,
        projectCount: projectTaskIds.length,
        displayedCount: displayedTaskIds.length,
      });

      const isDifferent = projectTaskIds.length !== displayedTaskIds.length || projectTaskIds.some((id, i) => id !== displayedTaskIds[i]);

      // If counts or ids differ, schedule a debounced refresh to avoid flicker
      if (isDifferent) {
        console.log('⚠️ Project/task mismatch detected - scheduling diagram refresh');
        refreshTimer = setTimeout(() => {
          try {
            const { nodes: refreshedNodes, edges: refreshedEdges } = convertTasksToPertDiagram();
            setNodes(refreshedNodes);
            setEdges(refreshedEdges);
          } catch (err) {
            console.error('Error refreshing pert diagram after dashboard change', err);
          }
        }, 150);
      }
    }

    return () => { if (refreshTimer) clearTimeout(refreshTimer); };
  }, [dashboard?.appData?.tasks, effectiveSelectedProject, nodes, convertTasksToPertDiagram, setNodes, setEdges]);

  // Search logic - copy exact pattern from SearchCommand, using all non-deleted tasks
  const filteredTasks = taskSearch
    ? allTasks.filter(task => !task.deletedAt && task.name.toLowerCase().includes(taskSearch.toLowerCase()))
    : [];

  // Debug logging for search
  console.log('Search debug:', {
    taskSearch,
    totalTasks: tasks?.length || 0,
    availableTasks: tasks?.filter(t => !t.deletedAt)?.length || 0,
    filteredTasks: filteredTasks.length,
    taskNames: tasks?.filter(t => !t.deletedAt)?.slice(0, 5)?.map(t => t.name) || []
  });

  const saveProjectDates = () => {
    if (!currentProject) return;
    const start = projectStartDateDraft ? new Date(projectStartDateDraft) : undefined;
    const end = projectEndDateDraft ? new Date(projectEndDateDraft) : undefined;
    if (onUpdateProjectDates) {
      onUpdateProjectDates(currentProject.id, start, end);
    } else {
      dashboard?.updateProject?.(currentProject.id, { startDate: start, endDate: end });
    }
  };

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      {/* CSS for selected edge highlight */}
      <style>{edgeStyles}</style>
      
      {/* Simple Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            <span className="font-medium">{T.pertDiagram || 'PERT Diagram'}</span>
          </div>
          
          {/* Project Selector + quick add */}
          {onProjectChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {T.project || 'Project'}:
              </span>
              <Select value={effectiveSelectedProject || 'all'} onValueChange={onProjectChange}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder={T.selectProject || 'Select project'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 ? (
                    <SelectItem value="all">
                      {T.allProjects || 'All projects'}
                    </SelectItem>
                  ) : (
                    <SelectItem value="none">
                      {T.noProject || 'No project'}
                    </SelectItem>
                  )}
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-9 px-4 rounded-lg shadow-sm font-medium flex items-center gap-2 text-white bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary/40"
                    disabled={!currentProject}
                    title={!currentProject ? 'Select a project first' : 'Add or create tasks for this project'}
                  >
                    <Plus className="w-4 h-4" />
                    {T.addTasks || 'Add Tasks'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={4} className="w-56">
                  <DropdownMenuItem
                    onClick={() => setShowPickTasksDialog(true)}
                    disabled={!currentProject}
                  >
                    {T.addExistingTasks || 'Add existing tasks'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowCreateTaskDialog(true)}
                    disabled={!currentProject}
                  >
                    {T.createTask || 'Create new task'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Manage Project Tasks - show project info + task list - Hide for All Projects */}
              {effectiveSelectedProject !== 'all' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={() => setShowProjectTasksList(true)}
                  title={T.manageProjectTasks || 'Project details and tasks'}
                >
                  <Info className="w-4 h-4 mr-1" />
                  {T.projectDetails || 'Project Details'}
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={applyAutoLayout} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            title={T.autoLayoutTooltip || 'Automatically arrange nodes in logical order'}
          >
            <Layout className="w-4 h-4" />
            {T.autoLayout || 'Auto Layout'}
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-9 px-4 rounded-lg shadow-sm font-medium flex items-center gap-2 text-white bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary/40"
            onClick={() => setShowQuickCreateProject(true)}
          >
            <Plus className="w-4 h-4" />
            {T.createProject || 'New Project'}
          </Button>
          {/* Removed temporary test search button */}
        </div>
      </div>

      {/* All Projects grid (no diagram) or diagram canvas */}
      {selectedProject === 'all' ? (
        <div className="flex-1 w-full overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p: any) => {
              // Use dashboard tasks if available, otherwise fallback to props
              const allTasks = dashboard?.appData?.tasks || tasks || [];
              const count = allTasks.filter(t => !t.deletedAt && t.projectId === p.id).length;
              const start = p.startDate ? new Date(p.startDate) : null;
              const end = p.endDate ? new Date(p.endDate) : null;
              return (
                <Card key={p.id} className="cursor-pointer hover:shadow-md transition" onClick={() => onProjectChange?.(p.id)}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="w-4 h-4" /> {p.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{T.tasks || 'Tasks'}: <span className="font-medium text-foreground">{count}</span></div>
                      <div>
                        {start ? start.toLocaleDateString() : '—'}
                        <span className="mx-1">→</span>
                        {end ? end.toLocaleDateString() : '—'}
                      </div>
                      {/* Manage Project Tasks: dialog rendered at top-level so it's available regardless of branch */}
                      {p.status && <div className="uppercase text-xs tracking-wide">{p.status}</div>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full">
          {projects.length === 0 ? (
            // No Projects State
            <div className="h-full w-full flex items-center justify-center">
              <Card className="max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <GitBranch className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {T.noProjectsTitle || 'No Projects Found'}
                  </h3>
                  <p className="text-muted-foreground text-center mb-6">
                    {T.noProjectsDescription || 'Create your first project to start building PERT diagrams for your tasks.'}
                  </p>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setShowQuickCreateProject(true)}
                  >
                    <Plus className="w-4 h-4" />
                    {T.createProject || 'Create Project'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : nodes.length === 0 && effectiveSelectedProject !== 'all' ? (
            // Selected project with zero tasks: show (+) actions
            <div className="h-full w-full flex items-center justify-center">
              <Card className="max-w-lg w-full mx-4">
                <CardContent className="flex flex-col items-center justify-center py-10 gap-6">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mb-2 mx-auto" />
                    <h3 className="text-lg font-semibold mb-1">{T.noTasksInProject || 'No Tasks in Project'}</h3>
                    <p className="text-muted-foreground">
                      {T.noTasksInProjectDescription || 'This project has no tasks yet. Add existing tasks or create a new one.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button variant="outline" className="flex-1" onClick={() => {
                      setTaskSearch('');
                      setShowPickTasksDialog(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" /> {T.addExistingTasks || 'Add existing tasks'}
                    </Button>
                    <Button className="flex-1" onClick={() => setShowCreateTaskDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" /> {T.createTask || 'Create task'}
                    </Button>
                  </div>
                  {currentProject && (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">{T.startDate || 'Start date'}</label>
                        <Input type="date" value={projectStartDateDraft} onChange={(e)=>setProjectStartDateDraft(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{T.endDate || 'End date'}</label>
                        <Input type="date" value={projectEndDateDraft} onChange={(e)=>setProjectEndDateDraft(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <Button size="sm" onClick={saveProjectDates}>{T.save || 'Save'}</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            // PERT Diagram
            <ReactFlow
              key={`pert-flow-${tasksSignature.substring(0, 20)}`}
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onEdgeClick={(event, edge) => {
                try { event?.stopPropagation?.(); } catch (e) {}

                // Helper: resolve task id from an edge using multiple strategies
                const resolveTaskIdForEdge = () => {
                  const candidateNodeIds = [edge?.target, edge?.source].filter(Boolean) as string[];
                  for (const nid of candidateNodeIds) {
                    if (nid.startsWith('task-')) return nid.replace(/^task-/, '');
                    const nodeObj = nodes.find(n => n.id === nid);
                    if (nodeObj?.data?.task?.id) return nodeObj.data.task.id;
                  }
                  // Look inside edge data
                  const d: any = edge.data;
                  if (d) {
                    if (d.taskId) return d.taskId;
                    if (d.targetTaskId) return d.targetTaskId;
                    if (d.sourceTaskId) return d.sourceTaskId;
                  }
                  return null;
                };

                const now = Date.now();
                const last = lastEdgeClickRef.current;

                // Always highlight on first click for immediate feedback
                setEdges(eds => eds.map(e => ({ ...e, selected: e.id === edge.id })));

                if (last && last.edgeId === edge.id && now - last.time < 320) {
                  // Double-click detected
                  lastEdgeClickRef.current = null;
                  const taskId = resolveTaskIdForEdge();
                  if (!taskId) {
                    console.warn('[PERT] Unable to resolve taskId for edge', edge.id, edge);
                    return;
                  }
                  // Try to find task in filtered tasks; if not found attempt broader lookup via dashboard context
                  let foundTask = tasks.find(t => t.id === taskId);
                  if (!foundTask) {
                    // fallback: all tasks from dashboard (unfiltered)
                    try {
                      const all = (dashboard?.appData as any)?.tasks || [];
                      foundTask = all.find((t: any) => t.id === taskId);
                    } catch {}
                  }
                  if (!foundTask) {
                    console.warn('[PERT] Task id resolved but not present in current tasks list:', taskId);
                    // Still open dialog if we can derive minimal task shape from nodes
                    const nodeObj = nodes.find(n => n.id === `task-${taskId}`);
                    if (nodeObj?.data?.task) {
                      foundTask = nodeObj.data.task;
                    } else {
                      return; // abort – nothing to edit
                    }
                  }
                  setPertDialogTaskId(foundTask.id);
                  setPertDialogEdge(edge);
                  setPertDialogTaskSnapshot(foundTask);
                } else {
                  // Record first click
                  lastEdgeClickRef.current = { edgeId: edge.id, time: now };
                }
              }}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
              minZoom={0.1}
              maxZoom={2}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              onPaneClick={() => {
                // Deselect all edges when clicking on empty space
                setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
              }}
            >
              <Background 
                variant={BackgroundVariant.Dots}
                gap={20} 
                size={1} 
                color="#e5e7eb" 
              />
              <Controls 
                position="bottom-right"
                showZoom={true}
                showFitView={true}
                showInteractive={true}
              />
              <MiniMap 
                position="bottom-left"
                nodeColor={(node) => {
                  if (node.data?.isCritical) return '#ef4444';
                  if (node.type === 'eventNode') return '#3b82f6';
                  return '#64748b';
                }}
                maskColor="rgb(240, 240, 240, 0.6)"
                nodeStrokeWidth={2}
                zoomable
                pannable
              />
            </ReactFlow>
          )}
        </div>
      )}
      {pertDialogTaskId ? (() => {
        // Prefer live task from current filtered list; fallback to snapshot captured when dialog opened
        const liveTask = tasks.find(t => t.id === pertDialogTaskId) || null;
        // Store snapshot in a ref-like closure via state (initialized below on mount if missing)
        // We'll attach a snapshot setter on window to avoid rework – simpler is to promote a React state above. (Implemented below search for declaration.)
        const taskForDialog: any = liveTask || (pertDialogTaskSnapshot || null);

        console.log('[PertDiagramEditor] Dialog render check:', {
          pertDialogTaskId,
          tasksLength: tasks.length,
          liveTaskFound: !!liveTask,
          snapshotExists: !!pertDialogTaskSnapshot,
          taskForDialogName: taskForDialog?.name,
          willRender: !!taskForDialog
        });

        if (!taskForDialog) {
          console.warn('❌ Task not resolvable for dialog, id:', pertDialogTaskId, 'tasksLength:', tasks.length);
          return null; // Nothing we can safely edit
        }

        if (!liveTask && taskForDialog) {
          console.info('[PERT] Using snapshot task for dialog (filtered out of current tasks list).');
        }

        return (
          <PertTaskDetailsDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
                setPertDialogTaskId(null);
                setPertDialogEdge(null);
                setPertDialogTaskSnapshot(null);
              }
            }}
            task={taskForDialog}
          allTasks={tasks}
          editingEdge={pertDialogEdge}
          onSave={(partial) => {
            // Compute expected time if all three estimates present
            const hasAll = typeof partial.optimisticTime === 'number' && typeof partial.mostLikelyTime === 'number' && typeof partial.pessimisticTime === 'number';
            const expected = hasAll
              ? calculateExpectedTime(
                  partial.optimisticTime as number,
                  partial.mostLikelyTime as number,
                  partial.pessimisticTime as number
                )
              : undefined;

            // Update node UI first
            setNodes((nds) => nds.map(n => {
              const taskId = n.data?.task?.id;
              if (n.type === 'taskNode' && taskId === partial.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    task: {
                      ...n.data.task,
                      optimisticTime: partial.optimisticTime,
                      mostLikelyTime: partial.mostLikelyTime,
                      pessimisticTime: partial.pessimisticTime,
                      expectedTime: expected ?? n.data.task.expectedTime,
                    },
                  },
                } as any;
              }
              return n;
            }));
            
            // Set flag BEFORE setEdges to prevent regeneration  
            skipNextRegenerationRef.current = true;
            
            // Update edge data with dependencyType if dialog provided it
            setEdges((eds) => {
                const next = eds.map(e => {
                    if (e.id === partial.edgeId) {
            const updatedEdge = { ...e };
            updatedEdge.data = {
              ...updatedEdge.data,
              dependencyType: partial.dependencyType,
            };
            // Map dependencyType to a visual style so it persists and renders immediately
            const mapDependencyToVisual = (dep?: string) => {
              switch (dep) {
              case 'FS': return { stroke: '#3b82f6', strokeDasharray: undefined };
              case 'SS': return { stroke: '#22c55e', strokeDasharray: '8,4' };
              case 'FF': return { stroke: '#a855f7', strokeDasharray: '2,4' };
              case 'SF': return { stroke: '#f97316', strokeDasharray: '10,2,2,2' };
              default: return { stroke: '#64748b', strokeDasharray: undefined };
              }
            };
            const style = mapDependencyToVisual(partial.dependencyType);
            updatedEdge.style = style;
            updatedEdge.markerEnd = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: style.stroke,
            };
            return updatedEdge;
                    }
                    return e;
                });
                try { edgesRef.current = next; } catch (err) { /* ignore */ }
                return next;
            });
            
            // Save immediately (not debounced) to ensure diagram is persisted before any parent updates
            try { scheduleSaveDiagram(true); } catch (err) { /* ignore */ }

            // Deselect all edges when dialog closes
            setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
            
            setPertDialogTaskId(null);
            setPertDialogEdge(null);
            setPertDialogTaskSnapshot(null);

            // Now notify parent about task estimate updates
            // No need for delay since we saved immediately above
            if (typeof onTaskPartialUpdate === 'function') {
              console.log('📢 Calling onTaskPartialUpdate - this will trigger tasksSignature change');
              onTaskPartialUpdate({
                id: partial.id,
                optimisticTime: partial.optimisticTime,
                mostLikelyTime: partial.mostLikelyTime,
                pessimisticTime: partial.pessimisticTime,
                expectedTime: expected,
              });
            }

            // Recalculate critical path after updates
            // SKIP calculatePert when only changing edge style to prevent overwrite
            if (!partial.edgeId) {
              setTimeout(() => { calculatePert(); }, 0);
            }
          }}
        />
        );
  })() : null}
      {/* Add existing tasks dialog - copy SearchCommand logic */}
      <Dialog open={showPickTasksDialog} onOpenChange={(open) => {
        setShowPickTasksDialog(open);
        if (!open) {
          setTaskSearch('');
          setSelectedTaskIds([]);
        }
      }}>
        <DialogContent className="p-0 gap-0 top-1/3" hideCloseButton>
          <DialogTitle className="sr-only">Search Tasks to Add</DialogTitle>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search for any task..."
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
            
            {taskSearch.length > 0 && filteredTasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No tasks found.</p>
            )}
            {taskSearch.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Start typing to search for a task.</p>
            )}
            <div className="space-y-1">
              {filteredTasks.map(task => {
                const checked = selectedTaskIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-sm hover:bg-accent text-accent-foreground"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setSelectedTaskIds(prev => {
                          const isChecked = Boolean(v);
                          if (isChecked) return prev.includes(task.id) ? prev : [...prev, task.id];
                          return prev.filter(id => id !== task.id);
                        });
                      }}
                      aria-label={`Select ${task.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(task as any).projectId ? getProjectName((task as any).projectId) : 'No project'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between p-2 pt-0">
            <div className="text-xs text-muted-foreground">
              {selectedTaskIds.length} selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskIds([])}
                disabled={selectedTaskIds.length === 0}
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={selectedTaskIds.length === 0 || !currentProject}
                onClick={async () => {
                  if (!currentProject || selectedTaskIds.length === 0) return;
                  
                  console.log('🚀 Adding tasks to project:', {
                    projectId: currentProject.id,
                    projectName: currentProject.name,
                    selectedTaskIds,
                    taskCount: selectedTaskIds.length
                  });
                  
                  try {
                    // Update all selected tasks in parallel instead of sequential
                    const updatePromises = selectedTaskIds.map(async (taskId, index) => {
                      try {
                        console.log(`📝 Updating task ${index + 1}/${selectedTaskIds.length}:`, taskId);
                        await dashboard?.handleEditTask?.({ id: taskId, projectId: currentProject.id });
                        console.log(`✅ Successfully updated task:`, taskId);
                        return { success: true, taskId };
                      } catch (e) {
                        console.error(`❌ Failed to update task ${taskId}:`, e);
                        return { success: false, taskId, error: e };
                      }
                    });
                    
                    // Wait for all updates to complete
                    const results = await Promise.allSettled(updatePromises);
                    
                    // Count successes and failures
                    const successCount = results.filter(r => 
                      r.status === 'fulfilled' && r.value.success
                    ).length;
                    const failureCount = selectedTaskIds.length - successCount;
                    
                    console.log('🎉 Task updates completed:', {
                      total: selectedTaskIds.length,
                      successful: successCount,
                      failed: failureCount
                    });
                    
                    // Show toast notification
                    if (successCount > 0) {
                      toast({
                        title: "Tasks Added",
                        description: `Successfully added ${successCount} task${successCount > 1 ? 's' : ''} to ${currentProject.name}${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
                      });
                    }
                    
                    if (failureCount > 0 && successCount === 0) {
                      toast({
                        variant: "destructive",
                        title: "Failed to Add Tasks",
                        description: `Failed to add ${failureCount} task${failureCount > 1 ? 's' : ''} to project`,
                      });
                    }
                    
                  } catch (e) {
                    console.error('❌ Unexpected error during task updates:', e);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "An unexpected error occurred while adding tasks to project",
                    });
                  }
                  
                  // Close dialog and reset state
                  setShowPickTasksDialog(false);
                  setTaskSearch('');
                  setSelectedTaskIds([]);
                  
                  console.log('✅ All tasks processed, refreshing view');
                  
                  // Refresh PERT diagram after a short delay to ensure all updates are processed
                  setTimeout(() => {
                    console.log('🔄 Refreshing PERT diagram after task additions');
                    const { nodes: refreshedNodes, edges: refreshedEdges } = convertTasksToPertDiagram();
                    setNodes(refreshedNodes);
                    setEdges(refreshedEdges);
                  }, 300);
                }}
              >
                Add to project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Top-level Manage Project Tasks Dialog (always mounted) */}
      <Dialog open={showProjectTasksList} onOpenChange={(o)=>{ setShowProjectTasksList(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T.manageProjectTasksTitle || 'Project'}</DialogTitle>
          </DialogHeader>
          {/* Project edit fields (copy of sidebar EditProjectDialog fields) */}
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label htmlFor="manage-project-name">{T.projectName || 'Project name'}</Label>
              <Input id="manage-project-name" value={String(manageForm.name || '')} onChange={(e)=>setManageForm(f=>({...f, name: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>{T.description || 'Description'}</Label>
              <Textarea value={String(manageForm.description || '')} onChange={(e)=>setManageForm(f=>({...f, description: e.target.value}))} rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{T.startDate || 'Start date'}</Label>
                <Input type="date" value={manageForm.startDate || ''} onChange={(e)=>setManageForm(f=>({...f, startDate: e.target.value}))} />
              </div>
              <div>
                <Label>{T.endDate || 'End date'}</Label>
                <Input type="date" value={manageForm.endDate || ''} onChange={(e)=>setManageForm(f=>({...f, endDate: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{T.status || 'Status'}</Label>
                <Select value={(manageForm as any).status || 'planning'} onValueChange={(val)=>setManageForm(f=>({...f, status: val as any}))}>
                  <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{T.planning || 'Planning'}</SelectItem>
                    <SelectItem value="active">{T.active || 'Active'}</SelectItem>
                    <SelectItem value="completed">{T.completed || 'Completed'}</SelectItem>
                    <SelectItem value="onhold">{T.onHold || 'On Hold'}</SelectItem>
                    <SelectItem value="archived">{T.archived || 'Archived'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{T.client || 'Client'}</Label>
                <Select value={(manageForm as any).clientId || 'none'} onValueChange={(val)=>setManageForm(f=>({...f, clientId: val === 'none' ? undefined : val}))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder={T.selectClient || 'Select client'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{T.noClient || 'No client'}</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{T.projectLinks || 'Project links'}</Label>
              {(manageForm.links || []).map((link: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <Input value={link} onChange={(e)=>{ const l = [...(manageForm.links || [])]; l[idx]=e.target.value; setManageForm(f=>({...f, links: l})); }} />
                  {idx === (manageForm.links || []).length - 1 && (
                    <Button size="icon" variant="outline" onClick={()=>setManageForm(f=>({...f, links: [...(f.links||[]),'']}))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  {idx > 0 && (
                    <Button size="icon" variant="outline" onClick={()=>setManageForm(f=>({...f, links: (f.links||[]).filter((_:any,i:number)=>i!==idx)}))}>×</Button>
                  )}
                </div>
              ))}
              {(!(manageForm.links || []).length) && (
                <Button size="sm" variant="outline" onClick={()=>setManageForm(f=>({...f, links: ['']}))}>{T.addLink || 'Add link'}</Button>
              )}

            </div>

            <div className="mt-2 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{T.tasksInProject || 'Tasks in this project'}</p>
                <div className="text-xs text-muted-foreground">{nodes.filter(n=>n.type==='taskNode').length} {T.tasks || 'tasks'}</div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {nodes.filter(n=>n.type==='taskNode').map(n=>{
                    const task = n.data?.task as Task | undefined;
                    if (!task) return null;
                    return (
                      <li key={task.id} className="p-2 flex items-center justify-between">
                        <div className="truncate mr-2" title={task.name}>{task.name}</div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={async()=>{
                            try {
                              await dashboard.updateTask?.({ id: task.id, projectId: undefined } as any);
                              toast({ title: T.taskRemoved || 'Task removed', description: `${task.name} ${T.removedFromProject || 'removed from project'}` });
                              const { nodes: refreshedNodes, edges: refreshedEdges } = convertTasksToPertDiagram();
                              setNodes(refreshedNodes);
                              setEdges(refreshedEdges);
                            } catch (err) {
                              console.error('Error removing task from project', err);
                              toast({ title: T.error || 'Error', description: T.failedToRemoveTask || 'Failed to remove task' });
                            }
                          }}><Minus className="w-4 h-4" /></Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setShowProjectTasksList(false)}>{T.close || 'Close'}</Button>
            <Button onClick={async()=>{
              if (!currentProject) return;
              try {
                const updates: any = {
                  name: String(manageForm.name || currentProject.name).trim(),
                  description: manageForm.description || currentProject.description,
                  startDate: manageForm.startDate ? new Date(manageForm.startDate) : undefined,
                  endDate: manageForm.endDate ? new Date(manageForm.endDate) : undefined,
                  status: manageForm.status || (currentProject as any).status,
                  clientId: manageForm.clientId === 'none' ? undefined : manageForm.clientId,
                  links: Array.isArray(manageForm.links) ? manageForm.links.map((l:any)=>String(l).trim()).filter(Boolean) : currentProject.links
                };
                // Prefer context updateProject when available
                if ((dashboard as any)?.updateProject) {
                  await (dashboard as any).updateProject(currentProject.id, updates);
                } else if (onUpdateProjectDates) {
                  // Best-effort: only update dates via provided callback
                  await onUpdateProjectDates(currentProject.id, updates.startDate, updates.endDate);
                }
                toast({ title: T.projectUpdated || 'Project updated', description: `${updates.name} ${T.projectUpdatedDesc || 'saved.'}` });
                setShowProjectTasksList(false);
              } catch (err) {
                console.error('Error saving project updates', err);
                toast({ title: T.error || 'Error', description: T.failedToSaveProject || 'Failed to save project' });
              }
            }}>{T.saveChanges || 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick create project dialog from toolbar (+) */}
      <Dialog open={showQuickCreateProject} onOpenChange={setShowQuickCreateProject}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T.createProject || 'Create Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name">{T.projectName || 'Project name'} *</Label>
              <Input
                id="project-name"
                placeholder={T.projectName || 'Project name'}
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-description">{T.description || 'Description'}</Label>
              <Textarea
                id="project-description"
                placeholder={T.projectDescription || 'Project description'}
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{T.startDate || 'Start date'}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newProjectForm.startDate}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{T.endDate || 'End date'}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newProjectForm.endDate}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Status and Client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-status">{T.status || 'Status'}</Label>
                <Select value={newProjectForm.status} onValueChange={(value: any) => setNewProjectForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger id="project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{T.planning || 'Planning'}</SelectItem>
                    <SelectItem value="active">{T.active || 'Active'}</SelectItem>
                    <SelectItem value="completed">{T.completed || 'Completed'}</SelectItem>
                    <SelectItem value="onhold">{T.onHold || 'On Hold'}</SelectItem>
                    <SelectItem value="archived">{T.archived || 'Archived'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-client">{T.client || 'Client'}</Label>
                <Select value={newProjectForm.clientId} onValueChange={(value) => setNewProjectForm(prev => ({ ...prev, clientId: value === 'none' ? '' : value }))}>
                  <SelectTrigger id="project-client">
                    <SelectValue placeholder={T.selectClient || 'Select client'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{T.noClient || 'No client'}</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>{T.projectLinks || 'Project links'}</Label>
              {newProjectForm.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`${T.link || 'Link'} ${index + 1}`}
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...newProjectForm.links];
                      newLinks[index] = e.target.value;
                      setNewProjectForm(prev => ({ ...prev, links: newLinks }));
                    }}
                  />
                  {index === newProjectForm.links.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setNewProjectForm(prev => ({ ...prev, links: [...prev.links, ''] }))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newLinks = newProjectForm.links.filter((_, i) => i !== index);
                        setNewProjectForm(prev => ({ ...prev, links: newLinks }));
                      }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => { 
                setShowQuickCreateProject(false); 
                setNewProjectForm({
                  name: '',
                  description: '',
                  startDate: '',
                  endDate: '',
                  status: 'planning',
                  clientId: 'none',
                  links: ['']
                });
              }}
            >
              {T.cancel || 'Cancel'}
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectForm.name.trim()}>
              {T.create || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create task dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T.createTask || 'Create Task'}</DialogTitle>
          </DialogHeader>
          {currentProject && (
            <div className="max-h-[78vh] overflow-y-auto pr-1">
              <CreateTaskForm
                setOpen={setShowCreateTaskDialog}
                onSubmit={(values, quoteCols, collabQuoteCols) => {
                  const id = (dashboard as any)?.handleAddTask?.({ ...values, projectId: currentProject.id }, quoteCols, collabQuoteCols);
                  return id as any;
                }}
                clients={(dashboard as any)?.appData?.clients || []}
                collaborators={(dashboard as any)?.appData?.collaborators || []}
                categories={(dashboard as any)?.appData?.categories || []}
                onAddClient={(dashboard as any)?.handleAddClientAndSelect}
                projects={(dashboard as any)?.appData?.projects || []}
                onAddProject={(data) => (dashboard as any)?.addProject?.(data as any)}
                quoteTemplates={(dashboard as any)?.appData?.quoteTemplates || []}
                settings={(dashboard as any)?.appData?.appSettings}
                defaultDate={currentProject?.startDate ? new Date(currentProject.startDate) : undefined}
                prefillValues={{ projectId: currentProject.id }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PertDiagramEditor;