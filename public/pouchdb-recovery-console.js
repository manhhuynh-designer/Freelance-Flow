// Browser console utility for PouchDB conflict resolution
// Paste this into browser console if you encounter database conflicts

window.pouchDBRecovery = {
  // Check database health
  async checkHealth() {
    try {
      const { PouchDBService } = await import('./src/lib/pouchdb-service');
      const health = await PouchDBService.checkDatabaseHealth();
      console.log('🏥 Database Health Report:', health);
      
      if (!health.healthy) {
        console.warn(`⚠️ Found ${health.conflicts} conflicts in ${health.totalDocs} documents`);
        console.log('💡 Run pouchDBRecovery.recover() to fix conflicts');
      } else {
        console.log('✅ Database is healthy!');
      }
      
      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return null;
    }
  },

  // Manually trigger conflict recovery
  async recover() {
    try {
      console.log('🔧 Starting manual database recovery...');
      const { PouchDBService } = await import('./src/lib/pouchdb-service');
      await PouchDBService.manualRecovery();
      console.log('✅ Recovery completed successfully!');
      
      // Check health after recovery
      const health = await PouchDBService.checkDatabaseHealth();
      console.log('📊 Post-recovery health:', health);
      
      return true;
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      return false;
    }
  },

  // Clear browser storage and refresh (nuclear option)
  async reset() {
    console.warn('💣 This will clear ALL browser data for this app!');
    const confirm = window.confirm('Are you sure you want to reset all data? This cannot be undone.');
    
    if (confirm) {
      try {
        // Clear IndexedDB
        indexedDB.deleteDatabase('freelance_flow_data');
        
        // Clear localStorage
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log('🧹 All data cleared. Refreshing page...');
        window.location.reload();
      } catch (error) {
        console.error('❌ Reset failed:', error);
      }
    }
  },

  // Load fresh data
  async reload() {
    try {
      console.log('🔄 Reloading app data...');
      const { PouchDBService } = await import('./src/lib/pouchdb-service');
      const data = await PouchDBService.loadAppData();
      console.log('✅ Data loaded successfully:', {
        tasks: data.tasks?.length || 0,
        clients: data.clients?.length || 0,
        quotes: data.quotes?.length || 0
      });
      
      // Trigger React Query refetch if available
      if (window.queryClient) {
        window.queryClient.invalidateQueries('appData');
        console.log('🔄 React Query cache invalidated');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Reload failed:', error);
      return null;
    }
  }
};

console.log('🛠️ PouchDB Recovery Tools loaded!');
console.log('Available commands:');
console.log('  • pouchDBRecovery.checkHealth() - Check database health');
console.log('  • pouchDBRecovery.recover() - Fix conflicts');
console.log('  • pouchDBRecovery.reload() - Reload data');
console.log('  • pouchDBRecovery.reset() - Nuclear reset (clears all data)');
