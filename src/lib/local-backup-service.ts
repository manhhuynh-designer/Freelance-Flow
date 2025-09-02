/**
 * Local Backup Service - Cho phép user chọn folder để auto-save backup
 * Sử dụng File System Access API và fallback cho browser cũ
 */

import type { AppData } from './types';
import { browserLocal } from './browser';

export class LocalBackupService {
  private static readonly LOCAL_BACKUP_SETTINGS_KEY = 'freelance-flow-local-backup';
  private static readonly AUTO_SAVE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly DB_NAME = 'freelance-flow-fs';
  private static readonly STORE_NAME = 'handles';
  private static readonly HANDLE_KEY = 'backupDirectory';
  
  private static directoryHandle: FileSystemDirectoryHandle | null = null;
  private static autoSaveEnabled = false;
  private static lastAutoSave = 0;
  private static lastSelectionAborted = false;

  // --- IndexedDB helpers for persisting directory handle across reloads ---
  private static openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private static async saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(handle as any, this.HANDLE_KEY);
      await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
      db.close();
    } catch (e) {
      console.warn('Could not persist directory handle:', e);
    }
  }

  private static async getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).get(this.HANDLE_KEY);
      const handle = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
      db.close();
      return handle || null;
    } catch (e) {
      return null;
    }
  }

  private static async clearSavedDirectoryHandle(): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).delete(this.HANDLE_KEY);
      await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
      db.close();
    } catch {}
  }

  /**
   * Check permission state on a stored handle
   */
  static async getPermissionState(mode: 'read' | 'readwrite' = 'readwrite'): Promise<'granted'|'prompt'|'denied'|'unknown'> {
    if (!this.directoryHandle) return 'unknown';
    try {
      const state = await (this.directoryHandle as any).queryPermission?.({ mode })
        ?? await (this.directoryHandle as any).queryPermission?.();
      return state || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Attempt to request permission; should be called from a user gesture
   */
  static async requestPermission(mode: 'read' | 'readwrite' = 'readwrite'): Promise<'granted'|'prompt'|'denied'|'unknown'> {
    if (!this.directoryHandle) return 'unknown';
    try {
      const res = await (this.directoryHandle as any).requestPermission?.({ mode })
        ?? await (this.directoryHandle as any).requestPermission?.();
      return res || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Kiểm tra browser có hỗ trợ File System Access API không
   */
  static isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Thư mục có đang được cấp quyền trong phiên hiện tại không
   */
  static isFolderActive(): boolean {
    return !!this.directoryHandle;
  }

  /** Is auto-save currently enabled */
  static isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * Có handle đã lưu không (dù chưa được cấp quyền)
   */
  static hasDirectoryHandle(): boolean {
    return !!this.directoryHandle;
  }

  /**
   * Tên thư mục (nếu đã lưu trong settings)
   */
  static getFolderName(): string | undefined {
    // Prefer live handle name if available
    if (this.directoryHandle) {
      try { return (this.directoryHandle as any).name as string; } catch {}
    }
    const s = this.getSettings();
    return s?.folderName;
  }

  /**
   * Cho phép user chọn folder để lưu backup
   */
  static async selectBackupFolder(): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
  this.lastSelectionAborted = false;
      // @ts-ignore - File System Access API
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Persist handle so it survives reloads
      if (this.directoryHandle) {
        await this.saveDirectoryHandle(this.directoryHandle);
      }

      // Lưu thông tin setting
      const settings = {
        folderName: this.directoryHandle?.name || 'Unknown',
        autoSaveEnabled: true,
        lastSetup: Date.now()
      };
      
  browserLocal.setItem(this.LOCAL_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
      this.autoSaveEnabled = true;

      return true;
    } catch (error) {
      // If user cancelled the picker, surface a soft signal and avoid noisy errors
      const err: any = error;
      const aborted = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
      this.lastSelectionAborted = !!aborted;
      if (!aborted) {
        console.error('Failed to select backup folder:', error);
      }
      return false;
    }
  }

  /**
   * Whether the last selectBackupFolder call was cancelled by the user
   */
  static wasLastSelectionAborted(): boolean {
    return this.lastSelectionAborted;
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
   * Lưu blob (Excel/JSON) vào thư mục đã chọn
   */
  static async saveBlobToFolder(blob: Blob, filename: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      // @ts-ignore
      const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      this.lastAutoSave = Date.now();
      this.updateSettings({ lastAutoSave: this.lastAutoSave });
      return true;
    } catch (e) {
      console.error('Failed to save blob to folder:', e);
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
    // Do NOT drop the directory handle or clear persisted handle; just turn off autosave
    this.updateSettings({ autoSaveEnabled: false });
  }

  /** Explicitly disconnect the selected folder and forget the saved handle */
  static async disconnectFolder(): Promise<void> {
    this.autoSaveEnabled = false;
    this.directoryHandle = null;
    await this.clearSavedDirectoryHandle();
    // Keep folderName in settings for UI context, but mark as disconnected
    this.updateSettings({ autoSaveEnabled: false, disconnectedAt: Date.now() });
  }

  /** Explicitly enable auto-save when a valid handle exists */
  static enableAutoSave(): void {
    if (this.directoryHandle) {
      this.autoSaveEnabled = true;
      this.updateSettings({ autoSaveEnabled: true });
    }
  }

  /** Get last auto save timestamp (ms) */
  static getLastAutoSave(): number {
    return this.lastAutoSave;
  }

  /**
   * Lấy thông tin settings hiện tại
   */
  static getSettings(): any {
    try {
  const settings = browserLocal.getItem(this.LOCAL_BACKUP_SETTINGS_KEY);
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
  browserLocal.setItem(this.LOCAL_BACKUP_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to update local backup settings:', error);
    }
  }

  /**
   * Khôi phục settings khi khởi động app
   */
  static async restoreSettings(): Promise<void> {
    const settings = this.getSettings();
    if (settings) {
      // We will prefer enabling autosave when permission is granted; keep last timestamp
      this.autoSaveEnabled = !!settings.autoSaveEnabled;
      this.lastAutoSave = settings.lastAutoSave || 0;
    }
    // Try to restore directory handle from IndexedDB
    if (this.isFileSystemAccessSupported()) {
      const handle = await this.getSavedDirectoryHandle();
      if (handle) {
        this.directoryHandle = handle;
  // If permission is granted, ensure autosave is on; otherwise keep off until reauthorized
  const state = await this.getPermissionState('readwrite');
  this.autoSaveEnabled = state === 'granted';
      }
    }
  }

  /**
   * Re-authorize access to the saved folder (call from a user gesture)
   */
  static async reauthorize(): Promise<boolean> {
    if (!this.directoryHandle) return false;
    const res = await this.requestPermission('readwrite');
    if (res === 'granted') {
      this.autoSaveEnabled = true;
      this.updateSettings({ autoSaveEnabled: true });
      return true;
    }
    return false;
  }

  /**
   * Liệt kê các file backup trong thư mục (chỉ JSON và XLSX)
   */
  static async listBackupFiles(): Promise<{ name: string; lastModified: number; size: number; type: 'json'|'excel' }[]> {
    if (!this.directoryHandle) return [];
    const files: { name: string; lastModified: number; size: number; type: 'json'|'excel' }[] = [];
    try {
      // @ts-ignore async iterator
      for await (const [name, handle] of (this.directoryHandle as any).entries()) {
        if (!name.endsWith('.json') && !name.endsWith('.xlsx')) continue;
        try {
          const file = await (handle as any).getFile();
          files.push({ name, lastModified: file.lastModified, size: file.size, type: name.endsWith('.xlsx') ? 'excel' : 'json' });
        } catch {}
      }
    } catch (e) {
      console.error('Failed to list backup files:', e);
    }
    files.sort((a, b) => b.lastModified - a.lastModified);
    return files;
  }

  /**
   * Lấy File từ tên
   */
  static async getFileByName(name: string): Promise<File | null> {
    if (!this.directoryHandle) return null;
    try {
      // @ts-ignore
      const fileHandle = await this.directoryHandle.getFileHandle(name);
      const file = await (fileHandle as any).getFile();
      return file as File;
    } catch (e) {
      console.error('Failed to get file by name:', e);
      return null;
    }
  }

  /**
   * Xóa file backup theo tên
   */
  static async deleteBackupFile(name: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      // @ts-ignore
      await this.directoryHandle.removeEntry(name);
      return true;
    } catch (e) {
      console.error('Failed to delete backup file:', e);
      return false;
    }
  }

  /**
   * Fallback: Download backup vào Downloads folder (cho browser cũ)
   */
  static downloadBackupToDownloads(data: AppData, filename?: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof URL === 'undefined') {
      console.warn('downloadBackupToDownloads requires a browser environment');
      return;
    }
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
