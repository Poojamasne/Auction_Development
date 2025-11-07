const axios = require('axios');
const db = require('../db');

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const TEMPLATE_NAME = "OTP Template"; // Make sure this matches DLT-approved template name

// ==========================
// ✅ SEND OTP
// ==========================
exports.sendOTP = async (phone_number, person_name = "User") => {
  try {
    const cleanedPhone = phone_number.replace(/\D/g, "");

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    console.log(`-----------------------------------`);
    console.log(`📩 Sending OTP`);
    console.log(`📞 To: ${cleanedPhone}`);
    console.log(`👤 Name: ${person_name}`);
    console.log(`🔢 OTP: ${otp}`);
    console.log(`-----------------------------------`);

    // First attempt: Template SMS
    try {
      const apiUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}/${TEMPLATE_NAME}`;

      console.log(`🌐 Sending via Template SMS → ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        params: {
          VAR1: person_name, // matches template variable
          VAR2: otp
        },
        timeout: 15000
      });

      console.log("📨 Template SMS Response:", response.data);

      if (response.data.Status === "Success") {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
          `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, method)
           VALUES (?, ?, ?, ?, ?)`,
          [cleanedPhone, otp, sessionId, expiresAt, "TEMPLATE_SMS"]
        );

        console.log(`✅ OTP sent successfully via TEMPLATE SMS`);

        return sessionId;
      }

      throw new Error(`Template SMS failed: ${response.data.Details}`);
    } catch (err) {
      console.log(`❌ Template SMS failed: ${err.message}`);
      console.log(`🔄 Switching to TRANSACTIONAL SMS fallback...`);

      // Fallback: Transactional SMS
      const fallbackResponse = await axios.post(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`,
        `From=TSPENT&To=${cleanedPhone}&Msg=Dear ${person_name}, Your one time password for verification is ${otp}. - TPS ENTERPRISES`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000
        }
      );

      console.log("📨 Transactional SMS Response:", fallbackResponse.data);

      if (fallbackResponse.data.Status !== "Success") {
        throw new Error(`Transactional SMS failed: ${fallbackResponse.data.Details}`);
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.query(
        `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, method)
         VALUES (?, ?, ?, ?, ?)`,
        [cleanedPhone, otp, sessionId, expiresAt, "TRANSACTIONAL_SMS"]
      );

      console.log(`✅ OTP sent successfully via TRANSACTIONAL SMS`);

      return sessionId;
    }
  } catch (error) {
    console.error(`❌ Error sending OTP:`, error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// ==========================
// ✅ VERIFY OTP
// ==========================
exports.verifyOTP = async (sessionId, otp) => {
  try {
    console.log(`-----------------------------------`);
    console.log(`🔍 Verifying OTP for session: ${sessionId}`);
    console.log(`User entered OTP: ${otp}`);
    console.log(`-----------------------------------`);

    const [records] = await db.query(
      `SELECT * FROM otp_verifications 
       WHERE session_id = ? AND verified = FALSE AND expires_at > NOW()`,
      [sessionId]
    );

    if (records.length === 0) {
      console.log(`❌ OTP expired or invalid session`);
      return { isValid: false, message: "OTP expired or invalid session" };
    }

    const storedOTP = records[0].otp;

    if (storedOTP !== otp) {
      console.log(`❌ OTP mismatch`);
      return { isValid: false, message: "Invalid OTP" };
    }

    await db.query(
      `UPDATE otp_verifications 
       SET verified = TRUE, verified_at = NOW() 
       WHERE session_id = ?`,
      [sessionId]
    );

    console.log(`✅ OTP verified successfully`);

    return { isValid: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error(`💥 Error verifying OTP:`, error.message);
    return { isValid: false, message: "Server error during OTP verification" };
  }
};
