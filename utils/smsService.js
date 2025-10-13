const axios = require('axios');

// Use the same API key for all SMS services
const SMS_API_KEY = '64896017-8585-11f0-a562-0200cd936042';

/**
 * Send Promotional SMS using 2factor.in PROMOTIONAL endpoint
 */
exports.sendSMS = async (phone_number, message) => {
  try {
    console.log(`🔑 Using SMS API Key: ${SMS_API_KEY.substring(0, 8)}...`);

    // Clean and validate phone number
    const cleanedPhone = phone_number.replace(/\D/g, '');
    
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`📱 Sending Promotional SMS to: ${formattedPhone}`);
    console.log(`📝 Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // ✅ PROMOTIONAL ENDPOINT
    const apiUrl = `https://2factor.in/API/V1/${SMS_API_KEY}/ADDON_SERVICES/SEND/PSMS`;
    
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
 * Send Template SMS using Transactional API (USING SAME API KEY)
 */
exports.sendTemplateSMS = async (phone_number, templateParams) => {
  try {
    console.log(`🔑 Using SMS API Key: ${SMS_API_KEY.substring(0, 8)}...`);

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
    
    // ✅ TRANSACTIONAL TEMPLATE ENDPOINT WITH SAME API KEY
    const apiUrl = `https://2factor.in/API/V1/${SMS_API_KEY}/ADDON_SERVICES/SEND/TSMS`;
    
    const formData = new URLSearchParams();
    formData.append('From', 'ZONIXT');
    formData.append('To', formattedPhone);
    formData.append('TemplateName', 'EasyAuction');
    formData.append('VAR1', templateParams.VAR1 || 'Participant');
    formData.append('VAR2', templateParams.VAR2 || '');
    formData.append('VAR3', templateParams.VAR3 || '');

    console.log('🌐 Calling Transactional Template API (TSMS)...');
    console.log('📦 Form Data:', {
      From: 'ZONIXT',
      To: formattedPhone,
      TemplateName: 'EasyAuction',
      VAR1: templateParams.VAR1,
      VAR2: templateParams.VAR2,
      VAR3: templateParams.VAR3
    });
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
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
    const apiUrl = `https://2factor.in/API/V1/${SMS_API_KEY}/BALANCE/PSMS`;
    
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const data = response.data;
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('Promotional Balance check error:', error.message);
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
    const apiUrl = `https://2factor.in/API/V1/${SMS_API_KEY}/BALANCE/TSMS`;
    
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
