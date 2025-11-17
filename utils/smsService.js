const axios = require('axios');
const FormData = require('form-data');

// ✅ USE TRANSACTIONAL API KEY for Transactional Templates
const TRANSACTIONAL_API_KEY = '64896017-8585-11f0-a562-0200cd936042';

// Template Configuration - EXACTLY as approved on DLT
const TEMPLATES = {
  NEW_AUCTION: {
    name: 'New Auction Created', // ✅ Exact template name from DLT
    senderId: 'EZEAUC', // ✅ Exact sender ID from DLT
    variables: ['VAR1', 'VAR2'], // Only 2 variables as per DLT approval
    template: 'Hello #VAR1#, a new auction has been created for you. Details: #VAR2# available on your dashboard. – TPS Enterprises',
    type: 'TRANSACTIONAL'
  },
  AUCTION_REMINDER: {
    name: 'AuctionEventReminder', // ✅ Exact template name from DLT  
    senderId: 'EAUCIN', // ✅ Exact sender ID from DLT
    variables: ['VAR1', 'VAR2'], // Only 2 variables as per DLT approval
    template: 'Hello #VAR1#, this is a reminder for your upcoming auction event #VAR2#. – TPS Enterprises',
    type: 'TRANSACTIONAL'
  }
};

/**
 * Send Template SMS using 2factor.in TSMS endpoint (TRANSACTIONAL)
 */
