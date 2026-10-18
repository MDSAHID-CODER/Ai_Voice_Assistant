const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log("=== FIXING INVALID VOICE IDS IN DATABASE ===");
  try {
    const updated = await prisma.agent.updateMany({
      where: {
        voiceId: { in: ['eleven-labs-rachel', 'elevenlabs-rachel'] }
      },
      data: {
        voiceId: '21m00Tcm4TlvDq8ikWAM' // Official ElevenLabs Rachel UUID
      }
    });
    console.log(`Successfully updated ${updated.count} agents to a valid ElevenLabs voice ID.`);
  } catch (err) {
    console.error("Database update failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
