"use client";

import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import styles from './PertEdge.module.css';
import { useDashboard } from '@/contexts/dashboard-context';
import { getTranslations } from '@/lib/i18n';


interface PertEdgeData {
  duration?: number;
  taskId?: string;
  label?: string;
  isCritical?: boolean;
  isLag?: boolean;           // For lag time between tasks
  lagTime?: number;          // Lag time value
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, etc.
}

export type PertEdgeProps = EdgeProps<PertEdgeData>;

const PertEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}: PertEdgeProps) => {
  const dashboard = useDashboard();
  const T = getTranslations(dashboard?.appData?.appSettings?.language || 'vi');
  
  const {
    duration,
    label,
    isCritical = false,
    isLag = false,
    lagTime,
    dependencyType = 'FS',
  } = data || {};

  // Calculate the path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get edge styling based on type
  const getEdgeStyle = () => {
    // baseStyle hiện tại là style truyền vào từ React Flow, chứa strokeWidth mặc định và có thể
    // các style tùy chỉnh cũ đã được lưu trữ (chúng ta đã xóa khả năng này nhưng có thể dữ liệu cũ vẫn còn)
    const baseStyle = {
      strokeWidth: 2,
      // The `style` prop from ReactFlow can contain arbitrary styles, but we explicitly override stroke/strokeDasharray based on our logic.
      // Keeping other custom styles if present (e.g. from data migration).
      // Chúng ta sẽ không sử dụng `...style` trực tiếp vào thuộc tính stroke/strokeDasharray
      // để tránh việc các style mặc định/cũ ghi đè logic mới.
      // Thay vào đó, chúng ta sẽ quản lý stroke/strokeDasharray hoàn toàn ở đây.
    };

    // Critical path has a strong visual override
    if (isCritical) {
      return {
        ...baseStyle,
        stroke: '#ef4444', // Red for critical path
        strokeWidth: 3,
        strokeDasharray: undefined, // Solid line for critical path
      };
    }

    if (isLag) {
      return {
        ...baseStyle,
        stroke: '#f59e0b', // Amber for lag
        strokeDasharray: '5,5', // Dashed line for lag
      };
    }

    // Prefer explicit saved style values on the edge (e.g., edge.style.stroke)
    const explicitStroke = (style as any)?.stroke as string | undefined;
    const explicitDash = (style as any)?.strokeDasharray as string | undefined;
    if (explicitStroke) {
      return {
        strokeWidth: 2,
        stroke: explicitStroke,
        strokeDasharray: explicitDash,
      };
    }

    // Fallback to dependencyType mapping when no explicit style present
    let dynamicStroke = '#64748b'; // Default
    let dynamicStrokeDasharray = undefined;

    switch (dependencyType) {
      case 'FS':
        dynamicStroke = '#3b82f6';
        dynamicStrokeDasharray = undefined;
        break;
      case 'SS':
        dynamicStroke = '#22c55e';
        dynamicStrokeDasharray = '8,4';
        break;
      case 'FF':
        dynamicStroke = '#a855f7';
        dynamicStrokeDasharray = '2,4';
        break;
      case 'SF':
        dynamicStroke = '#f97316';
        dynamicStrokeDasharray = '10,2,2,2';
        break;
    }

    return {
      strokeWidth: 2,
      stroke: dynamicStroke,
      strokeDasharray: dynamicStrokeDasharray,
    };
  };

  // Get dependency type symbol
  const getDependencySymbol = () => {
    const symbols = {
      FS: '→',     // Finish-to-Start (most common)
      SS: '⇉',     // Start-to-Start  
      FF: '⇇',     // Finish-to-Finish
      SF: '↱',     // Start-to-Finish (rare)
    };
    return symbols[dependencyType] || '→';
  };

  // Format duration display
  const formatDuration = () => {
    if (duration !== undefined) {
      return `${duration}d`;
    }
    if (lagTime !== undefined) {
      return `+${lagTime}d`;
    }
    return null;
  };

  // Get label content
  const getLabelContent = () => {
    const parts = [];
    
    // Always include the explicit Dependency Type at the beginning of the label
    if (dependencyType) {
      parts.push(dependencyType);
    }

    const durationText = formatDuration();
    if (durationText) {
      parts.push(durationText);
    }
    
    // Only show generic label if it's different from the dependencyType and not already added
    if (label && label !== dependencyType) {
        parts.push(label);
    }
    
    return parts.join(' ');
  };

  const labelContent = getLabelContent();

  const computedStyle = getEdgeStyle();
  // Diagnostic: show when an edge has a custom style or data-driven color
  try {
    // Logging removed or simplified to avoid noise after removing custom edge style functionality
    // This section can be re-enabled if deep debugging is needed for the automated styling logic.
  } catch (err) {}

  // Ensure marker color follows edge stroke when provided
  // (computedStyle as any).stroke will now reliably contain the dynamic color
  const markerEndProp = markerEnd ? { ...(markerEnd as any), color: (computedStyle as any).stroke } : markerEnd;

  return (
    <>
        {/* Main edge path */}
        <path
          id={id}
          // Apply stroke attributes explicitly so color/dash are always set on the SVG path
          stroke={(computedStyle as any).stroke}
          strokeWidth={(computedStyle as any).strokeWidth}
          strokeDasharray={(computedStyle as any).strokeDasharray}
          // REMOVED: `style={{ ...computedStyle, stroke: undefined, strokeWidth: undefined, strokeDasharray: undefined }}`
          // This line was resetting the dynamically applied stroke, strokeWidth, and strokeDasharray attributes.
          className={cn(
            "react-flow__edge-path",
            selected && "react-flow__edge-selected",
            isCritical && styles.pertEdgeCritical
          )}
          d={edgePath}
          markerEnd={markerEndProp}
          // Also set inline style so it overrides external CSS rules that may set stroke
          style={{ stroke: (computedStyle as any).stroke, strokeWidth: (computedStyle as any).strokeWidth, strokeDasharray: (computedStyle as any).strokeDasharray }}
        />

        {/* Edge label */}
        {labelContent && (
          <EdgeLabelRenderer>
            {/* eslint-disable-next-line */}
            <div
              className={cn(styles.pertEdgeLabelContainer, "nodrag nopan")}
                  // eslint-disable-next-line react/style-prop-object
                  style={{
                    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                  }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant={isCritical ? "destructive" : isLag ? "secondary" : "outline"}
                    className={cn(
                      "text-xs px-2 py-1 bg-white/90 backdrop-blur-sm border shadow-sm",
                      isCritical && "bg-red-50 text-red-700 border-red-200",
                      isLag && "bg-amber-50 text-amber-700 border-amber-200",
                      // Ensure badge background/text colors are neutral for non-critical/lag edges
                      !isCritical && !isLag && "bg-gray-50 text-gray-700 border-gray-200" 
                    )}
                  >
                    {labelContent}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{dependencyType} {T.dependency || 'Dependency'}</p>
                    {isCritical && (
                      <p className="text-red-600 font-medium">{T.criticalPath || 'Critical Path'}</p>
                    )}
                    {isLag && lagTime && (
                      <p>{T.lagTime || 'Lag Time'}: {lagTime} {T.days || 'days'}</p>
                    )}
                    {duration && (
                      <p>{T.duration || 'Duration'}: {duration} {T.days || 'days'}</p>
                    )}
                    {dependencyType === 'FS' && <p className="text-xs text-gray-600">{T.fsDescription || 'Finish-to-Start: Task A must finish before Task B can start.'}</p>}
                    {dependencyType === 'SS' && <p className="text-xs text-gray-600">{T.ssDescription || 'Start-to-Start: Task A must start before Task B can start.'}</p>}
                    {dependencyType === 'FF' && <p className="text-xs text-gray-600">{T.ffDescription || 'Finish-to-Finish: Task A must finish before Task B can finish.'}</p>}
                    {dependencyType === 'SF' && <p className="text-xs text-gray-600">{T.sfDescription || 'Start-to-Finish: Task A must start before Task B can finish.'}</p>}
                    <p className="text-xs text-gray-500 italic mt-2">{T.doubleClickToEdit || 'Double-click to edit'}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </EdgeLabelRenderer>
        )}

        {/* Critical path highlight effect */}
        {/* eslint-disable-next-line */}
        {isCritical && (
          // eslint-disable-next-line
          <path
            className={styles.pertEdgeHighlight}
            // highlight uses explicit strokeWidth and stroke attribute to draw underneath the main line
            stroke="#fef2f2"
            strokeWidth={6}
            d={edgePath}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </>
  );
});

PertEdge.displayName = 'PertEdge';

export default PertEdge;