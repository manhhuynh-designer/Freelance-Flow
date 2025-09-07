import React from 'react';
import { AppSettings, Category, Client, Milestone, Quote, Task } from '@/lib/types';
import { format, differenceInDays, addDays } from 'date-fns';

type Props = {
  task: Task;
  quote?: Quote;
  milestones?: Milestone[];
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
};

export default function TimelineViewer({ task, quote, milestones = [], settings, clients, categories }: Props) {
  // Extract milestones from task if not provided directly
  const actualMilestones = milestones.length > 0 ? milestones : (task.milestones || []);

  // Calculate project duration and timeline scale
  const projectStart = task.startDate ? new Date(task.startDate) : null;
  const projectEnd = task.deadline ? new Date(task.deadline) : null;
  const today = new Date();

  const calculateProgress = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '—';
    try {
      const d = new Date(date);
      return d.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatShortDate = (date: string | Date | null) => {
    if (!date) return '—';
    try {
      const d = new Date(date);
      return format(d, 'MMM dd');
    } catch {
      return '—';
    }
  };

  const getStatusColor = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!startDate || !endDate) return 'bg-gray-200';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (today < start) return 'bg-blue-200'; // Upcoming
    if (today > end) return 'bg-green-500'; // Completed
    return 'bg-yellow-400'; // In progress
  };

  const getStatusText = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!startDate || !endDate) return 'Not scheduled';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (today < start) return 'Upcoming';
    if (today > end) return 'Completed';
    return 'In Progress';
  };

  // Calculate timeline visualization dimensions
  const timelineStart = projectStart;
  const timelineEnd = projectEnd;
  const totalDays = timelineStart && timelineEnd 
    ? Math.max(1, differenceInDays(timelineEnd, timelineStart) + 1)
    : 30;
  
  // Calculate milestone positions for gantt chart
  const getMilestonePosition = (milestone: Milestone) => {
    if (!timelineStart || !milestone.startDate || !milestone.endDate) {
      return { left: 0, width: 0 };
    }
    
    const msStart = new Date(milestone.startDate);
    const msEnd = new Date(milestone.endDate);
    const daysFromStart = differenceInDays(msStart, timelineStart);
    const duration = Math.max(1, differenceInDays(msEnd, msStart) + 1);
    
    const left = (daysFromStart / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { 
      left: Math.max(0, left), 
      width: Math.min(100 - Math.max(0, left), width) 
    };
  };

  // Generate date headers for timeline
  const generateDateHeaders = () => {
    if (!timelineStart || totalDays <= 0) return [];
    
    const headers = [];
    const stepDays = totalDays > 60 ? 7 : totalDays > 30 ? 3 : 1; // Show weekly/3-day/daily headers based on project length
    
    for (let i = 0; i < totalDays; i += stepDays) {
      const date = addDays(timelineStart, i);
      headers.push({
        date,
        position: (i / totalDays) * 100,
        label: formatShortDate(date)
      });
    }
    
    return headers;
  };

  const dateHeaders = generateDateHeaders();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Project Header */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.name || 'Project Timeline'}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-500">Start Date:</span> 
            <span className="ml-2 font-semibold">{formatDate(task.startDate)}</span>
          </div>
          <div>
            <span className="text-gray-500">Deadline:</span> 
            <span className="ml-2 font-semibold">{formatDate(task.deadline)}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Milestones:</span> 
            <span className="ml-2 font-semibold">{actualMilestones.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span> 
            <span className="ml-2 font-semibold">{totalDays} days</span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        {projectStart && projectEnd && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, calculateProgress(task.startDate, task.deadline)))}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Gantt Chart */}
      {actualMilestones.length > 0 && projectStart && projectEnd && (
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Timeline Gantt Chart</h2>
            <p className="text-sm text-gray-600 mt-1">Visual timeline of all project milestones</p>
          </div>
          
          {/* Timeline Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-full" style={{ minWidth: '800px' }}>
              {/* Date Headers */}
              <div className="relative bg-gray-50 border-b border-gray-200 h-12 flex items-center px-4">
                <div className="w-64 flex-shrink-0 text-sm font-medium text-gray-700">Milestone</div>
                <div className="flex-1 relative">
                  {dateHeaders.map((header, index) => (
                    <div
                      key={index}
                      className="absolute text-xs text-gray-600 font-medium"
                      style={{ left: `${header.position}%`, transform: 'translateX(-50%)' }}
                    >
                      {header.label}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Milestone Rows */}
              <div className="divide-y divide-gray-100">
                {actualMilestones.map((milestone, index) => {
                  const position = getMilestonePosition(milestone);
                  const progress = calculateProgress(milestone.startDate, milestone.endDate);
                  const statusText = getStatusText(milestone.startDate, milestone.endDate);
                  
                  return (
                    <div key={milestone.id || index} className="flex items-center py-3 px-4 hover:bg-gray-50">
                      {/* Milestone Info */}
                      <div className="w-64 flex-shrink-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: milestone.color || '#3b82f6' }}
                          ></div>
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {milestone.name || `Milestone ${index + 1}`}
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatShortDate(milestone.startDate)} → {formatShortDate(milestone.endDate)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            statusText === 'Completed' ? 'bg-green-100 text-green-800' :
                            statusText === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                      
                      {/* Timeline Bar */}
                      <div className="flex-1 relative h-8">
                        {/* Background grid lines */}
                        <div className="absolute inset-0 flex">
                          {dateHeaders.map((_, index) => (
                            <div
                              key={index}
                              className="border-l border-gray-200 h-full"
                              style={{ left: `${(index / (dateHeaders.length - 1)) * 100}%` }}
                            ></div>
                          ))}
                        </div>
                        
                        {/* Milestone Bar */}
                        <div
                          className="absolute top-1 h-6 rounded-md shadow-sm border border-gray-300"
                          style={{
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            backgroundColor: milestone.color || '#3b82f6',
                            opacity: statusText === 'Completed' ? 1 : 0.8
                          }}
                        >
                          {/* Progress indicator */}
                          <div
                            className="h-full bg-black bg-opacity-20 rounded-md transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Milestone Cards */}
      <div className="space-y-6">
        {actualMilestones.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No Milestones</h3>
            <p className="text-gray-500">No milestones have been set for this project yet.</p>
          </div>
        )}

        {actualMilestones.map((milestone, index) => {
          const progress = calculateProgress(milestone.startDate, milestone.endDate);
          const statusColor = getStatusColor(milestone.startDate, milestone.endDate);
          const statusText = getStatusText(milestone.startDate, milestone.endDate);
          
          return (
            <div key={milestone.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Milestone Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: milestone.color || '#3b82f6' }}
                      ></div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {milestone.name || `Milestone ${index + 1}`}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusText === 'Completed' ? 'bg-green-100 text-green-800' :
                        statusText === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {statusText}
                      </span>
                    </div>
                    {milestone.content && (
                      <p className="text-gray-600 leading-relaxed">{milestone.content}</p>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-gray-600">
                    <div className="font-semibold">
                      {formatDate(milestone.startDate)} → {formatDate(milestone.endDate)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(progress)}% Complete
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                        backgroundColor: milestone.color || '#3b82f6'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Timeline Details */}
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium">
                      {milestone.startDate && milestone.endDate ? 
                        Math.ceil((new Date(milestone.endDate).getTime() - new Date(milestone.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days' :
                        'Not set'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">{statusText}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Progress:</span>
                    <span className="ml-2 font-medium">{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Summary */}
      {actualMilestones.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-green-600">
                {actualMilestones.filter(m => getStatusText(m.startDate, m.endDate) === 'Completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-yellow-600">
                {actualMilestones.filter(m => getStatusText(m.startDate, m.endDate) === 'In Progress').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {actualMilestones.filter(m => getStatusText(m.startDate, m.endDate) === 'Upcoming').length}
              </div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