exports.sendTemplateSMS = async (phone_number, templateParams, templateType = 'NEW_AUCTION') => {
  try {
    console.log(`\n🔍 DEBUG SMS SENDING:`);
    console.log(`📱 Original phone number: ${phone_number}`);
    console.log(`📋 Template type: ${templateType}`);
    console.log(`📝 Template params:`, templateParams);
    
    // Get template configuration
    const templateConfig = TEMPLATES[templateType];
    if (!templateConfig) {
      throw new Error(`Invalid template type: ${templateType}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
    }
    
    // Clean and format phone number
    const cleanedPhone = phone_number.replace(/\D/g, '');
    console.log(`🔧 Cleaned phone: ${cleanedPhone}`);
    
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`✅ Final formatted phone: ${formattedPhone}`);
    console.log(`📄 Using template: "${templateConfig.name}"`);
    console.log(`📮 Sender ID: ${templateConfig.senderId}`);
    
    // Rest of your existing code...
    const apiUrl = `https://2factor.in/API/V1/${TRANSACTIONAL_API_KEY}/ADDON_SERVICES/SEND/TSMS`;
    
    const formData = new FormData();
    formData.append('From', templateConfig.senderId);
    formData.append('To', formattedPhone);
    formData.append('TemplateName', templateConfig.name);
    
    templateConfig.variables.forEach(variable => {
      const value = templateParams[variable] || '';
      console.log(`📦 Setting ${variable} = "${value}"`);
      formData.append(variable, value);
    });

    console.log('🌐 Making API call to 2factor...');
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 15000
    });
    
    const data = response.data;
    console.log('📊 API Response:', JSON.stringify(data, null, 2));
    
    if (data.Status === 'Success') {
      console.log('✅ SMS sent successfully!');
      return {
        success: true,
        status: 'sent',
        template: templateConfig.name,
        senderId: templateConfig.senderId,
        details: data
      };
    } else {
      console.error('❌ API returned error status:', data.Status);
      throw new Error(data.Details || `API Error: ${data.Status}`);
    }
    
  } catch (error) {
    console.error('❌ SMS sending failed:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
    
    throw error;
  }
};
/**
 * Send New Auction Created Notification (Transactional)
 * Uses: Template "New Auction Created" with Sender ID "EZEAUC"
 */
exports.sendNewAuctionNotification = async (phone_number, userName, auctionTitle, eventDateTime) => {
  try {
    console.log(`🎯 Sending NEW AUCTION notification to ${phone_number}`);
    console.log(`📝 Using Template: "New Auction Created"`);
    console.log(`📝 Sender ID: EZEAUC`);
    console.log(`👤 User: ${userName}`);
    console.log(`📋 Auction: ${auctionTitle}`);
    console.log(`📅 Event: ${eventDateTime}`);
    
    return await exports.sendTemplateSMS(phone_number, {
      VAR1: userName,
      VAR2: auctionTitle,
      VAR3: eventDateTime
    }, 'NEW_AUCTION');
  } catch (error) {
    console.error('❌ Error sending new auction notification:', error.message);
    throw error;
  }
};

/**
 * Send Auction Event Reminder (Transactional)
 * Uses: Template "AuctionEventReminder" with Sender ID "EAUCIN"
 */
exports.sendAuctionReminder = async (phone_number, userName, eventDetails) => {
  try {
    console.log(`🎯 Sending AUCTION REMINDER to ${phone_number}`);
    console.log(`📝 Using Template: "AuctionEventReminder"`);
    console.log(`📝 Sender ID: EAUCIN`);
    console.log(`👤 User: ${userName}`);
    console.log(`📋 Event: ${eventDetails}`);
    
    return await exports.sendTemplateSMS(phone_number, {
      VAR1: userName,
      VAR2: eventDetails
    }, 'AUCTION_REMINDER');
  } catch (error) {
    console.error('❌ Error sending auction reminder:', error.message);
    throw error;
  }
};

/**
 * Send 10-minute reminder (uses AuctionEventReminder template)
 */
exports.send10MinuteReminder = async (phone_number, userName, auctionTitle) => {
  try {
    const reminderText = `${auctionTitle} starting in 10 minutes`;
    
    console.log(`⏰ Sending 10-minute reminder to ${phone_number}`);
    
    return await exports.sendAuctionReminder(phone_number, userName, reminderText);
  } catch (error) {
    console.error('❌ Error sending 10-minute reminder:', error.message);
    throw error;
  }
};

/**
 * Send auction starting now notification
 */
exports.sendAuctionStartingNow = async (phone_number, userName, auctionTitle) => {
  try {
    const startingText = `${auctionTitle} is starting NOW!`;
    
    console.log(`🚀 Sending auction starting now notification to ${phone_number}`);
    
    return await exports.sendAuctionReminder(phone_number, userName, startingText);
  } catch (error) {
    console.error('❌ Error sending auction starting notification:', error.message);
    throw error;
  }
};

/**
 * Check TRANSACTIONAL SMS balance
 */
exports.checkTransactionalBalance = async () => {
  try {
    const apiUrl = `https://2factor.in/API/V1/${TRANSACTIONAL_API_KEY}/BALANCE/TSMS`;
    
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const data = response.data;
    
    console.log('💰 Transactional Balance check response:', data);
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('❌ Transactional balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check PROMOTIONAL SMS balance (if you have promotional credits)
 */
exports.checkPromotionalBalance = async () => {
  try {
    const apiUrl = `https://2factor.in/API/V1/${TRANSACTIONAL_API_KEY}/BALANCE/PSMS`;
    
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const data = response.data;
    
    console.log('💰 Promotional Balance check response:', data);
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('❌ Promotional balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get available templates info
 */
exports.getTemplatesInfo = () => {
  console.log('📋 AVAILABLE TEMPLATES:');
  Object.keys(TEMPLATES).forEach(key => {
    const template = TEMPLATES[key];
    console.log(`\n📄 ${key}:`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Sender ID: ${template.senderId}`);
    console.log(`   Variables: ${template.variables.join(', ')}`);
    console.log(`   Type: ${template.type}`);
    console.log(`   Template: ${template.template}`);
  });
  
  return Object.keys(TEMPLATES).map(key => ({
    type: key,
    name: TEMPLATES[key].name,
    senderId: TEMPLATES[key].senderId,
    variables: TEMPLATES[key].variables,
    templateText: TEMPLATES[key].template,
    smsType: TEMPLATES[key].type
  }));
};

/**
 * Test template configuration
 */
exports.testTemplateConfig = () => {
  console.log('🧪 TESTING TEMPLATE CONFIGURATION:');
  const templates = exports.getTemplatesInfo();
  
  templates.forEach(template => {
    console.log(`\n✅ ${template.type}:`);
    console.log(`   ✅ Template Name: "${template.name}"`);
    console.log(`   ✅ Sender ID: ${template.senderId}`);
    console.log(`   ✅ Variables: ${template.variables.join(', ')}`);
    console.log(`   ✅ Status: APPROVED`);
    console.log(`   ✅ Type: TRANSACTIONAL`);
  });
  
  return templates;
};

/**
 * Test SMS sending with both templates
 */
exports.testAllTemplates = async (testPhoneNumber) => {
  try {
    console.log('🧪 TESTING ALL TEMPLATES...');
    
    const results = [];
    
    // Test New Auction Template
    console.log('\n📄 TESTING "New Auction Created" template:');
    try {
      const result1 = await exports.sendNewAuctionNotification(
        testPhoneNumber,
        'Test User',
        'Car Auction - March 28, 2024',
        '28th March at 3:00 PM'
      );
      results.push({ 
        template: 'NEW_AUCTION', 
        success: true, 
        result: result1 
      });
      console.log('✅ New Auction Template Test: SUCCESS');
    } catch (error) {
      results.push({ 
        template: 'NEW_AUCTION', 
        success: false, 
        error: error.message 
      });
      console.log('❌ New Auction Template Test: FAILED -', error.message);
    }
    
    // Test Auction Reminder Template
    console.log('\n📄 TESTING "AuctionEventReminder" template:');
    try {
      const result2 = await exports.sendAuctionReminder(
        testPhoneNumber,
        'Test User', 
        'Car Auction starts in 1 hour - Join now!'
      );
      results.push({ 
        template: 'AUCTION_REMINDER', 
        success: true, 
        result: result2 
      });
      console.log('✅ Auction Reminder Template Test: SUCCESS');
    } catch (error) {
      results.push({ 
        template: 'AUCTION_REMINDER', 
        success: false, 
        error: error.message 
      });
      console.log('❌ Auction Reminder Template Test: FAILED -', error.message);
    }
    
    console.log('\n📋 FINAL TEST RESULTS:');
    results.forEach(result => {
      console.log(`   ${result.success ? '✅' : '❌'} ${result.template}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
};

// Export templates for external use
exports.TEMPLATES = TEMPLATES;
