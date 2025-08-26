// Test script for Vercel Blob integration
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function testVercelBlob() {
  console.log('Testing Vercel Blob...');
  console.log('Token exists:', !!BLOB_TOKEN);
  console.log('Token starts with:', BLOB_TOKEN?.substring(0, 10) + '...');

  if (!BLOB_TOKEN) {
    console.log('No BLOB_READ_WRITE_TOKEN found');
    return;
  }

  try {
    // Test 1: List blobs
    console.log('\n1. Testing list...');
    const listResponse = await fetch('https://blob.vercel-storage.com/list', {
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
    });
    console.log('List status:', listResponse.status);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('List data:', JSON.stringify(listData, null, 2));
    } else {
      const errorText = await listResponse.text();
      console.log('List error:', errorText);
    }

    // Test 2: Upload a small test file
    console.log('\n2. Testing upload...');
    const testContent = JSON.stringify({ test: 'data', timestamp: new Date().toISOString() });
    const blob = new Blob([testContent], { type: 'application/json' });
    
    const uploadResponse = await fetch('https://blob.vercel-storage.com/upload?filename=test-backup.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
      body: blob,
    });
    
    console.log('Upload status:', uploadResponse.status);
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('Upload success:', uploadData);
    } else {
      const errorText = await uploadResponse.text();
      console.log('Upload error:', errorText);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testVercelBlob().catch(console.error);
