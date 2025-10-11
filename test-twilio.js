require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Testing Twilio Configuration...\n');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'Not set');
console.log('Phone Number:', twilioPhoneNumber);
console.log('\n---\n');

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// Test 1: Verify credentials by fetching account info
console.log('Test 1: Verifying Twilio credentials...');
client.api.accounts(accountSid)
  .fetch()
  .then(account => {
    console.log('✅ Credentials are valid!');
    console.log('Account Status:', account.status);
    console.log('Account Type:', account.type);
    console.log('\n---\n');

    // Test 2: Check if the phone number exists in your account
    console.log('Test 2: Checking if phone number is valid...');
    return client.incomingPhoneNumbers.list({ phoneNumber: twilioPhoneNumber });
  })
  .then(phoneNumbers => {
    if (phoneNumbers.length > 0) {
      console.log('✅ Phone number is valid and belongs to your account!');
      console.log('Phone Number:', phoneNumbers[0].phoneNumber);
      console.log('Capabilities:', phoneNumbers[0].capabilities);
    } else {
      console.log('⚠️  Phone number not found in your Twilio account.');
      console.log('This might be because:');
      console.log('1. The number format is incorrect');
      console.log('2. You need to get a Twilio phone number first');
      console.log('\nTo get a phone number:');
      console.log('- Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
      console.log('- Or get a free trial number from the dashboard');
    }
    console.log('\n---\n');
    console.log('✅ Twilio setup test completed!');
    console.log('\nNext steps:');
    console.log('1. Make sure you have a valid Twilio phone number');
    console.log('2. For trial accounts, verify the phone numbers you want to test with');
    console.log('3. Start your server and test the OTP flow');
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    if (error.code === 20003) {
      console.error('\n⚠️  Authentication failed. Please check your Account SID and Auth Token.');
    } else if (error.code === 21608) {
      console.error('\n⚠️  Phone number not found. Please get a Twilio phone number first.');
    }
    console.error('\nFor help, visit: https://www.twilio.com/docs/usage/requests-to-twilio');
  });