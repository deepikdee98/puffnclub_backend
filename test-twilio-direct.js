require('dotenv').config();
const twilio = require('twilio');

console.log('='.repeat(60));
console.log('TWILIO CONFIGURATION TEST');
console.log('='.repeat(60));

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');
console.log('   TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '✗ Missing');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.log('\n❌ Twilio credentials are missing!');
  console.log('Please add them to your .env file.');
  process.exit(1);
}

// Initialize Twilio client
console.log('\n2. Initializing Twilio Client...');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Test 1: Verify account
console.log('\n3. Testing Account Connection...');
client.api.accounts(process.env.TWILIO_ACCOUNT_SID)
  .fetch()
  .then(account => {
    console.log('   ✓ Account Status:', account.status);
    console.log('   ✓ Account Name:', account.friendlyName);
    
    // Test 2: Check phone number
    console.log('\n4. Checking Phone Number...');
    return client.incomingPhoneNumbers.list({ limit: 20 });
  })
  .then(phoneNumbers => {
    console.log('   Available Phone Numbers:', phoneNumbers.length);
    
    if (phoneNumbers.length === 0) {
      console.log('   ⚠️  No phone numbers found!');
      console.log('   You need to get a phone number from Twilio Console:');
      console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/incoming');
    } else {
      phoneNumbers.forEach(number => {
        console.log('   -', number.phoneNumber, '(', number.friendlyName, ')');
      });
      
      const configuredNumber = process.env.TWILIO_PHONE_NUMBER;
      const hasConfiguredNumber = phoneNumbers.some(n => n.phoneNumber === configuredNumber);
      
      if (hasConfiguredNumber) {
        console.log('   ✓ Configured number matches!');
      } else {
        console.log('   ⚠️  Configured number does not match any available numbers');
        console.log('   Configured:', configuredNumber);
      }
    }
    
    // Test 3: Check trial status
    console.log('\n5. Checking Trial Status...');
    return client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  })
  .then(account => {
    if (account.type === 'Trial') {
      console.log('   ⚠️  This is a TRIAL account');
      console.log('   You can only send SMS to verified phone numbers.');
      console.log('   Verify numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    } else {
      console.log('   ✓ This is a PAID account');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTo send a test SMS, run:');
    console.log('node test-twilio-send.js +919876543210');
    console.log('(Replace with your verified phone number)');
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    if (error.code === 20003) {
      console.log('\n⚠️  Authentication failed!');
      console.log('Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }
  });