const axios = require('axios');
const db = require('../db');

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const TEMPLATE_NAME = 'SMSTemplate1';

exports.sendOTP = async (phone_number, person_name = 'User') => {
  try {
    const cleanedPhone = phone_number.replace(/\D/g, '');
    
    // Check time restriction (10 AM - 9 PM for Service Explicit)
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 10 || currentHour >= 21) {
      throw new Error('OTP can only be sent between 10:00 AM and 9:00 PM due to telecom regulations. Please try during these hours.');
    }
    
    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔑 Sending OTP ${otp} to ${cleanedPhone} for ${person_name}`);
    console.log(`📞 Using template: ${TEMPLATE_NAME}`);
    
    // CORRECT API ENDPOINT - Use template name at the end
    const apiUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}/${TEMPLATE_NAME}`;
    
    console.log(`🌐 API URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      params: {
        VAR1: person_name,
        VAR2: otp
      },
      timeout: 15000
    });
    
    const data = response.data;
    console.log('📨 Template SMS Response:', data);
    
    if (data.Status !== 'Success') {
      throw new Error(`Failed to send OTP: ${data.Details}`);
    }
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store in database
    await db.query(
      'INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, method) VALUES (?, ?, ?, ?, ?)',
      [cleanedPhone, otp, sessionId, expiresAt, 'TEMPLATE_SMS']
    );
    
    console.log('✅ OTP sent successfully via template SMS');
    return sessionId; 
    
  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    if (error.response) {
      console.error('📡 API Error Response:', error.response.data);
    }
    throw error;
  }
};

exports.verifyOTP = async (sessionId, otp) => {
  try {
    console.log(`🔍 Verifying OTP for session: ${sessionId}`);
    
    const [otpRecords] = await db.query(
      'SELECT * FROM otp_verifications WHERE session_id = ? AND verified = FALSE AND expires_at > NOW()',
      [sessionId]
    );
    
    if (otpRecords.length === 0) {
      console.log('❌ OTP not found or expired');
      return { isValid: false, message: "OTP expired or invalid session" };
    }
    
    const storedOTP = otpRecords[0].otp;
    console.log(`🔑 Stored OTP: ${storedOTP}, User OTP: ${otp}`);
    
    if (storedOTP === otp) {
      await db.query(
        'UPDATE otp_verifications SET verified = TRUE WHERE session_id = ?',
        [sessionId]
      );
      console.log('✅ OTP verified successfully');
      return { isValid: true, message: "OTP verified successfully" };
    }
    
    console.log('❌ OTP mismatch');
    return { isValid: false, message: "Invalid OTP" };
    
  } catch (error) {
    console.error('💥 Error verifying OTP:', error.message);
    return { isValid: false, message: "Server error during OTP verification" };
  }
};
