const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log("=========================================");
  console.log("STARTING END-TO-END WEBHOOK INTEGRATION TEST");
  console.log("=========================================");

  try {
    // 1. Clean old test data respecting foreign key constraints
    console.log("Cleaning old test database records...");
    await prisma.user.deleteMany({ where: { email: 'test_admin@calling.ai' } });
    
    // Clear calls, contacts, campaigns associated with test survey
    const testAgents = await prisma.agent.findMany({
      where: { name: 'Test Feedback Survey' }
    });
    
    for (const testAgent of testAgents) {
      const testCampaigns = await prisma.campaign.findMany({
        where: { agentId: testAgent.id }
      });
      const campaignIds = testCampaigns.map(c => c.id);
      
      const testContacts = await prisma.contact.findMany({
        where: { campaignId: { in: campaignIds } }
      });
      const contactIds = testContacts.map(c => c.id);
      
      const testCalls = await prisma.call.findMany({
        where: { contactId: { in: contactIds } }
      });
      const callIds = testCalls.map(c => c.id);
      
      // Delete in cascade order
      await prisma.callExtraction.deleteMany({ where: { callId: { in: callIds } } });
      await prisma.call.deleteMany({ where: { contactId: { in: contactIds } } });
      await prisma.contact.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.campaign.deleteMany({ where: { agentId: testAgent.id } });
      await prisma.agent.delete({ where: { id: testAgent.id } });
    }
    
    // 2. Seed Mock Agent
    console.log("Seeding mock Agent with dynamic extraction schema...");
    const agent = await prisma.agent.create({
      data: {
        name: 'Test Feedback Survey',
        systemPrompt: 'Collect hospital service rating out of 10 and patient feedback.',
        firstMessage: 'Hello, this is a test call.',
        extractionSchema: JSON.stringify([
          { name: 'rating', type: 'number', description: 'hospital visit rating' },
          { name: 'reason', type: 'string', description: 'reason for rating' }
        ]),
        voiceId: '21m00Tcm4TlvDq8ikWAM' // Set to ElevenLabs Rachel UUID
      }
    });
    console.log(`Mock Agent created: ${agent.id}`);

    // 3. Seed Mock Campaign
    console.log("Seeding mock Campaign...");
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign Patient Dials',
        agentId: agent.id
      }
    });

    // 4. Seed Mock Contact
    console.log("Seeding mock Contact...");
    const contact = await prisma.contact.create({
      data: {
        campaignId: campaign.id,
        name: 'Rahul Sharma',
        phone: '+919876543210',
        variables: JSON.stringify({ appointment_date: 'yesterday' }),
        status: 'CALLING'
      }
    });

    // 5. Seed Mock Call
    const mockVapiCallId = 'vapi_call_mock_12345';
    console.log("Seeding mock Call record...");
    const call = await prisma.call.create({
      data: {
        contactId: contact.id,
        vapiCallId: mockVapiCallId,
        status: 'ringing'
      }
    });

    // 6. Simulate Vapi Webhook Callback (POST /api/vapi-webhook)
    console.log("Simulating Vapi end-of-call webhook callback...");
    const webhookPayload = {
      message: {
        type: 'end-of-call-report',
        call: {
          id: mockVapiCallId,
          status: 'completed',
          duration: 54,
          recordingUrl: 'https://api.vapi.ai/mock-recording-june.mp3',
          transcript: 'AI: Hello Mr. Rahul, how was your visit? User: It was good, but the waiting room was slightly cold. AI: On a scale of 1-10 how would you rate us? User: I rate it an 8. AI: Thank you for your feedback.',
          endedReason: 'customer-hung-up',
          cost: 0.14
        },
        analysis: {
          summary: 'Patient Rahul Sharma gave a rating of 8 out of 10. Indicated that the waiting room was cold.',
          structuredData: {
            rating: 8,
            reason: 'waiting room was cold'
          }
        }
      }
    };

    const response = await axios.post('http://localhost:5000/api/vapi-webhook', webhookPayload);
    console.log(`Webhook server response status: ${response.status}`);

    // 7. Verify Database Updates
    console.log("Verifying SQLite Database updates...");
    
    const updatedCall = await prisma.call.findUnique({
      where: { id: call.id },
      include: { extractions: true }
    });

    const updatedContact = await prisma.contact.findUnique({
      where: { id: contact.id }
    });

    console.log("\n---------------- TEST RESULTS ----------------");
    console.log(`Call Status:       ${updatedCall.status} (Expected: completed)`);
    console.log(`Call Duration:     ${updatedCall.duration}s (Expected: 54)`);
    console.log(`Call Cost:         $${updatedCall.cost} (Expected: 0.14)`);
    console.log(`Contact Status:    ${updatedContact.status} (Expected: COMPLETED)`);
    
    console.log("\nParsed Extractions in Database:");
    updatedCall.extractions.forEach(e => {
      console.log(`  - Key [${e.key}]: Value = "${e.value}"`);
    });

    const hasRating = updatedCall.extractions.some(e => e.key === 'rating' && e.value === '8');
    const hasReason = updatedCall.extractions.some(e => e.key === 'reason' && e.value === 'waiting room was cold');

    if (
      updatedCall.status === 'completed' &&
      updatedContact.status === 'COMPLETED' &&
      hasRating &&
      hasReason
    ) {
      console.log("\n=========================================");
      console.log(" SUCCESS: END-TO-END WEBHOOK TEST PASSED!");
      console.log("=========================================");
    } else {
      console.log("\n=========================================");
      console.log(" FAILURE: DATABASE DID NOT UPDATE CORRECTLY.");
      console.log("=========================================");
    }

  } catch (error) {
    console.error("Test execution failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
runTest();
