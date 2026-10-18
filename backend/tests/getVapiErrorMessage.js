const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listNumbers() {
  console.log("=== LISTING ACTIVE VAPI PHONE NUMBERS ===");
  try {
    const creds = await prisma.credential.findFirst();
    if (!creds || !creds.vapiApiKey) {
      console.log("No Vapi API Key found. Please save configurations in the admin panel.");
      return;
    }

    const headers = {
      'Authorization': `Bearer ${creds.vapiApiKey}`,
      'Content-Type': 'application/json'
    };

    console.log(`Vapi Key: ${creds.vapiApiKey.slice(0, 8)}...`);

    try {
      const response = await axios.get('https://api.vapi.ai/phone-number', { headers });
      const numbers = response.data;
      
      console.log(`\nFound ${numbers.length} phone number(s) in Vapi Account:`);
      numbers.forEach((num, index) => {
        console.log(`\n--- Number ${index + 1} ---`);
        console.log(`ID (UUID):    ${num.id}`);
        console.log(`Number:       ${num.number}`);
        console.log(`Provider:     ${num.provider}`);
        console.log(`Name:         ${num.name}`);
        console.log(`Twilio SID:   ${num.twilioAccountSid || 'N/A'}`);
      });

    } catch (apiErr) {
      console.log("\n---------------- VAPI API ERROR ----------------");
      console.log(`Status Code: ${apiErr.response?.status}`);
      console.log("Error Response Data:", JSON.stringify(apiErr.response?.data, null, 2));
      console.log("------------------------------------------------");
    }

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

listNumbers();
