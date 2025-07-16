"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocalBackupService } from '@/lib/local-backup-service';
import { i18n } from "@/lib/i18n";
import { useDashboard } from '@/contexts/dashboard-context';
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Download, AlertCircle, HardDrive, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LocalBackupManager() {
  const dashboardContext = useDashboard();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const T = dashboardContext?.appSettings?.language ? i18n[dashboardContext.appSettings.language] : i18n.en;
  const currentLanguage = dashboardContext?.appSettings?.language || 'en';

  useEffect(() => {
    loadLocalSettings();
    LocalBackupService.restoreSettings();
  }, []);

  const loadLocalSettings = () => {
    const settings = LocalBackupService.getSettings();
    setLocalSettings(settings);
  };

  const handleSelectFolder = async () => {
    if (!LocalBackupService.isFileSystemAccessSupported()) {
      toast({
        variant: 'destructive',
        title: currentLanguage === 'vi' ? "Trình duyệt không hỗ trợ" : "Browser Not Supported",
        description: currentLanguage === 'vi' 
          ? "Trình duyệt của bạn không hỗ trợ chọn thư mục. Vui lòng sử dụng Chrome 86+ hoặc Edge 86+ cho tính năng này."
          : "Your browser doesn't support folder selection. Please use Chrome 86+ or Edge 86+ for this feature.",
      });
      return;
    }

    setIsSelectingFolder(true);
    try {
      const success = await LocalBackupService.selectBackupFolder();
      if (success && dashboardContext) {
        await LocalBackupService.autoSaveIfNeeded(dashboardContext);
        toast({
          title: currentLanguage === 'vi' ? "Đã chọn thư mục" : "Folder Selected",
          description: currentLanguage === 'vi' 
            ? "Thư mục sao lưu đã được thiết lập thành công. Tự động lưu hiện đã được bật."
            : "Backup folder has been set up successfully. Auto-save is now enabled.",
        });
        loadLocalSettings();
      } else {
        toast({
          variant: 'destructive',
          title: currentLanguage === 'vi' ? "Chọn thất bại" : "Selection Failed",
          description: currentLanguage === 'vi' 
            ? "Không thể chọn thư mục sao lưu. Vui lòng thử lại."
            : "Could not select backup folder. Please try again.",
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      toast({
        variant: 'destructive',
        title: currentLanguage === 'vi' ? "Chọn thất bại" : "Selection Failed",
        description: currentLanguage === 'vi' 
          ? "Không thể chọn thư mục sao lưu. Vui lòng thử lại."
          : "Could not select backup folder. Please try again.",
      });
    } finally {
      setIsSelectingFolder(false);
    }
  };

  const handleSaveToFolder = async () => {
    if (!dashboardContext) return;
    
    setIsSaving(true);
    try {
      const success = await LocalBackupService.saveBackupToFolder(dashboardContext);
      if (success) {
        toast({
          title: currentLanguage === 'vi' ? "Đã lưu sao lưu" : "Backup Saved",
          description: currentLanguage === 'vi' 
            ? "Sao lưu thủ công đã được lưu vào thư mục đã chọn."
            : "Manual backup has been saved to the selected folder.",
        });
        loadLocalSettings();
      } else {
        toast({
          variant: 'destructive',
          title: currentLanguage === 'vi' ? "Lưu thất bại" : "Save Failed",
          description: currentLanguage === 'vi' 
            ? "Không thể lưu sao lưu. Vui lòng chọn thư mục trước."
            : "Could not save backup. Please select a folder first.",
        });
      }
    } catch (error) {
      console.error('Error saving backup:', error);
      toast({
        variant: 'destructive',
        title: currentLanguage === 'vi' ? "Lỗi lưu" : "Save Error",
        description: currentLanguage === 'vi' 
          ? "Đã xảy ra lỗi khi lưu sao lưu."
          : "An error occurred while saving backup.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableAutoSave = () => {
    LocalBackupService.disableAutoSave();
    toast({
      title: currentLanguage === 'vi' ? "Đã tắt tự động lưu" : "Auto-Save Disabled",
      description: currentLanguage === 'vi' 
        ? "Tự động lưu thư mục cục bộ đã được tắt."
        : "Local folder auto-save has been disabled.",
    });
    loadLocalSettings();
  };

  const handleManualDownload = () => {
    if (!dashboardContext) return;
    
    try {
      // Include filter presets in the export
      const filterPresets = JSON.parse(localStorage.getItem('freelance-flow-filter-presets') || '[]');
      const appDataWithPresets = {
        ...dashboardContext,
        filterPresets
      };
      
      const dataStr = JSON.stringify(appDataWithPresets, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `freelance-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: currentLanguage === 'vi' ? "Đã tải sao lưu" : "Backup Downloaded",
        description: currentLanguage === 'vi' 
          ? "Tệp sao lưu đã được tải xuống vào thư mục Downloads của bạn."
          : "Backup file has been downloaded to your Downloads folder.",
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        variant: 'destructive',
        title: currentLanguage === 'vi' ? "Lỗi lưu" : "Save Error",
        description: currentLanguage === 'vi' 
          ? "Đã xảy ra lỗi khi lưu sao lưu."
          : "An error occurred while saving backup.",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isSupported = LocalBackupService.isFileSystemAccessSupported();
  const hasAutoSave = localSettings?.autoSaveEnabled;
  const shouldSuggestDownload = LocalBackupService.shouldSuggestDownload();

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {T.backupAndRestore || "Backup & Restore"}
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium text-sm">
                    {currentLanguage === 'vi' ? "Cách hoạt động:" : "How it works:"}
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• {currentLanguage === 'vi' ? "Tự động tạo tệp sao lưu mỗi 24 giờ" : "Automatically creates backup file every 24 hours"}</li>
                    <li>• {currentLanguage === 'vi' ? "Tệp được lưu trực tiếp vào thư mục bạn chọn" : "Files are saved directly to your chosen folder"}</li>
                    <li>• {currentLanguage === 'vi' ? "Không cần internet - mọi thứ lưu trên máy tính của bạn" : "No internet required - everything saves on your computer"}</li>
                    <li>• {currentLanguage === 'vi' ? "Quyền thư mục chỉ được yêu cầu một lần mỗi phiên" : "Folder permission is only requested once per session"}</li>
                    <li>• {currentLanguage === 'vi' ? "Tải xuống thủ công hoạt động trên tất cả trình duyệt" : "Manual download works in all browsers"}</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            {T.backupDesc || "Manage data backups with multiple protection options"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Support Warning */}
          {!isSupported && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {currentLanguage === 'vi' 
                  ? 'Trình duyệt không hỗ trợ chọn thư mục. Sử dụng Chrome 86+ hoặc Edge 86+ cho tính năng này. Bạn vẫn có thể tải xuống thủ công.'
                  : 'Browser doesn\'t support folder selection. Use Chrome 86+ or Edge 86+ for this feature. You can still download manually.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Local Folder Backup */}
          {isSupported && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  {localSettings?.lastAutoSave && (
                    <p className="text-xs text-muted-foreground">
                      {currentLanguage === 'vi' ? "Lần tự động lưu cuối" : "Last auto save"}: {formatDate(localSettings.lastAutoSave)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {localSettings?.folderHandle && (
                  <Badge variant="secondary">
                    {hasAutoSave 
                      ? (currentLanguage === 'vi' ? "Tự động bật" : "Auto Enabled") 
                      : (currentLanguage === 'vi' ? "Đã bật" : "Enabled")
                    }
                  </Badge>
                )}
                {localSettings?.folderHandle ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSaveToFolder}
                      disabled={isSaving}
                    >
                      {isSaving 
                        ? (currentLanguage === 'vi' ? "Đang lưu..." : "Saving...") 
                        : (currentLanguage === 'vi' ? "Lưu ngay" : "Save Now")
                      }
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDisableAutoSave}
                    >
                      {currentLanguage === 'vi' ? "Tắt tự động lưu" : "Disable Auto Save"}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={handleSelectFolder}
                    disabled={isSelectingFolder}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    {isSelectingFolder 
                      ? (currentLanguage === 'vi' ? "Đang chọn..." : "Selecting...") 
                      : (currentLanguage === 'vi' ? "Chọn thư mục" : "Select Folder")
                    }
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Manual Download with Suggestion */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium">{currentLanguage === 'vi' ? "Tải xuống thủ công" : "Manual Download"}</p>
                <p className="text-sm text-muted-foreground">{currentLanguage === 'vi' ? "Tải sao lưu trực tiếp vào thư mục Downloads" : "Download backup directly to Downloads folder"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {shouldSuggestDownload && (
                <Badge variant="outline">
                  {currentLanguage === 'vi' ? "Đề xuất" : "Suggested"}
                </Badge>
              )}
              <Button 
                variant="outline"
                onClick={handleManualDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                {currentLanguage === 'vi' ? "Tải về Dữ Liệu" : "Download Data"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Default export for backwards compatibility
export default LocalBackupManager;
