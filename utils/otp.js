const axios = require('axios');
const db = require('../db');

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const TEMPLATE_NAME = 'SMSTemplate1'; // Your registered template name

exports.sendOTP = async (phone_number, person_name = 'User') => {
  try {
    const cleanedPhone = phone_number.replace(/\D/g, '');
    
    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send OTP via 2factor.in API using TEMPLATE API
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}/TSPENT`,
      {
        params: {
          template_name: TEMPLATE_NAME,
          VAR1: person_name,
          VAR2: otp
        }
      }
    );
    
    const data = response.data;
    
    if (data.Status !== 'Success') {
      throw new Error(`Failed to send OTP: ${data.Details}`);
    }
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Store in database with actual OTP (not 'PENDING')
    await db.query(
      'INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at) VALUES (?, ?, ?, ?)',
      [phone_number, otp, sessionId, expiresAt]
    );
    
    return sessionId; 
    
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    throw error;
  }
};

exports.verifyOTP = async (sessionId, otp) => {
  try {
    // First verify locally from database (more reliable)
    const [otpRecords] = await db.query(
      'SELECT * FROM otp_verifications WHERE session_id = ? AND verified = FALSE AND expires_at > NOW()',
      [sessionId]
    );
    
    if (otpRecords.length === 0) {
      return false;
    }
    
    const storedOTP = otpRecords[0].otp;
    
    if (storedOTP === otp) {
      // Mark as verified in database
      await db.query(
        'UPDATE otp_verifications SET verified = TRUE WHERE session_id = ?',
        [sessionId]
      );
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    return false;
  }
};
