/**
 * Browser Console Script - Test Auto Backup
 * 
 * Copy and paste this into browser console to test auto backup functionality
 */

console.log('🧪 Testing Auto Backup Functionality');
console.log('=====================================\n');

// Check if BackupService is available (should be imported in useAppData)
if (typeof window !== 'undefined') {
  
  // 1. Check localStorage for existing backups
  console.log('1️⃣ Checking existing backups in localStorage...');
  const backupKey = 'freelance-flow-backup';
  const autoBackupKey = 'freelance-flow-auto-backup';
  
  try {
    const backupsRaw = localStorage.getItem(backupKey);
    const backups = backupsRaw ? JSON.parse(backupsRaw) : [];
    console.log(`📦 Found ${backups.length} backup(s) in localStorage`);
    
    if (backups.length > 0) {
      const latest = backups[0];
      console.log('📄 Latest backup:', {
        timestamp: new Date(latest.timestamp).toISOString(),
        version: latest.version,
        taskCount: latest.data?.tasks?.length || 0
      });
    }
    
    const lastAutoBackup = localStorage.getItem(autoBackupKey);
    if (lastAutoBackup) {
      console.log('⏰ Last auto backup:', new Date(parseInt(lastAutoBackup)).toISOString());
    } else {
      console.log('⏰ No auto backup timestamp found');
    }
  } catch (e) {
    console.error('❌ Error checking backups:', e);
  }
  
  // 2. Check local backup service settings
  console.log('\n2️⃣ Checking Local Backup Service settings...');
  const localBackupKey = 'freelance-flow-local-backup';
  try {
    const settingsRaw = localStorage.getItem(localBackupKey);
    const settings = settingsRaw ? JSON.parse(settingsRaw) : null;
    console.log('⚙️ Local backup settings:', settings);
  } catch (e) {
    console.error('❌ Error checking local backup settings:', e);
  }
  
  // 3. Monitor console for backup activity
  console.log('\n3️⃣ Instructions to test auto backup:');
  console.log('   1. Add a new task or edit an existing task');
  console.log('   2. Watch console for backup logs');
  console.log('   3. Check localStorage again using this script');
  console.log('   4. If local folder is selected, check folder for new files');
  
  // 4. Function to force clear auto backup timestamp (for testing)
  window.testForceBackup = function() {
    console.log('🔧 Force clearing auto backup timestamp for testing...');
    localStorage.removeItem(autoBackupKey);
    console.log('✅ Timestamp cleared. Next data change should trigger backup.');
  };
  
  // 5. Function to check backups again
  window.checkBackups = function() {
    console.log('\n🔍 Re-checking backups...');
    try {
      const backupsRaw = localStorage.getItem(backupKey);
      const backups = backupsRaw ? JSON.parse(backupsRaw) : [];
      console.log(`📦 Current backup count: ${backups.length}`);
      
      if (backups.length > 0) {
        backups.forEach((backup, i) => {
          console.log(`📄 Backup ${i + 1}:`, {
            timestamp: new Date(backup.timestamp).toISOString(),
            version: backup.version,
            taskCount: backup.data?.tasks?.length || 0
          });
        });
      }
      
      const lastAutoBackup = localStorage.getItem(autoBackupKey);
      if (lastAutoBackup) {
        console.log('⏰ Last auto backup:', new Date(parseInt(lastAutoBackup)).toISOString());
      }
    } catch (e) {
      console.error('❌ Error checking backups:', e);
    }
  };
  
  console.log('\n🛠️ Helper functions available:');
  console.log('   - testForceBackup() - Clear timestamp to force next backup');
  console.log('   - checkBackups() - Check current backup status');
  
} else {
  console.error('❌ This script must be run in browser environment');
}

console.log('\n✅ Auto backup test setup complete!');