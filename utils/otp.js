const axios = require('axios');
const db = require('../db');

const TWO_FACTOR_API_KEY = "64896017-8585-11f0-a562-0200cd936042";
const TEMPLATE_NAME = "SMS OTP";

exports.sendOTP = async (phone_number, person_name = "User") => {
  try {
    const cleanedPhone = phone_number.replace(/\D/g, "");

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    console.log(`Sending OTP to: ${cleanedPhone}`);
    console.log(`OTP: ${otp}`);

    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Method 1: Template SMS (Primary)
    try {
      const templateUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}/${TEMPLATE_NAME}?var1=${encodeURIComponent(person_name)}`;
      
      console.log(`Trying Template SMS: ${templateUrl}`);

      const response = await axios.get(templateUrl, {
        timeout: 15000
      });

      console.log("Template SMS Response:", response.data);

      if (response.data.Status === "Success") {
        await db.query(
          `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, verified)
           VALUES (?, ?, ?, ?, ?)`,
          [cleanedPhone, otp, sessionId, expiresAt, false]
        );

        console.log(`OTP sent successfully via TEMPLATE SMS`);
        return sessionId;
      }

      throw new Error(`Template SMS failed: ${response.data.Details}`);
    } catch (err) {
      console.log(`Template SMS failed: ${err.message}`);
      
      // Method 2: Simple SMS (Fallback)
      console.log(`Trying SIMPLE SMS fallback...`);
      
      try {
        const simpleSmsUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}`;
        
        console.log(`Trying Simple SMS: ${simpleSmsUrl}`);
        
        const simpleResponse = await axios.get(simpleSmsUrl, {
          timeout: 15000
        });

        console.log("Simple SMS Response:", simpleResponse.data);

        if (simpleResponse.data.Status === "Success") {
          await db.query(
            `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, verified)
             VALUES (?, ?, ?, ?, ?)`,
            [cleanedPhone, otp, sessionId, expiresAt, false]
          );

          console.log(`OTP sent successfully via SIMPLE SMS`);
          return sessionId;
        }
      } catch (simpleError) {
        console.log(`Simple SMS failed: ${simpleError.message}`);
      }

      // Method 3: Transactional SMS (Final Fallback)
      console.log(`Trying TRANSACTIONAL SMS fallback...`);
      
      try {
        const fallbackResponse = await axios.post(
          `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`,
          `From=TSPENT&To=${cleanedPhone}&Msg=Dear ${encodeURIComponent(person_name)}, Your OTP for verification is ${otp}. - TPS ENTERPRISES`,
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000
          }
        );

        console.log("Transactional SMS Response:", fallbackResponse.data);

        if (fallbackResponse.data.Status === "Success") {
          await db.query(
            `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, verified)
             VALUES (?, ?, ?, ?, ?)`,
            [cleanedPhone, otp, sessionId, expiresAt, false]
          );

          console.log(`OTP sent successfully via TRANSACTIONAL SMS`);
          return sessionId;
        } else {
          throw new Error(`Transactional SMS failed: ${fallbackResponse.data.Details}`);
        }
      } catch (transactionError) {
        console.log(`Transactional SMS failed: ${transactionError.message}`);
        throw new Error(`All SMS methods failed. Last error: ${transactionError.message}`);
      }
    }
  } catch (error) {
    console.error(`Error sending OTP:`, error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

exports.verifyOTP = async (sessionId, otp) => {
  try {
    console.log(`Verifying OTP for session: ${sessionId}`);
    console.log(`User entered OTP: ${otp}`);

    // Check without expiry time first (temporary fix)
    const [records] = await db.query(
      `SELECT * FROM otp_verifications 
       WHERE session_id = ? AND verified = FALSE`,
      [sessionId]
    );

    console.log('Records found:', records.length);

    if (records.length === 0) {
      console.log(`OTP not found or already verified`);
      return { isValid: false, message: "OTP expired or invalid session" };
    }

    const record = records[0];
    const storedOTP = record.otp;
    
    // Manual expiry check (10 minutes)
    const createdTime = new Date(record.created_at).getTime();
    const currentTime = new Date().getTime();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    if (currentTime - createdTime > tenMinutes) {
      console.log(`OTP expired manually`);
      return { isValid: false, message: "OTP expired" };
    }

    console.log(`Stored OTP: ${storedOTP}, Entered OTP: ${otp}`);
    console.log(`Created: ${record.created_at}, Current: ${new Date()}`);
    console.log(`Time difference: ${(currentTime - createdTime) / 1000} seconds`);

    if (storedOTP !== otp) {
      console.log(`OTP mismatch`);
      return { isValid: false, message: "Invalid OTP" };
    }

    await db.query(
      `UPDATE otp_verifications 
       SET verified = TRUE 
       WHERE session_id = ?`,
      [sessionId]
    );

    console.log(`OTP verified successfully`);
    return { isValid: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error(`Error verifying OTP:`, error.message);
    return { isValid: false, message: "Server error during OTP verification" };
  }
};
