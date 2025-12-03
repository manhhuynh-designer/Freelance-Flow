import type { Task, Quote, AppSettings, Milestone } from '@/lib/types';

interface ExportTimelineToExcelParams {
  task: Task;
  quote?: Quote;
  milestones: Milestone[];
  settings: AppSettings;
  T: any;
}

export async function exportTimelineToExcel({
  task,
  quote,
  milestones,
  settings,
  T,
}: ExportTimelineToExcelParams): Promise<void> {
  let excelText = '';

  // Header
  excelText += `${T.timeline || 'Timeline'}\t${task.name}\n\n`;

  // Column headers
  excelText += `${T.milestone || 'Milestone'}\t${T.startDate || 'Start Date'}\t${T.endDate || 'End Date'}\t${T.duration || 'Duration'}\t${T.status || 'Status'}\n`;

  // Get milestones
  let milestonesToExport: Milestone[] = [];
  
  if (milestones && milestones.length > 0) {
    milestonesToExport = milestones;
  } else if (task.milestones) {
    milestonesToExport = task.milestones;
  }

  // Sort milestones by start date
  const sortedMilestones = [...milestonesToExport].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateA - dateB;
  });

  // Export each milestone
  sortedMilestones.forEach(milestone => {
    const startDate = new Date(milestone.startDate);
    const endDate = new Date(milestone.endDate);
    
    // Calculate duration in days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    
    // Format dates
    const startDateStr = startDate.toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
    const endDateStr = endDate.toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
    
    // Status
    const now = new Date();
    let status = '';
    if (endDate < now) {
      status = T.overdue || 'Overdue';
    } else if (startDate <= now && now <= endDate) {
      status = T.inProgress || 'In Progress';
    } else {
      status = T.upcoming || 'Upcoming';
    }
    
    const row = [
      milestone.name.replace(/\t/g, ' ').replace(/\n/g, ' '),
      startDateStr,
      endDateStr,
      `${durationDays} ${T.days || 'days'}`,
      status,
    ];
    
    excelText += `${row.join('\t')}\n`;
  });

  // Summary
  excelText += '\n';
  excelText += `${T.totalMilestones || 'Total Milestones'}\t${sortedMilestones.length}\n`;

  // Calculate project duration
  if (sortedMilestones.length > 0) {
    const projectStart = new Date(sortedMilestones[0].startDate);
    const projectEnd = new Date(sortedMilestones[sortedMilestones.length - 1].endDate);
    const projectDurationMs = projectEnd.getTime() - projectStart.getTime();
    const projectDurationDays = Math.ceil(projectDurationMs / (1000 * 60 * 60 * 24));
    
    excelText += `${T.projectDuration || 'Project Duration'}\t${projectDurationDays} ${T.days || 'days'}\n`;
    excelText += `${T.projectStart || 'Project Start'}\t${projectStart.toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US')}\n`;
    excelText += `${T.projectEnd || 'Project End'}\t${projectEnd.toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US')}\n`;
  }

  // Copy to clipboard
  await navigator.clipboard.writeText(excelText.trim());
}

export default exportTimelineToExcel;
