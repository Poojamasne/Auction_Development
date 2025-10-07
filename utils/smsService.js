const axios = require('axios');

// Use the correct environment variable for promotional SMS
const PROMOTIONAL_API_KEY = process.env.PROMOTIONAL_API_KEY;
const TRANSACTIONAL_API_KEY = process.env.TWO_FACTOR_API_KEY;

/**
 * Send SMS using 2factor.in PROMOTIONAL endpoint
 */
exports.sendSMS = async (phone_number, message) => {
  try {
    // Validate API key
    if (!PROMOTIONAL_API_KEY) {
      throw new Error('Promotional API Key not configured');
    }

    console.log(`🔑 Using Promotional API Key: ${PROMOTIONAL_API_KEY.substring(0, 8)}...`);

    // Clean and validate phone number
    const cleanedPhone = phone_number.replace(/\D/g, '');
    
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`📱 Sending SMS to: ${formattedPhone}`);
    console.log(`📝 Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // ✅ USE PROMOTIONAL ENDPOINT
    const apiUrl = `https://2factor.in/API/V1/${PROMOTIONAL_API_KEY}/ADDON_SERVICES/SEND/PSMS`;
    
    const params = new URLSearchParams();
    params.append('From', 'ZONIXT');
    params.append('To', formattedPhone);
    params.append('Msg', message);

    console.log('🌐 Calling Promotional SMS API...');
    
    const response = await axios.post(apiUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    
    const data = response.data;
    
    if (data.Status !== 'Success') {
      throw new Error(`API Error: ${data.Details || JSON.stringify(data)}`);
    }
    
    console.log('✅ Promotional SMS sent successfully!');
    console.log('📊 Response:', data.Details);
    
    return {
      success: true,
      status: 'sent',
      details: data
    };
    
  } catch (error) {
    console.error('❌ Error sending promotional SMS:', error.message);
    
    if (error.response) {
      console.error('📊 API Response:', error.response.status, error.response.data);
      throw new Error(`SMS failed: ${error.response.data.Details || error.response.statusText}`);
    }
    
    throw new Error(`SMS failed: ${error.message}`);
  }
};

/**
 * Send SMS using DLT Approved Template with variables
 */
exports.sendTemplateSMS = async (phone_number, templateParams) => {
  try {
    if (!TRANSACTIONAL_API_KEY) {
      throw new Error('Transactional API Key not configured');
    }

    // Clean and format phone number
    const cleanedPhone = phone_number.replace(/\D/g, '');
    let formattedPhone = cleanedPhone;
    
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`📱 Sending Template SMS to: ${formattedPhone}`);
    console.log(`📋 Template Params:`, templateParams);
    
    // ✅ CORRECT TRANSACTIONAL TEMPLATE ENDPOINT (GET request)
    const apiUrl = `https://2factor.in/API/V1/${TRANSACTIONAL_API_KEY}/SMS/${formattedPhone}/AUTOGEN2`;
    
    const params = {
      TemplateName: 'ZONIXT', // Your template name
      VAR1: templateParams.VAR1 || 'Participant',
      VAR2: templateParams.VAR2 || '',
      VAR3: templateParams.VAR3 || '',
      VAR4: templateParams.VAR4 || '',
      VAR5: templateParams.VAR5 || ''
    };

    console.log('🌐 Calling Transactional Template API...');
    console.log('🔗 URL:', apiUrl);
    console.log('📦 Params:', params);
    
    const response = await axios.get(apiUrl, {
      params: params,
      timeout: 10000
    });
    
    const data = response.data;
    
    if (data.Status !== 'Success') {
      throw new Error(`API Error: ${data.Details || JSON.stringify(data)}`);
    }
    
    console.log('✅ Template SMS sent successfully!');
    console.log('📊 Response:', data.Details);
    
    return {
      success: true,
      status: 'sent',
      details: data
    };
    
  } catch (error) {
    console.error('❌ Error sending template SMS:', error.message);
    
    if (error.response) {
      console.error('📊 API Response:', error.response.status, error.response.data);
      throw new Error(`Template SMS failed: ${error.response.data?.Details || error.response.statusText}`);
    }
    
    throw new Error(`Template SMS failed: ${error.message}`);
  }
};

/**
 * Check Promotional SMS balance
 */
exports.checkBalance = async () => {
  try {
    const apiUrl = `https://2factor.in/API/V1/${PROMOTIONAL_API_KEY}/BALANCE/PSMS`;
    
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const data = response.data;
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('Balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check Transactional SMS balance
 */
exports.checkTransactionalBalance = async () => {
  try {
    const apiUrl = `https://2factor.in/API/V1/${TRANSACTIONAL_API_KEY}/BALANCE/SMS`;
    
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const data = response.data;
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('Transactional Balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
