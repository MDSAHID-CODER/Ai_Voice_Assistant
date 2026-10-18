const express = require('express');
const router = express.Router();
const prisma = require('../db');

// List calls (with search and paginating placeholders)
router.get('/', async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      include: {
        contact: {
          include: {
            campaign: {
              include: {
                agent: { select: { name: true } }
              }
            }
          }
        },
        extractions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCalls = calls.map(c => ({
      id: c.id,
      vapiCallId: c.vapiCallId,
      status: c.status,
      duration: c.duration,
      recordingUrl: c.recordingUrl,
      cost: c.cost,
      createdAt: c.createdAt,
      contactName: c.contact.name,
      contactPhone: c.contact.phone,
      campaignName: c.contact.campaign.name,
      agentName: c.contact.campaign.agent.name,
      extractions: c.extractions.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {})
    }));

    res.json(formattedCalls);
  } catch (error) {
    console.error("Fetch calls error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get detailed single call logs
router.get('/:id', async (req, res) => {
  try {
    const call = await prisma.call.findUnique({
      where: { id: req.params.id },
      include: {
        contact: {
          include: {
            campaign: {
              include: { agent: true }
            }
          }
        },
        extractions: true
      }
    });

    if (!call) return res.status(404).json({ error: "Call not found" });

    res.json({
      id: call.id,
      vapiCallId: call.vapiCallId,
      status: call.status,
      duration: call.duration,
      recordingUrl: call.recordingUrl,
      transcript: call.transcript,
      cost: call.cost,
      createdAt: call.createdAt,
      contact: {
        id: call.contact.id,
        name: call.contact.name,
        phone: call.contact.phone,
        variables: JSON.parse(call.contact.variables || '{}')
      },
      campaignName: call.contact.campaign.name,
      agent: call.contact.campaign.agent,
      extractions: call.extractions.map(e => ({ key: e.key, value: e.value }))
    });
  } catch (error) {
    console.error("Fetch call detail error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
