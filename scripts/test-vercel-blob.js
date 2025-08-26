(async () => {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    console.log('Using token env var present:', !!token);
    if (!token) {
      console.error('No blob token found in env. Set BLOB_READ_WRITE_TOKEN in .env.local and restart.');
      process.exit(2);
    }

    let sdk;
    try {
      sdk = require('@vercel/blob');
    } catch (err) {
      console.error('@vercel/blob require failed:', err.message || err);
      process.exit(3);
    }

    const { put, list, del } = sdk;
    const testPath = `integration-test/test-backup-${Date.now()}.txt`;
    console.log('Uploading to', testPath);

    const body = Buffer.from('integration test ' + new Date().toISOString());

    try {
      const uploadRes = await put(testPath, body, { access: 'public', contentType: 'text/plain' });
      console.log('Upload result:', uploadRes && uploadRes.url ? uploadRes.url : uploadRes);
    } catch (e) {
      console.error('Upload failed:', e && e.message ? e.message : e);
      process.exit(4);
    }

    try {
      const listed = await list({ prefix: 'integration-test/' });
      console.log('List result count:', listed && listed.blobs ? listed.blobs.length : 0);
      if (listed && listed.blobs) {
        for (const b of listed.blobs) console.log('-', b.pathname, b.url);
      }
    } catch (e) {
      console.error('List failed:', e && e.message ? e.message : e);
    }

    try {
      await del(testPath);
      console.log('Deleted test file:', testPath);
    } catch (e) {
      console.error('Delete failed (non-fatal):', e && e.message ? e.message : e);
    }

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
