'use server';

export async function testServerAction() {
  console.log('🧪 Test server action called');
  return { message: 'Server action working!' };
}
