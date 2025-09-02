// Test script to verify PouchDB conflict resolution
import { PouchDBService } from '../src/lib/pouchdb-service';

async function testConflictResolution() {
  console.log('Testing PouchDB conflict resolution...');
  
  try {
    // Check database health
    const health = await PouchDBService.checkDatabaseHealth();
    console.log('Database health:', health);
    
    if (!health.healthy && health.conflicts > 0) {
      console.log(`Found ${health.conflicts} conflicts, attempting recovery...`);
      await PouchDBService.manualRecovery();
      
      // Check health again
      const healthAfter = await PouchDBService.checkDatabaseHealth();
      console.log('Database health after recovery:', healthAfter);
    }
    
    // Try to load app data
    const appData = await PouchDBService.loadAppData();
    console.log('Successfully loaded app data. Tasks:', appData.tasks.length);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  testConflictResolution();
}

export { testConflictResolution };
