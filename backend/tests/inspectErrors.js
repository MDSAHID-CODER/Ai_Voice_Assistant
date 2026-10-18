const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log("=== INSPECTING FAILED CALL LOGS ===");
  try {
    const failedCalls = await prisma.call.findMany({
      where: {
        status: { in: ['failed', 'FAILED', 'failed initiation'] }
      },
      include: {
        contact: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (failedCalls.length === 0) {
      console.log("No failed calls logged in the database yet.");
      
      // Let's check all calls in general to see their statuses
      const allCalls = await prisma.call.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      console.log(`Total calls in database: ${await prisma.call.count()}`);
      allCalls.forEach(c => {
        console.log(`Call ID: ${c.id}, Status: ${c.status}, vapiCallId: ${c.vapiCallId}, transcript length: ${c.transcript?.length || 0}`);
      });
    } else {
      failedCalls.forEach(c => {
        console.log(`\n-----------------------------------`);
        console.log(`Call ID:       ${c.id}`);
        console.log(`Contact:       ${c.contact.name} (${c.contact.phone})`);
        console.log(`Status:        ${c.status}`);
        console.log(`Error Message: ${c.transcript}`);
        console.log(`-----------------------------------`);
      });
    }

    // Let's also inspect if credentials are saved properly
    const creds = await prisma.credential.findFirst();
    if (creds) {
      console.log(`\nCredentials record found:`);
      console.log(`  - Vapi Key configured: ${!!creds.vapiApiKey}`);
      console.log(`  - Twilio SID configured: ${!!creds.twilioSid}`);
      console.log(`  - Twilio Token configured: ${!!creds.twilioToken}`);
      console.log(`  - Twilio Number/ID configured: ${!!creds.twilioNumber}`);
    } else {
      console.log(`\nNo credentials found in database.`);
    }

  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
