/**
 * Local Backup Service - Cho phép user chọn folder để auto-save backup
 * Sử dụng File System Access API và fallback cho browser cũ
 */

import type { AppData } from './types';

export class LocalBackupService {
  private static readonly LOCAL_BACKUP_SETTINGS_KEY = 'freelance-flow-local-backup';
  private static readonly AUTO_SAVE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  private static directoryHandle: FileSystemDirectoryHandle | null = null;
  private static autoSaveEnabled = false;
  private static lastAutoSave = 0;

  /**
   * Kiểm tra browser có hỗ trợ File System Access API không
   */
  static isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Cho phép user chọn folder để lưu backup
   */
  static async selectBackupFolder(): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      // @ts-ignore - File System Access API
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Lưu thông tin setting
      const settings = {
        folderName: this.directoryHandle?.name || 'Unknown',
        autoSaveEnabled: true,
        lastSetup: Date.now()
      };
      
      localStorage.setItem(this.LOCAL_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
      this.autoSaveEnabled = true;

      return true;
    } catch (error) {
      console.error('Failed to select backup folder:', error);
      return false;
    }
  }

  /**
   * Lưu backup vào folder đã chọn
   */
  static async saveBackupToFolder(data: AppData, filename?: string): Promise<boolean> {
    if (!this.directoryHandle) {
      console.warn('No directory selected for backup');
      return false;
    }

    try {
      const backupFilename = filename || `freelance-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Tạo file trong folder đã chọn
      const fileHandle = await this.directoryHandle.getFileHandle(backupFilename, {
        create: true
      });

      // Ghi dữ liệu vào file
      const writable = await fileHandle.createWritable();
      const jsonString = JSON.stringify(data, null, 2);
      await writable.write(jsonString);
      await writable.close();

      // Cập nhật thời gian auto save cuối
      this.lastAutoSave = Date.now();
      this.updateSettings({ lastAutoSave: this.lastAutoSave });

      return true;
    } catch (error) {
      console.error('Failed to save backup to folder:', error);
      return false;
    }
  }

  /**
   * Auto save backup nếu đã bật và đủ thời gian
   */
  static async autoSaveIfNeeded(data: AppData): Promise<boolean> {
    if (!this.autoSaveEnabled || !this.directoryHandle) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastAutoSave < this.AUTO_SAVE_INTERVAL) {
      return false; // Chưa đến thời gian auto save
    }

    try {
      const autoFilename = `auto-backup-${new Date().toISOString().split('T')[0]}.json`;
      const success = await this.saveBackupToFolder(data, autoFilename);
      
      if (success) {
        console.log('Auto backup saved to local folder successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Auto save backup failed:', error);
      return false;
    }
  }

  /**
   * Tắt auto save vào folder local
   */
  static disableAutoSave(): void {
    this.autoSaveEnabled = false;
    this.directoryHandle = null;
    this.updateSettings({ autoSaveEnabled: false });
  }

  /**
   * Lấy thông tin settings hiện tại
   */
  static getSettings(): any {
    try {
      const settings = localStorage.getItem(this.LOCAL_BACKUP_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch {
      return null;
    }
  }

  /**
   * Cập nhật settings
   */
  private static updateSettings(updates: any): void {
    try {
      const currentSettings = this.getSettings() || {};
      const newSettings = { ...currentSettings, ...updates };
      localStorage.setItem(this.LOCAL_BACKUP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to update local backup settings:', error);
    }
  }

  /**
   * Khôi phục settings khi khởi động app
   */
  static async restoreSettings(): Promise<void> {
    const settings = this.getSettings();
    if (settings?.autoSaveEnabled) {
      this.autoSaveEnabled = true;
      this.lastAutoSave = settings.lastAutoSave || 0;
      
      // Note: Không thể khôi phục directoryHandle qua session
      // User sẽ cần chọn lại folder sau khi restart browser
    }
  }

  /**
   * Fallback: Download backup vào Downloads folder (cho browser cũ)
   */
  static downloadBackupToDownloads(data: AppData, filename?: string): void {
    const backupFilename = filename || `freelance-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(data, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.download = backupFilename;
    link.href = url;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Tự động backup với fallback
   */
  static async smartAutoBackup(data: AppData): Promise<{ success: boolean; method: string }> {
    // Thử auto save vào folder trước
    if (this.isFileSystemAccessSupported() && this.autoSaveEnabled) {
      const folderSaveSuccess = await this.autoSaveIfNeeded(data);
      if (folderSaveSuccess) {
        return { success: true, method: 'folder' };
      }
    }

    // Fallback: Kiểm tra xem có cần download backup không
    const settings = this.getSettings();
    const now = Date.now();
    const lastDownloadBackup = settings?.lastDownloadBackup || 0;
    
    if (now - lastDownloadBackup > this.AUTO_SAVE_INTERVAL) {
      // Note: Không thể auto-download mà không có user interaction
      // Chỉ có thể suggest user download
      return { success: false, method: 'suggestion' };
    }

    return { success: false, method: 'none' };
  }

  /**
   * Check nếu cần suggest user download backup
   */
  static shouldSuggestDownload(): boolean {
    if (this.autoSaveEnabled && this.directoryHandle) {
      return false; // Đã có auto save vào folder
    }

    const settings = this.getSettings();
    const now = Date.now();
    const lastDownloadBackup = settings?.lastDownloadBackup || 0;
    
    return now - lastDownloadBackup > this.AUTO_SAVE_INTERVAL;
  }

  /**
   * Đánh dấu đã download backup manually
   */
  static markManualDownload(): void {
    this.updateSettings({ lastDownloadBackup: Date.now() });
  }
}
