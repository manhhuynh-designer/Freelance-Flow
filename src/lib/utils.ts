import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { StatusSetting, StatusInfo } from './types';
import { CheckCircle, CircleDotDashed, Hourglass, XCircle, Archive } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_INFO: StatusInfo[] = [
  { id: 'todo', name: 'To Do', icon: CircleDotDashed },
  { id: 'inprogress', name: 'In Progress', icon: Hourglass },
  { id: 'done', name: 'Done', icon: CheckCircle },
  { id: 'onhold', name: 'On Hold', icon: XCircle },
  { id: 'archived', name: 'Archived', icon: Archive },
];

export function getStatusInfo(statusId: string, statusSettings: StatusSetting[]) {
  const setting = statusSettings.find(s => s.id === statusId);
  const defaultInfo = STATUS_INFO.find(s => s.id === statusId);

  if (setting) {
    return {
      id: setting.id,
      name: setting.label,
      icon: defaultInfo?.icon || CircleDotDashed, // Fallback to default icon
      label: setting.label, // Add label for direct use
    };
  }
  return defaultInfo ? { ...defaultInfo, label: defaultInfo.name } : undefined;
}
