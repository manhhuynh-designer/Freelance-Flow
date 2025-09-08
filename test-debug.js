// Test script to check debug endpoints
async function testDebugEndpoints() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('Testing debug endpoints...');
  
  try {
    // Test blob URLs
    const blobUrlResponse = await fetch(`${baseUrl}/api/debug/blob-urls`);
    const blobUrlData = await blobUrlResponse.json();
    console.log('Blob URL test:', JSON.stringify(blobUrlData, null, 2));
    
    // Test environment 
    const envResponse = await fetch(`${baseUrl}/api/debug/env`);
    const envData = await envResponse.json();
    console.log('Environment test:', JSON.stringify(envData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDebugEndpoints();
