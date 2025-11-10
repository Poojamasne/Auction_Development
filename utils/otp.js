const axios = require('axios');
const db = require('../db');

const TWO_FACTOR_API_KEY = "64896017-8585-11f0-a562-0200cd936042";
const TEMPLATE_NAME = "SMS OTP";   // ✅ Updated Template Name from 2Factor

exports.sendOTP = async (phone_number, person_name = "User") => {
  try {
    const cleanedPhone = phone_number.replace(/\D/g, "");

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    console.log(`Sending OTP to: ${cleanedPhone}`);
    console.log(`OTP: ${otp}`);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ Method 1: Approved TEMPLATE SMS on 2Factor
    try {
      const templateUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}/${encodeURIComponent(TEMPLATE_NAME)}?var1=${encodeURIComponent(person_name)}`;

      console.log(`Trying Template SMS: ${templateUrl}`);

      const response = await axios.get(templateUrl, { timeout: 15000 });

      console.log("Template SMS Response:", response.data);

      if (response.data.Status === "Success") {
        await db.query(
          `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, verified)
           VALUES (?, ?, ?, ?, ?)`,
          [cleanedPhone, otp, sessionId, expiresAt, false]
        );

        console.log(`OTP sent successfully using APPROVED TEMPLATE SMS ✅`);
        return sessionId;
      }

      throw new Error(`Template SMS failed: ${response.data.Details}`);
    } catch (err) {
      console.log(`Template SMS failed: ${err.message}`);

      // Fallback: Simple SMS (if template fails)
      try {
        const simpleSmsUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanedPhone}/${otp}`;

        console.log(`Trying Simple SMS fallback: ${simpleSmsUrl}`);

        const simpleResponse = await axios.get(simpleSmsUrl, { timeout: 15000 });

        console.log("Simple SMS Response:", simpleResponse.data);

        if (simpleResponse.data.Status === "Success") {
          await db.query(
            `INSERT INTO otp_verifications (phone_number, otp, session_id, expires_at, verified)
             VALUES (?, ?, ?, ?, ?)`,
            [cleanedPhone, otp, sessionId, expiresAt, false]
          );

          console.log(`OTP sent successfully via SIMPLE SMS ✅`);
          return sessionId;
        }
      } catch (simpleError) {
        console.log(`Simple SMS failed: ${simpleError.message}`);
      }

      // Final Fallback: Transactional SMS
      try {
        const fallbackResponse = await axios.post(
          `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`,
          `From=TSPENT&To=${cleanedPhone}&Msg=Dear ${encodeURIComponent(person_name)}, your one-time password (OTP) for EasyEAuction account verification is ${otp}. - TPS ENTERPRISES`,
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

          console.log(`OTP sent successfully via TRANSACTIONAL SMS ✅`);
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
