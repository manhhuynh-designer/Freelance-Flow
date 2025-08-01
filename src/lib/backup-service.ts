/**
 * Backup Service - Tự động backup dữ liệu người dùng
 * Ngăn chặn mất dữ liệu khi deploy lại app
 */

import type { AppData } from './types';

export class BackupService {
  private static readonly BACKUP_KEY = 'freelance-flow-backup';
  private static readonly AUTO_BACKUP_KEY = 'freelance-flow-auto-backup';
  private static readonly LAST_BACKUP_KEY = 'freelance-flow-last-backup'; // Dùng chung với backup cũ
  private static readonly BACKUP_FREQUENCY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_BACKUPS = 5;

  /**
   * Tự động backup dữ liệu định kỳ
   */
  static autoBackup(data: AppData): void {
    try {
      const lastBackup = localStorage.getItem(this.AUTO_BACKUP_KEY);
      const now = Date.now();
      
      if (!lastBackup || (now - parseInt(lastBackup)) > this.BACKUP_FREQUENCY) {
        this.createBackup(data);
        localStorage.setItem(this.AUTO_BACKUP_KEY, now.toString());
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  /**
   * Tạo backup manual - tương thích với function handleExport() hiện tại
   * Nhưng cũng lưu vào backup history
   */
  static createManualBackup(data: AppData): { jsonString: string; filename: string } {
    // Tạo backup trong history như bình thường
    this.createBackup(data);
    
    // Cập nhật last backup timestamp (tương thích với hệ thống cũ)
    const now = new Date();
    localStorage.setItem(this.LAST_BACKUP_KEY, now.toISOString());
    
    // Return data cho download như hàm handleExport() cũ
    const jsonString = JSON.stringify(data, null, 2);
    const filename = `freelance-flow-backup-${now.toISOString().split('T')[0]}.json`;
    
    return { jsonString, filename };
  }

  /**
   * Tạo backup mới
   */
  static createBackup(data: AppData): void {
    try {
      const backup = {
        timestamp: Date.now(),
        version: '1.2',
        data: data
      };

      const existingBackups = this.getBackups();
      existingBackups.unshift(backup);
      
      // Chỉ giữ lại số backup tối đa
      if (existingBackups.length > this.MAX_BACKUPS) {
        existingBackups.splice(this.MAX_BACKUPS);
      }

      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(existingBackups));
    } catch (error) {
      console.error('Create backup failed:', error);
    }
  }

  /**
   * Lấy danh sách backup
   */
  static getBackups(): any[] {
    try {
      const backups = localStorage.getItem(this.BACKUP_KEY);
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('Get backups failed:', error);
      return [];
    }
  }

  /**
   * Khôi phục từ backup
   */
  static restoreFromBackup(timestamp: number): AppData | null {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.timestamp === timestamp);
      return backup ? backup.data : null;
    } catch (error) {
      console.error('Restore from backup failed:', error);
      return null;
    }
  }

  /**
   * Kiểm tra và khôi phục dữ liệu nếu bị mất
   */
  static checkAndRestore(): AppData | null {
    try {
      const mainData = localStorage.getItem('freelance-flow-data');
      
      // Nếu dữ liệu chính bị mất hoặc rỗng
      if (!mainData || mainData === '{}') {
        const backups = this.getBackups();
        if (backups.length > 0) {
          console.log('Main data lost, attempting restore from backup...');
          // Set flag để hiển thị notification
          sessionStorage.setItem('data-was-restored', 'true');
          return backups[0].data; // Restore từ backup mới nhất
        }
      }
      
      return null;
    } catch (error) {
      console.error('Check and restore failed:', error);
      return null;
    }
  }

  /**
   * Xuất tất cả backup thành file
   */
  static exportAllBackups(): void {
    try {
      const backups = this.getBackups();
      const jsonString = JSON.stringify(backups, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `freelance-flow-all-backups-${new Date().toISOString().split('T')[0]}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export all backups failed:', error);
    }
  }

  /**
   * Xóa backup cũ
   */
  static clearOldBackups(): void {
    try {
      const backups = this.getBackups();
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const recentBackups = backups.filter(backup => backup.timestamp > oneWeekAgo);
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(recentBackups));
    } catch (error) {
      console.error('Clear old backups failed:', error);
    }
  }
}
