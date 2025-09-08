// Test environment variables for Vercel deployment
console.log('Environment Variables Check:');
console.log('VERCEL_BLOB_STORE_URL:', process.env.VERCEL_BLOB_STORE_URL);
console.log('BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('VERCEL_URL:', process.env.VERCEL_URL);

export {};
