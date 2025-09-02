/**
 * Data Persistence Service Worker Helper
 * Hỗ trợ backup dữ liệu quan trọng vào IndexedDB
 */

import { browserLocal } from '@/lib/browser';

export class DataPersistenceService {
  private static readonly DB_NAME = 'freelance-flow-persist';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'app-data';

  /**
   * Khởi tạo IndexedDB
   */
  private static async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Lưu dữ liệu vào IndexedDB
   */
  static async saveToIndexedDB(key: string, data: any): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      await store.put({
        key,
        data,
        timestamp: Date.now()
      });
      
      db.close();
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  }

  /**
   * Lấy dữ liệu từ IndexedDB
   */
  static async getFromIndexedDB(key: string): Promise<any> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result?.data || null);
        };
      });
    } catch (error) {
      console.error('Failed to get from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Xóa dữ liệu cũ từ IndexedDB
   */
  static async cleanOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      
      const cutoff = Date.now() - maxAge;
      const range = IDBKeyRange.upperBound(cutoff);
      
      index.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      db.close();
    } catch (error) {
      console.error('Failed to clean old data:', error);
    }
  }

  /**
   * Sync localStorage với IndexedDB
   */
  static async syncWithIndexedDB(): Promise<void> {
    try {
      const keys = ['freelance-flow-data', 'freelance-flow-backup'];
      
      for (const key of keys) {
        const localData = browserLocal.getItem(key);
        if (localData) {
          await this.saveToIndexedDB(key, JSON.parse(localData));
        }
      }
    } catch (error) {
      console.error('Failed to sync with IndexedDB:', error);
    }
  }

  /**
   * Khôi phục dữ liệu từ IndexedDB nếu localStorage trống
   */
  static async restoreFromIndexedDB(): Promise<boolean> {
    try {
      const mainDataKey = 'freelance-flow-data';
      const localData = browserLocal.getItem(mainDataKey);

      if (!localData || localData === '{}') {
        const indexedData = await this.getFromIndexedDB(mainDataKey);
        if (indexedData) {
          browserLocal.setItem(mainDataKey, JSON.stringify(indexedData));
          console.log('Data restored from IndexedDB');
          // Set flag để hiển thị notification
          try { if (typeof window !== 'undefined') sessionStorage.setItem('data-was-restored', 'true'); } catch {}
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to restore from IndexedDB:', error);
      return false;
    }
  }
}
