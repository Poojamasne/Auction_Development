const axios = require('axios');
const FormData = require('form-data');

// Use promotional API key directly
const PROMOTIONAL_API_KEY = '64896017-8585-11f0-a562-0200cd936042';

/**
 * Send Template SMS using 2factor.in TSMS endpoint (EXACTLY like your curl)
 */
exports.sendTemplateSMS = async (phone_number, templateParams) => {
  try {
    console.log(`🔑 Using API Key: ${PROMOTIONAL_API_KEY}`);
    
    // Clean and format phone number
    const cleanedPhone = phone_number.replace(/\D/g, '');
    console.log(`📱 Original phone: ${phone_number}, Cleaned: ${cleanedPhone}`);
    
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`📱 Final formatted phone: ${formattedPhone}`);
    console.log(`📋 Template Parameters:`, templateParams);
    
    // ✅ EXACT TSMS ENDPOINT FROM YOUR CURL
    const apiUrl = `https://2factor.in/API/V1/${PROMOTIONAL_API_KEY}/ADDON_SERVICES/SEND/TSMS`;
    
    // Create FormData exactly like your curl command
    const formData = new FormData();
    
    formData.append('From', 'ZONIXT');
    formData.append('To', formattedPhone);
    formData.append('TemplateName', 'EasyAuction');
    formData.append('VAR1', templateParams.VAR1 || '');
    formData.append('VAR2', templateParams.VAR2 || '');
    formData.append('VAR3', templateParams.VAR3 || '');

    console.log('🌐 Calling Template SMS API (TSMS)...');
    console.log('🔗 URL:', apiUrl);
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 15000
    });
    
    const data = response.data;
    console.log('📊 Full API Response:', JSON.stringify(data, null, 2));
    
    if (data.Status === 'Success') {
      console.log('✅ Template SMS sent successfully!');
      return {
        success: true,
        status: 'sent',
        details: data
      };
    } else {
      console.error('❌ API returned error status:', data.Status);
      throw new Error(data.Details || `API Error: ${data.Status}`);
    }
    
  } catch (error) {
    console.error('❌ Error sending template SMS:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('📊 API Response Status:', error.response.status);
      console.error('📊 API Response Data:', error.response.data);
      throw new Error(`Template SMS failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error(`Template SMS failed: ${error.message}`);
  }
};

/**
 * Send Auction Invitation using Template SMS
 */
exports.sendAuctionInvitation = async (phone_number, auctionDetails) => {
  try {
    const { title, eventDateTime, userName = 'Participant' } = auctionDetails;
    
    console.log(`🎯 Sending auction invitation to ${phone_number}`);
    console.log(`📝 Details: ${userName}, ${title}, ${eventDateTime}`);
    
    return await exports.sendTemplateSMS(phone_number, {
      VAR1: userName,
      VAR2: title, 
      VAR3: eventDateTime
    });
  } catch (error) {
    console.error('❌ Error sending auction invitation:', error.message);
    throw error;
  }
};

/**
 * Check SMS balance
 */
exports.checkBalance = async () => {
  try {
    const apiUrl = `https://2factor.in/API/V1/${PROMOTIONAL_API_KEY}/BALANCE/TSMS`;
    
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const data = response.data;
    
    console.log('💰 Balance check response:', data);
    
    return {
      success: data.Status === 'Success',
      balance: data.Details,
      details: data
    };
    
  } catch (error) {
    console.error('❌ Balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
