const smsService = require('./utils/smsService');

async function test() {
  try {
    console.log('Testing SMS service...');
    const result = await smsService.sendTemplateSMS('9503363209', {
      VAR1: 'Test User',
      VAR2: 'Test Auction',
      VAR3: '13 Oct 2025 at 3 PM'
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
