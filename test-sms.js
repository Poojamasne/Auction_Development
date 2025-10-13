// test-template-sms.js
const smsService = require('./smsService');

async function testTemplateSMS() {
  console.log('🧪 Testing Template SMS Service...\n');
  
  // Test 1: Check balance first
  console.log('1. Checking balance...');
  const balance = await smsService.checkBalance();
  console.log('Balance result:', balance);
  
  if (!balance.success) {
    console.error('❌ Cannot check balance. API key may be invalid.');
    return;
  }
  
  console.log(`💰 Your Template SMS balance: ${balance.balance}\n`);
  
  // Test 2: Send template SMS (EXACTLY like your curl)
  console.log('2. Sending template SMS...');
  try {
    const result = await smsService.sendTemplateSMS('9503363209', {
      VAR1: 'Chetan Sir',
      VAR2: 'Zonixtec Grand Sale', 
      VAR3: '13 Oct 2025 at 3 PM'
    });
    console.log('✅ Template SMS result:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.success) {
      console.log('📱 Message ID:', result.details.Details);
    }
  } catch (error) {
    console.error('❌ Template SMS failed:', error.message);
  }
}

testTemplateSMS();
