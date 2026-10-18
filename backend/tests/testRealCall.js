const { triggerCall } = require('../services/vapiService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== TESTING OUTBOUND DIAL RESOLUTION ===");
  try {
    const agent = await prisma.agent.findFirst();
    if (!agent) {
      console.log("Please create an agent in the dashboard first.");
      return;
    }

    console.log(`Using Agent: ${agent.name} (${agent.id})`);
    console.log("Calling triggerCall with raw phone '9250462610'...");
    
    const result = await triggerCall({
      phone: "9250462610", // This will be formatted to E.164 +919250462610
      name: "Sahid Test",
      agentId: agent.id
    });

    console.log("\n---------------- RESULTS ----------------");
    console.log("CALL INITIATED SUCCESS!");
    console.log("Vapi Call ID:", result.vapiCallId);
    console.log("Initial Status:", result.status);
    console.log("-----------------------------------------");

  } catch (err) {
    console.log("\n---------------- ERROR RETURNED ----------------");
    console.log("Message:", err.message);
    if (err.response?.data) {
      console.log("API Response details:", JSON.stringify(err.response.data, null, 2));
    }
    console.log("------------------------------------------------");
  } finally {
    await prisma.$disconnect();
  }
}

run();
