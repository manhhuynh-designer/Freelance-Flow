/**
 * Service để quản lý việc lưu trữ và đồng bộ filter settings
 */

import type { FilterSettings } from '@/lib/types';
import { browserLocal } from '@/lib/browser';

const FILTER_SETTINGS_KEY = 'freelance-flow-filter-settings';
const FILTER_EXPANDED_KEY = 'freelance-flow-filter-expanded';

export class FilterSettingsService {
  /**
   * Lưu filter settings vào localStorage
   */
  static saveFilterSettings(settings: Partial<FilterSettings>): void {
    try {
  const existing = this.getFilterSettings();
  const updated = { ...existing, ...settings };
  browserLocal.setItem(FILTER_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save filter settings:', error);
    }
  }

  /**
   * Lấy filter settings từ localStorage
   */
  static getFilterSettings(): FilterSettings | null {
    try {
  const saved = browserLocal.getItem(FILTER_SETTINGS_KEY);
  return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load filter settings:', error);
      return null;
    }
  }

  /**
   * Lưu trạng thái expanded của filter
   */
  static saveExpandedState(isExpanded: boolean): void {
    try {
  browserLocal.setItem(FILTER_EXPANDED_KEY, JSON.stringify(isExpanded));
    } catch (error) {
      console.warn('Failed to save filter expanded state:', error);
    }
  }

  /**
   * Lấy trạng thái expanded của filter
   */
  static getExpandedState(): boolean {
    try {
  const saved = browserLocal.getItem(FILTER_EXPANDED_KEY);
  return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.warn('Failed to load filter expanded state:', error);
      return false;
    }
  }

  /**
   * Xóa tất cả filter settings
   */
  static clearAllSettings(): void {
    try {
  browserLocal.removeItem(FILTER_SETTINGS_KEY);
  browserLocal.removeItem(FILTER_EXPANDED_KEY);
    } catch (error) {
      console.warn('Failed to clear filter settings:', error);
    }
  }

  /**
   * Tạo default filter settings
   */
  static createDefaultSettings(statusIds: string[]): FilterSettings {
    return {
      selectedStatuses: statusIds,
      selectedCategory: 'all',
      selectedCollaborator: 'all',
      selectedClient: 'all',
      selectedProject: 'all',
      sortFilter: 'deadline-asc',
      isExpanded: false,
    };
  }

  /**
   * Merge saved settings với default settings
   */
  static mergeWithDefaults(saved: Partial<FilterSettings> | null, defaults: FilterSettings): FilterSettings {
    if (!saved) return defaults;
    
    return {
      selectedStatuses: saved.selectedStatuses || defaults.selectedStatuses,
      selectedCategory: saved.selectedCategory || defaults.selectedCategory,
      selectedCollaborator: saved.selectedCollaborator || defaults.selectedCollaborator,
      selectedClient: saved.selectedClient || defaults.selectedClient,
      selectedProject: saved.selectedProject || defaults.selectedProject,
      sortFilter: saved.sortFilter || defaults.sortFilter,
      isExpanded: saved.isExpanded !== undefined ? saved.isExpanded : defaults.isExpanded,
      dateRange: saved.dateRange || defaults.dateRange,
    };
  }
}
