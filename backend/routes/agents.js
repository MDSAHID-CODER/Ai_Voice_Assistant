const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { syncAgent } = require('../services/vapiService');

// Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(agents);
  } catch (error) {
    console.error("Fetch agents error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id }
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create agent
router.post('/', async (req, res) => {
  const { name, systemPrompt, voiceId, firstMessage, extractionSchema } = req.body;

  if (!name || !systemPrompt || !firstMessage) {
    return res.status(400).json({ error: "Name, system prompt, and first message are required" });
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        name,
        systemPrompt,
        voiceId: voiceId || 'eleven-labs-rachel',
        firstMessage,
        extractionSchema: typeof extractionSchema === 'string' ? extractionSchema : JSON.stringify(extractionSchema || [])
      }
    });

    // Try syncing with Vapi, catch errors so the local save still succeeds
    try {
      await syncAgent(agent.id);
    } catch (syncErr) {
      console.warn("Failed syncing agent on creation with Vapi API:", syncErr.message);
    }

    res.status(201).json(agent);
  } catch (error) {
    console.error("Create agent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  const { name, systemPrompt, voiceId, firstMessage, extractionSchema } = req.body;

  try {
    let agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        name: name || agent.name,
        systemPrompt: systemPrompt || agent.systemPrompt,
        voiceId: voiceId || agent.voiceId,
        firstMessage: firstMessage || agent.firstMessage,
        extractionSchema: extractionSchema !== undefined 
          ? (typeof extractionSchema === 'string' ? extractionSchema : JSON.stringify(extractionSchema))
          : agent.extractionSchema
      }
    });

    // Sync updates to Vapi
    try {
      await syncAgent(agent.id);
    } catch (syncErr) {
      console.warn("Failed syncing agent on update with Vapi API:", syncErr.message);
    }

    res.json(agent);
  } catch (error) {
    console.error("Update agent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    await prisma.agent.delete({ where: { id: req.params.id } });
    res.json({ message: "Agent deleted successfully" });
  } catch (error) {
    console.error("Delete agent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Force Sync with Vapi
router.post('/:id/sync', async (req, res) => {
  try {
    const vapiAgentId = await syncAgent(req.params.id);
    res.json({ message: "Agent synced with Vapi successfully", vapiAgentId });
  } catch (error) {
    console.error("Sync agent error:", error);
    res.status(500).json({ error: error.message || "Failed to sync agent with Vapi" });
  }
});

module.exports = router;
