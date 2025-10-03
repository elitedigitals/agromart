import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function sendOTP(phoneNumber, otp) {
  const smsData = {
    SMS: {
      auth: {
        username: process.env.SMS_USERNAME ,
        apikey: process.env.SMS_APIKEY,
      },
      message: {
        sender: "AgroMart",  // must be an approved sender ID
        messagetext: `Your AgroMart OTP is ${otp}. It will expire in 10 minutes.`,
        flash: "0",
      },
      recipients: {
        gsm: [
          {
            msidn: phoneNumber,
            msgid: "unique_msg_id_123", // you can use a random string
          },
        ],
      },
    },
  };

  try {
    const response = await axios.post(
      "https://api.ebulksms.com/sendsms.json",
      smsData,
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("SMS Response:", response.data);
  } catch (error) {
    console.error("SMS sending failed:", error.response?.data || error.message);
  }
}
export default sendOTP;