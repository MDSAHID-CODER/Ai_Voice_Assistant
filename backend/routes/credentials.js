const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get credentials
router.get('/', async (req, res) => {
  try {
    let credentials = await prisma.credential.findFirst();
    if (!credentials) {
      // Create empty record if none exists
      credentials = await prisma.credential.create({
        data: {}
      });
    }

    // Mask secret keys for frontend UI
    const response = {
      vapiApiKey: credentials.vapiApiKey ? `${credentials.vapiApiKey.slice(0, 8)}...` : '',
      twilioSid: credentials.twilioSid ? `${credentials.twilioSid.slice(0, 8)}...` : '',
      twilioToken: credentials.twilioToken ? '********' : '',
      twilioNumber: credentials.twilioNumber || '',
      hasKeys: !!(credentials.vapiApiKey)
    };

    res.json(response);
  } catch (error) {
    console.error("Fetch credentials error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update credentials
router.post('/', async (req, res) => {
  const { vapiApiKey, twilioSid, twilioToken, twilioNumber } = req.body;

  try {
    let credentials = await prisma.credential.findFirst();

    const data = {};
    if (vapiApiKey && !vapiApiKey.endsWith('...')) data.vapiApiKey = vapiApiKey;
    if (twilioSid && !twilioSid.endsWith('...')) data.twilioSid = twilioSid;
    if (twilioToken && twilioToken !== '********') data.twilioToken = twilioToken;
    if (twilioNumber !== undefined) data.twilioNumber = twilioNumber;

    if (!credentials) {
      credentials = await prisma.credential.create({ data });
    } else {
      credentials = await prisma.credential.update({
        where: { id: credentials.id },
        data
      });
    }

    res.json({ message: "Credentials updated successfully" });
  } catch (error) {
    console.error("Save credentials error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
