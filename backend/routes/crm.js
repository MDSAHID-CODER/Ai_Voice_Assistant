const express = require('express');
const router = express.Router();
const axios = require('axios');
const prisma = require('../db');

// Get CRM Config
router.get('/', async (req, res) => {
  try {
    let crm = await prisma.crmConfig.findFirst();
    if (!crm) {
      crm = await prisma.crmConfig.create({
        data: {
          webhookUrl: '',
          isEnabled: false
        }
      });
    }
    res.json(crm);
  } catch (error) {
    console.error("Fetch CRM config error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Save CRM Config
router.post('/', async (req, res) => {
  const { webhookUrl, authHeaderName, authHeaderVal, isEnabled } = req.body;

  if (isEnabled && !webhookUrl) {
    return res.status(400).json({ error: "Webhook URL is required when integration is enabled" });
  }

  try {
    let crm = await prisma.crmConfig.findFirst();

    const data = {
      webhookUrl: webhookUrl || '',
      authHeaderName: authHeaderName || null,
      authHeaderVal: authHeaderVal || null,
      isEnabled: isEnabled ?? true
    };

    if (!crm) {
      crm = await prisma.crmConfig.create({ data });
    } else {
      crm = await prisma.crmConfig.update({
        where: { id: crm.id },
        data
      });
    }

    res.json(crm);
  } catch (error) {
    console.error("Save CRM config error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Test CRM webhook connection
router.post('/test', async (req, res) => {
  const { webhookUrl, authHeaderName, authHeaderVal } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ error: "Webhook URL is required to test" });
  }

  const payload = {
    event: "call.test",
    timestamp: new Date().toISOString(),
    data: {
      callId: "test_call_123456",
      contactName: "John Doe",
      contactPhone: "+15555555555",
      agentName: "Feedback Assistant",
      campaignName: "Test Campaign",
      duration: 45,
      status: "completed",
      recordingUrl: "https://api.vapi.ai/mock-recording.mp3",
      transcript: "AI: How was your visit? User: It was good, but the queue was long.",
      extractions: {
        rating: 8,
        reason: "Long queue time"
      }
    }
  };

  const headers = {
    'Content-Type': 'application/json'
  };
  if (authHeaderName && authHeaderVal) {
    headers[authHeaderName] = authHeaderVal;
  }

  try {
    const response = await axios.post(webhookUrl, payload, { headers, timeout: 5000 });
    res.json({
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
  } catch (err) {
    console.error("CRM test webhook failed:", err.message);
    res.status(400).json({
      error: "Webhook request failed",
      message: err.message,
      response: err.response?.data || null
    });
  }
});

module.exports = router;
