"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BackupService } from '@/lib/backup-service';
import { i18n } from "@/lib/i18n";
import { useDashboard } from '@/contexts/dashboard-context';
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, RefreshCw, Trash2, Clock, Shield } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BackupManager() {
  const dashboardContext = useDashboard();
  const { toast } = useToast();
  const [backups, setBackups] = useState<any[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  const T = dashboardContext?.appSettings?.language ? i18n[dashboardContext.appSettings.language] : i18n.en;

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    const backupList = BackupService.getBackups();
    setBackups(backupList);
  };

  const handleCreateBackup = () => {
    if (!dashboardContext) return;
    
    const appData = {
      tasks: dashboardContext.tasks,
      quotes: dashboardContext.quotes,
      collaboratorQuotes: dashboardContext.collaboratorQuotes,
      clients: dashboardContext.clients,
      collaborators: dashboardContext.collaborators,
      quoteTemplates: dashboardContext.quoteTemplates,
      categories: dashboardContext.categories,
      appSettings: dashboardContext.appSettings,
    };

    // Sử dụng createManualBackup để đồng bộ với hệ thống cũ
    BackupService.createManualBackup(appData);
    loadBackups();
    toast({
      title: T.backupSuccessful || "Backup Created",
      description: T.backupSuccessfulDesc || "A new backup has been created successfully.",
    });
  };

  const handleRestore = async (timestamp: number) => {
    if (!dashboardContext) return;

    setIsRestoring(true);
    try {
      const restoredData = BackupService.restoreFromBackup(timestamp);
      if (restoredData) {
        const { setTasks, setQuotes, setCollaboratorQuotes, setClients, setCollaborators, setQuoteTemplates, setCategories, setAppSettings } = dashboardContext;
        
        const parsedTasks = restoredData.tasks.map((task: any) => ({
          ...task,
          startDate: new Date(task.startDate),
          deadline: new Date(task.deadline),
          deletedAt: task.deletedAt ? new Date(task.deletedAt).toISOString() : undefined,
        }));

        setTasks(parsedTasks);
        setQuotes(restoredData.quotes || []);
        setCollaboratorQuotes(restoredData.collaboratorQuotes || []);
        setClients(restoredData.clients || []);
        setCollaborators(restoredData.collaborators || []);
        setQuoteTemplates(restoredData.quoteTemplates || []);
        setCategories(restoredData.categories || []);
        setAppSettings(restoredData.appSettings);

        toast({
          title: "Data Restored",
          description: "Your data has been restored from backup successfully.",
        });
        
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Restore Failed",
        description: "Failed to restore data from backup.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportAllBackups = () => {
    BackupService.exportAllBackups();
    toast({
      title: "Backups Exported",
      description: "All backups have been exported to a file.",
    });
  };

  const handleClearOldBackups = () => {
    BackupService.clearOldBackups();
    loadBackups();
    toast({
      title: "Old Backups Cleared",
      description: "Old backups have been removed.",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getBackupAge = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    return 'Just now';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Advanced Backup & Recovery
        </CardTitle>
        <CardDescription>
          Automatic backup system to prevent data loss during app updates and deployments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Backup Status</span>
            <Badge variant="outline" className="text-green-600">
              <Clock className="w-3 h-3 mr-1" />
              Auto-backup enabled
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatic backups are created every 24 hours and when significant data changes occur.
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreateBackup} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Create Backup Now
          </Button>
          <Button onClick={handleExportAllBackups} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Export All Backups
          </Button>
          <Button onClick={handleClearOldBackups} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Old Backups
          </Button>
        </div>

        <Separator />

        {/* Backup List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Backups ({backups.length})</h4>
          {backups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No backups available. Create your first backup above.</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <div key={backup.timestamp} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Backup #{backups.length - index}
                      </span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">Latest</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(backup.timestamp)} • {getBackupAge(backup.timestamp)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tasks: {backup.data.tasks?.length || 0} • 
                      Clients: {backup.data.clients?.length || 0} • 
                      Version: {backup.version || '1.0'}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isRestoring}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will replace all current data with the backup from {formatDate(backup.timestamp)}. 
                          This action cannot be undone. Make sure to create a current backup first if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRestore(backup.timestamp)}>
                          Restore Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-600">💡 Data Protection Tips</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Backups are stored locally in your browser</li>
            <li>• Maximum 5 backups are kept automatically</li>
            <li>• Export backups regularly to external storage</li>
            <li>• Use the regular export function for full data portability</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
