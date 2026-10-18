const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log("=== UPDATING TWILIO NUMBER TO VAPI UUID ===");
  try {
    const creds = await prisma.credential.findFirst();
    if (!creds) {
      console.log("No credentials found.");
      return;
    }

    await prisma.credential.update({
      where: { id: creds.id },
      data: {
        twilioNumber: 'bbb766ac-2d1b-44a3-bd61-72d17eefcc2c' // The exact UUID fetched from Vapi
      }
    });

    console.log("Successfully updated SQLite database twilioNumber field to: bbb766ac-2d1b-44a3-bd61-72d17eefcc2c");
  } catch (err) {
    console.error("Database update failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
