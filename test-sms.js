const express = require('express');
const router = express.Router();
const smsService = require('../utils/smsService');

// Test SMS sending without authentication
router.get('/test-sms', async (req, res) => {
  try {
    console.log('🧪 TESTING SMS SERVICE...');
    
    const testPhoneNumber = '919876543210'; // Replace with your test number
    
    // Test 1: New Auction Template
    console.log('\n📄 TESTING "New Auction Created" template:');
    let result1;
    try {
      result1 = await smsService.sendNewAuctionNotification(
        testPhoneNumber,
        'Test User',
        'Test Car Auction',
        '28th March at 3:00 PM'
      );
      console.log('✅ New Auction Template: SUCCESS');
    } catch (error) {
      console.log('❌ New Auction Template: FAILED -', error.message);
      result1 = { success: false, error: error.message };
    }
    
    // Test 2: Auction Reminder Template
    console.log('\n📄 TESTING "AuctionEventReminder" template:');
    let result2;
    try {
      result2 = await smsService.sendAuctionReminder(
        testPhoneNumber,
        'Test User', 
        'Test Car Auction starting in 10 minutes'
      );
      console.log('✅ Auction Reminder Template: SUCCESS');
    } catch (error) {
      console.log('❌ Auction Reminder Template: FAILED -', error.message);
      result2 = { success: false, error: error.message };
    }
    
    // Check balance
    console.log('\n💰 CHECKING BALANCE:');
    const balance = await smsService.checkTransactionalBalance();
    
    res.json({
      success: true,
      message: 'SMS test completed',
      results: {
        newAuctionTest: result1,
        reminderTest: result2,
        balance: balance
      },
      templates: smsService.getTemplatesInfo()
    });
    
  } catch (error) {
    console.error('❌ SMS test failed:', error);
    res.status(500).json({
      success: false,
      message: 'SMS test failed',
      error: error.message
    });
  }
});

// Quick template info test
router.get('/templates', (req, res) => {
  try {
    const templates = smsService.getTemplatesInfo();
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
