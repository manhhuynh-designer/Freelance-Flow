/**
 * Excel Backup Service - Export/Import data as Excel files
 * Provides user-friendly backup format that can be viewed/edited in spreadsheet applications
 * Note: Client-side only due to XLSX library compatibility
 */

import type { AppData, Task, Client, Quote, Collaborator, Category, QuoteTemplate } from './types';
import { initialAppData } from './data';

// Dynamic import for XLSX to avoid SSR issues
const getXLSX = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Excel functionality is only available in the browser');
  }
  const XLSX = await import('xlsx');
  return XLSX;
};

export class ExcelBackupService {
  private static readonly EXCEL_BACKUP_KEY = 'freelance-flow-excel-backup';
  private static readonly VERSION = '1.2';

  /**
   * Export app data to Excel format
   */
  static async exportToExcel(data: AppData): Promise<{ blob: Blob; filename: string }> {
    try {
      const XLSX = await getXLSX();
      
      // Create new workbook
      const workbook = XLSX.utils.book_new();

      // Add metadata sheet
      const metadataSheet = XLSX.utils.aoa_to_sheet([
        ['Freelance Flow Data Export'],
        ['Export Date', new Date().toISOString()],
        ['Version', this.VERSION],
        ['Format', 'Excel Workbook (.xlsx)'],
        [''],
        ['Sheet Contents:'],
        ['Tasks', 'All project tasks with details'],
        ['Clients', 'Client contact information'],
        ['Quotes', 'Quote templates and data'],
        ['Collaborators', 'Team member information'],
        ['Categories', 'Project categories'],
        ['Settings', 'Application settings'],
        [''],
        ['Note: This file can be imported back into Freelance Flow'],
        ['or viewed/edited in Excel or Google Sheets']
      ]);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Info');

      // Add Tasks sheet
      if (data.tasks && data.tasks.length > 0) {
        const tasksData = data.tasks.map((task: Task) => ({
          ID: task.id,
          Name: task.name,
          Description: task.description || '',
          'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
          Deadline: task.deadline ? new Date(task.deadline).toLocaleDateString() : '',
          Status: task.status,
          'Client ID': task.clientId || '',
          'Category ID': task.categoryId || '',
          'Quote ID': task.quoteId || '',
          'Collaborator IDs': Array.isArray(task.collaboratorIds) ? task.collaboratorIds.join(', ') : '',
          'Brief Links': Array.isArray(task.briefLink) ? task.briefLink.join(', ') : '',
          'Drive Links': Array.isArray(task.driveLink) ? task.driveLink.join(', ') : '',
          'Created At': task.createdAt || '',
          'Eisenhower Quadrant': task.eisenhowerQuadrant || '',
          Progress: task.progress || 0
        }));
        const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
        XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
      }

      // Add Clients sheet
      if (data.clients && data.clients.length > 0) {
        const clientsData = data.clients.map((client: Client) => ({
          ID: client.id,
          Name: client.name,
          Type: client.type || '',
          Email: Array.isArray(client.email) ? client.email.join(', ') : client.email || '',
          Phone: Array.isArray(client.phone) ? client.phone.join(', ') : client.phone || '',
          'Tax Info': Array.isArray(client.taxInfo) ? client.taxInfo.join(', ') : client.taxInfo || '',
          'Drive Links': Array.isArray(client.driveLink) ? client.driveLink.join(', ') : client.driveLink || ''
        }));
        const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
        XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');
      }

      // Add Quotes sheet
      if (data.quotes && data.quotes.length > 0) {
        const quotesData = data.quotes.map((quote: Quote) => ({
          ID: quote.id,
          Total: quote.total || 0,
          Status: quote.status || '',
          'Amount Paid': quote.amountPaid || 0,
          'Sections Count': quote.sections ? quote.sections.length : 0,
          'Items Count': quote.sections ? quote.sections.reduce((acc, section) => acc + (section.items?.length || 0), 0) : 0,
          'Payments Count': quote.payments ? quote.payments.length : 0
        }));
        const quotesSheet = XLSX.utils.json_to_sheet(quotesData);
        XLSX.utils.book_append_sheet(workbook, quotesSheet, 'Quotes');
      }

      // Add Collaborators sheet
      if (data.collaborators && data.collaborators.length > 0) {
        const collaboratorsData = data.collaborators.map((collaborator: Collaborator) => ({
          ID: collaborator.id,
          Name: collaborator.name,
          Email: collaborator.email || '',
          Phone: collaborator.phone || '',
          Specialty: collaborator.specialty || '',
          'Facebook Link': collaborator.facebookLink || '',
          Notes: collaborator.notes || ''
        }));
        const collaboratorsSheet = XLSX.utils.json_to_sheet(collaboratorsData);
        XLSX.utils.book_append_sheet(workbook, collaboratorsSheet, 'Collaborators');
      }

      // Add Categories sheet
      if (data.categories && data.categories.length > 0) {
        const categoriesData = data.categories.map((category: Category) => ({
          ID: category.id,
          Name: category.name
        }));
        const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
        XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
      }

      // Add Quote Templates sheet
      if (data.quoteTemplates && data.quoteTemplates.length > 0) {
        const templatesData = data.quoteTemplates.map((template: QuoteTemplate) => ({
          ID: template.id,
          Name: template.name,
          'Columns Count': template.columns ? template.columns.length : 0,
          'Sections Count': template.sections ? template.sections.length : 0
        }));
        const templatesSheet = XLSX.utils.json_to_sheet(templatesData);
        XLSX.utils.book_append_sheet(workbook, templatesSheet, 'Quote Templates');
      }

  // Add Settings sheet
      if (data.appSettings) {
        const settingsData = [
          ['Setting', 'Value'],
          ['Language', data.appSettings.language || 'en'],
          ['Currency', data.appSettings.currency || 'VND'],
          ['Theme Primary', data.appSettings.theme?.primary || ''],
          ['Theme Accent', data.appSettings.theme?.accent || ''],
          ['Preferred Model Provider', data.appSettings.preferredModelProvider || ''],
          ['Google Model', data.appSettings.googleModel || ''],
          ['Trash Auto Delete Days', data.appSettings.trashAutoDeleteDays || 30],
          ['Dashboard Columns Count', data.appSettings.dashboardColumns?.length || 0],
          ['Status Settings Count', data.appSettings.statusSettings?.length || 0]
        ];
        const settingsSheet = XLSX.utils.aoa_to_sheet(settingsData);
        XLSX.utils.book_append_sheet(workbook, settingsSheet, 'Settings');
      }

      // Add Fixed Costs sheet (if any)
      const anyData: any = data as any;
      if (anyData.fixedCosts && Array.isArray(anyData.fixedCosts) && anyData.fixedCosts.length > 0) {
        const fixedCostsSheet = XLSX.utils.json_to_sheet(anyData.fixedCosts.map((c: any) => ({
          ID: c.id,
          Name: c.name,
          Amount: c.amount,
          Frequency: c.frequency,
          StartDate: c.startDate,
          EndDate: c.endDate || '',
          IsActive: c.isActive ? 'true' : 'false',
          CreatedAt: c.createdAt || '',
          UpdatedAt: c.updatedAt || ''
        })));
        XLSX.utils.book_append_sheet(workbook, fixedCostsSheet, 'FixedCosts');
      }

      // Add Expenses sheet (if any)
      if (anyData.expenses && Array.isArray(anyData.expenses) && anyData.expenses.length > 0) {
        const expensesSheet = XLSX.utils.json_to_sheet(anyData.expenses.map((e: any) => ({
          ID: e.id,
          Name: e.name,
          Amount: e.amount,
          Date: e.date,
          Category: e.category
        })));
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
      }

      // Add AI/local-only data as JSON strings in a dedicated sheet
      const aiDataRows: any[] = [];
      // Prefer including centralized `aiAnalyses` when available (stored in appData / PouchDB)
      if (anyData.aiAnalyses) aiDataRows.push({ Key: 'aiAnalyses', JSON: JSON.stringify(anyData.aiAnalyses) });
      if (anyData.aiPersistentData) aiDataRows.push({ Key: 'freelance-flow-ai-persistent-data', JSON: JSON.stringify(anyData.aiPersistentData) });
      if (anyData.aiWritingPresets) aiDataRows.push({ Key: 'ai-writing-presets', JSON: JSON.stringify(anyData.aiWritingPresets) });
      if (anyData.aiWritingHistory) aiDataRows.push({ Key: 'ai-writing-history', JSON: JSON.stringify(anyData.aiWritingHistory) });
      if (anyData.aiWritingVersions) aiDataRows.push({ Key: 'ai-writing-versions', JSON: JSON.stringify(anyData.aiWritingVersions) });
      if (anyData.filterPresets) aiDataRows.push({ Key: 'freelance-flow-filter-presets', JSON: JSON.stringify(anyData.filterPresets) });
      if (aiDataRows.length > 0) {
        const aiSheet = XLSX.utils.json_to_sheet(aiDataRows);
        XLSX.utils.book_append_sheet(workbook, aiSheet, 'AI Data');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const filename = `freelance-flow-backup-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      return { blob, filename };
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to export data to Excel format');
    }
  }

  /**
   * Import app data from Excel file
   */
  static async importFromExcel(file: File): Promise<Partial<AppData>> {
    try {
      const XLSX = await getXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const importedData: Partial<AppData> = {};

      // Import Tasks
      if (workbook.SheetNames.includes('Tasks')) {
        const tasksSheet = workbook.Sheets['Tasks'];
        const tasksData = XLSX.utils.sheet_to_json(tasksSheet);
        
        importedData.tasks = tasksData.map((row: any) => ({
          id: row.ID || '',
          name: row.Name || '',
          description: row.Description || '',
          startDate: row['Start Date'] ? new Date(row['Start Date']) : new Date(),
          deadline: row.Deadline ? new Date(row.Deadline) : new Date(),
          status: row.Status || 'todo',
          clientId: row['Client ID'] || '',
          categoryId: row['Category ID'] || '',
          quoteId: row['Quote ID'] || '',
          collaboratorIds: row['Collaborator IDs'] ? row['Collaborator IDs'].split(', ').filter(Boolean) : [],
          collaboratorQuotes: [],
          briefLink: row['Brief Links'] ? row['Brief Links'].split(', ').filter(Boolean) : [],
          driveLink: row['Drive Links'] ? row['Drive Links'].split(', ').filter(Boolean) : [],
          createdAt: row['Created At'] || new Date().toISOString(),
          deletedAt: undefined,
          eisenhowerQuadrant: row['Eisenhower Quadrant'] || undefined,
          kanbanOrder: undefined,
          endDate: undefined,
          duration: undefined,
          progress: row.Progress || 0,
          dependencies: []
        }));
      }

      // Import Clients
      if (workbook.SheetNames.includes('Clients')) {
        const clientsSheet = workbook.Sheets['Clients'];
        const clientsData = XLSX.utils.sheet_to_json(clientsSheet);
        
        importedData.clients = clientsData.map((row: any) => ({
          id: row.ID || '',
          name: row.Name || '',
          type: row.Type || 'brand',
          email: row.Email ? row.Email.split(', ').filter(Boolean) : [],
          phone: row.Phone ? row.Phone.split(', ').filter(Boolean) : [],
          taxInfo: row['Tax Info'] ? row['Tax Info'].split(', ').filter(Boolean) : [],
          driveLink: row['Drive Links'] ? row['Drive Links'].split(', ').filter(Boolean) : []
        }));
      }

      // Import Collaborators
      if (workbook.SheetNames.includes('Collaborators')) {
        const collaboratorsSheet = workbook.Sheets['Collaborators'];
        const collaboratorsData = XLSX.utils.sheet_to_json(collaboratorsSheet);
        
        importedData.collaborators = collaboratorsData.map((row: any) => ({
          id: row.ID || '',
          name: row.Name || '',
          email: row.Email || '',
          phone: row.Phone || '',
          specialty: row.Specialty || '',
          facebookLink: row['Facebook Link'] || '',
          notes: row.Notes || ''
        }));
      }

      // Import Categories
      if (workbook.SheetNames.includes('Categories')) {
        const categoriesSheet = workbook.Sheets['Categories'];
        const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet);
        
        importedData.categories = categoriesData.map((row: any) => ({
          id: row.ID || '',
          name: row.Name || ''
        }));
      }

      // Import FixedCosts
      if (workbook.SheetNames.includes('FixedCosts')) {
        const sheet = workbook.Sheets['FixedCosts'];
        const rows = XLSX.utils.sheet_to_json(sheet);
        (importedData as any).fixedCosts = rows.map((r: any) => ({
          id: r.ID || '',
          name: r.Name || '',
          amount: Number(r.Amount) || 0,
          frequency: r.Frequency || 'monthly',
          startDate: r.StartDate || new Date().toISOString(),
          endDate: r.EndDate || undefined,
          isActive: String(r.IsActive).toLowerCase() === 'true',
          createdAt: r.CreatedAt || new Date().toISOString(),
          updatedAt: r.UpdatedAt || new Date().toISOString(),
        }));
      }

      // Import Expenses
      if (workbook.SheetNames.includes('Expenses')) {
        const sheet = workbook.Sheets['Expenses'];
        const rows = XLSX.utils.sheet_to_json(sheet);
        (importedData as any).expenses = rows.map((r: any) => ({
          id: r.ID || '',
          name: r.Name || '',
          amount: Number(r.Amount) || 0,
          date: r.Date || new Date().toISOString(),
          category: r.Category || 'other',
        }));
      }

      // Import AI/local-only JSON blocks
      if (workbook.SheetNames.includes('AI Data')) {
        const sheet = workbook.Sheets['AI Data'];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        const map: Record<string, any> = {};
        rows.forEach((row: any) => {
          if (row.Key && row.JSON) {
            try { map[row.Key] = JSON.parse(row.JSON); } catch { /* ignore */ }
          }
        });
  if (map['aiAnalyses']) (importedData as any).aiAnalyses = map['aiAnalyses'];
  if (map['freelance-flow-ai-persistent-data']) (importedData as any).aiPersistentData = map['freelance-flow-ai-persistent-data'];
        if (map['ai-writing-presets']) (importedData as any).aiWritingPresets = map['ai-writing-presets'];
        if (map['ai-writing-history']) (importedData as any).aiWritingHistory = map['ai-writing-history'];
        if (map['ai-writing-versions']) (importedData as any).aiWritingVersions = map['ai-writing-versions'];
        if (map['freelance-flow-filter-presets']) (importedData as any).filterPresets = map['freelance-flow-filter-presets'];
      }

      // Parse Settings sheet into appSettings if available
      try {
        if (workbook.SheetNames.includes('Settings')) {
          const sheet = workbook.Sheets['Settings'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const kv: Record<string, any> = {};
          rows.forEach((r: any) => {
            const k = r.Setting ?? r['Setting'] ?? r[0];
            const v = r.Value ?? r['Value'] ?? r[1];
            if (k != null) kv[String(k)] = v;
          });
          const base = initialAppData.appSettings;
          const langRaw = String(kv['Language'] ?? base.language).toLowerCase();
          const language = langRaw === 'vi' ? 'vi' : 'en';
          const currencyRaw = String(kv['Currency'] ?? base.currency).toUpperCase();
          const currency = currencyRaw === 'USD' ? 'USD' : 'VND';
          const providerRaw = String(kv['Preferred Model Provider'] ?? base.preferredModelProvider).toLowerCase();
          const preferredModelProvider = providerRaw === 'openai' ? 'openai' : 'google';
          const googleModel = String((kv['Google Model'] ?? base.googleModel) || '');
          const trashDays = parseInt(String(kv['Trash Auto Delete Days'] ?? base.trashAutoDeleteDays), 10);
          const themePrimary = String((kv['Theme Primary'] ?? base.theme.primary) || '');
          const themeAccent = String((kv['Theme Accent'] ?? base.theme.accent) || '');

          (importedData as any).appSettings = {
            ...base,
            language,
            currency,
            preferredModelProvider,
            googleModel: googleModel || base.googleModel,
            trashAutoDeleteDays: Number.isFinite(trashDays) ? trashDays : base.trashAutoDeleteDays,
            theme: { ...base.theme, primary: themePrimary || base.theme.primary, accent: themeAccent || base.theme.accent },
            // Keep complex arrays from base as they aren't fully represented in Excel
            statusSettings: base.statusSettings,
            dashboardColumns: base.dashboardColumns,
            widgets: base.widgets,
          } as any;
        }
      } catch (e) {
        console.warn('Failed to parse Settings sheet; using defaults', e);
      }

      // Use default values for complex data that can't be easily represented in Excel
      importedData.quotes = [];
      importedData.collaboratorQuotes = [];
      importedData.quoteTemplates = [];
      importedData.notes = [];
      importedData.events = [];
      importedData.workSessions = [];
      importedData.appSettings = (importedData as any).appSettings || initialAppData.appSettings;

      return importedData;
    } catch (error) {
      console.error('Excel import failed:', error);
      throw new Error('Failed to import data from Excel file');
    }
  }

  /**
   * Create backup with Excel format - compatible with existing backup system
   */
  static async createManualBackup(data: AppData): Promise<{ blob: Blob; filename: string }> {
    return this.exportToExcel(data);
  }

  /**
   * Export all backups as Excel files in a zip
   * For now, just export current data as Excel
   */
  static async exportAllBackupsAsExcel(backups: any[]): Promise<{ blob: Blob; filename: string }> {
    try {
      const XLSX = await getXLSX();
      
      // Create workbook with multiple sheets for different backup versions
      const workbook = XLSX.utils.book_new();
      
      // Add summary sheet
      const summaryData = [
        ['Freelance Flow - All Backups Export'],
        ['Export Date', new Date().toISOString()],
        ['Total Backups', backups.length],
        [''],
        ['Backup List:']
      ];
      
      backups.forEach((backup, index) => {
        summaryData.push([
          `Backup ${index + 1}`,
          new Date(backup.timestamp).toLocaleDateString(),
          `${backup.data.tasks?.length || 0} tasks`,
          backup.version || '1.0'
        ]);
      });
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Add latest backup data in detail
      if (backups.length > 0) {
        const latestBackup = backups[0];
        
        // Add a reference sheet for latest data
        const latestDataSheet = XLSX.utils.aoa_to_sheet([
          ['Latest Backup Data'],
          ['Timestamp', new Date(latestBackup.timestamp).toISOString()],
          ['Tasks', latestBackup.data.tasks?.length || 0],
          ['Clients', latestBackup.data.clients?.length || 0],
          ['Quotes', latestBackup.data.quotes?.length || 0],
          [''],
          ['Note: For detailed data, please export individual backup']
        ]);
        XLSX.utils.book_append_sheet(workbook, latestDataSheet, 'Latest Data');
      }
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `freelance-flow-all-backups-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      return { blob, filename };
    } catch (error) {
      console.error('Export all backups as Excel failed:', error);
      throw new Error('Failed to export all backups as Excel');
    }
  }

  /**
   * Check if file is Excel format
   */
  static isExcelFile(file: File): boolean {
    const excelMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    return excelMimeTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.xlsx') || 
           file.name.toLowerCase().endsWith('.xls');
  }

  /**
   * Validate Excel backup file structure
   */
  static async validateExcelBackup(file: File): Promise<{ valid: boolean; message: string }> {
    try {
      if (!this.isExcelFile(file)) {
        return { valid: false, message: 'File is not an Excel format (.xlsx/.xls)' };
      }

      const XLSX = await getXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Check for required sheets
      const requiredSheets = ['Tasks', 'Clients'];
      const hasRequiredSheets = requiredSheets.some(sheet => workbook.SheetNames.includes(sheet));
      
      if (!hasRequiredSheets) {
        return { valid: false, message: 'Excel file does not contain required data sheets (Tasks, Clients)' };
      }
      
      return { valid: true, message: 'Excel backup file is valid' };
    } catch (error) {
      return { valid: false, message: 'Failed to read Excel file: ' + (error as Error).message };
    }
  }
}
