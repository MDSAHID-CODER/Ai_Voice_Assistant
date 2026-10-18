const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const prisma = require('../db');
const { triggerCall } = require('../services/vapiService');

// Configure upload folder
const upload = multer({ dest: 'uploads/' });

// Get all campaigns with counts
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        agent: { select: { name: true } },
        contacts: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCampaigns = campaigns.map(camp => {
      const total = camp.contacts.length;
      const pending = camp.contacts.filter(c => c.status === 'PENDING').length;
      const calling = camp.contacts.filter(c => c.status === 'CALLING').length;
      const completed = camp.contacts.filter(c => c.status === 'COMPLETED').length;
      const failed = camp.contacts.filter(c => c.status === 'FAILED').length;

      return {
        id: camp.id,
        name: camp.name,
        agentName: camp.agent.name,
        agentId: camp.agentId,
        status: camp.status,
        createdAt: camp.createdAt,
        counts: { total, pending, calling, completed, failed }
      };
    });

    res.json(formattedCampaigns);
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get campaign detail with contact list
router.get('/:id', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        agent: true,
        contacts: {
          include: {
            calls: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    // Format contacts
    const contacts = campaign.contacts.map(c => {
      let latestCall = c.calls[0] || null;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        variables: JSON.parse(c.variables || '{}'),
        latestCall
      };
    });

    res.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      agent: campaign.agent,
      createdAt: campaign.createdAt,
      contacts
    });
  } catch (error) {
    console.error("Fetch campaign error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create campaign & upload/parse CSV
router.post('/', upload.single('csv'), async (req, res) => {
  const { name, agentId } = req.body;

  if (!name || !agentId) {
    return res.status(400).json({ error: "Campaign name and Agent ID are required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "CSV contacts file is required" });
  }

  try {
    // Check if agent exists
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      fs.unlinkSync(req.file.path); // remove temp file
      return res.status(404).json({ error: "Selected Agent does not exist" });
    }

    // Create campaign first
    const campaign = await prisma.campaign.create({
      data: {
        name,
        agentId
      }
    });

    const contactsToCreate = [];

    // Parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        // Find phone and name columns case-insensitively
        let nameVal = '';
        let phoneVal = '';
        const variables = {};

        Object.keys(row).forEach(key => {
          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === 'name') {
            nameVal = row[key];
          } else if (lowerKey === 'phone' || lowerKey === 'phone_number' || lowerKey === 'number') {
            phoneVal = row[key];
          } else {
            variables[key.trim()] = row[key];
          }
        });

        if (phoneVal) {
          contactsToCreate.push({
            campaignId: campaign.id,
            name: nameVal || 'Customer',
            phone: phoneVal.trim(),
            variables: JSON.stringify(variables),
            status: 'PENDING'
          });
        }
      })
      .on('end', async () => {
        try {
          if (contactsToCreate.length > 0) {
            // Bulk insert contacts
            await prisma.contact.createMany({
              data: contactsToCreate
            });
          }

          // Clean up file
          fs.unlinkSync(req.file.path);

          res.status(201).json({
            message: `Campaign created successfully with ${contactsToCreate.length} contacts.`,
            campaignId: campaign.id
          });
        } catch (dbErr) {
          console.error("Database insert error:", dbErr);
          res.status(500).json({ error: "Failed to save contacts in database" });
        }
      })
      .on('error', (err) => {
        console.error("CSV parse error:", err);
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: "Failed to parse CSV file" });
      });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start campaign (triggers calls in background)
router.post('/:id/start', async (req, res) => {
  const campaignId = req.params.id;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contacts: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    if (campaign.status === 'RUNNING') {
      return res.status(400).json({ error: "Campaign is already running" });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' }
    });

    // Run processing asynchronously in background
    setImmediate(async () => {
      console.log(`Starting background processing for campaign: ${campaign.name}`);
      const contacts = campaign.contacts;

      for (const contact of contacts) {
        try {
          // Update contact status to Calling
          await prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'CALLING' }
          });

          // Trigger call using Vapi
          const variables = JSON.parse(contact.variables || '{}');
          const result = await triggerCall({
            phone: contact.phone,
            name: contact.name,
            agentId: campaign.agentId,
            variables
          });

          // Save call record
          await prisma.call.create({
            data: {
              contactId: contact.id,
              vapiCallId: result.vapiCallId,
              status: result.status
            }
          });

        } catch (callErr) {
          console.error(`Failed to trigger call for contact ${contact.id} (${contact.phone}):`, callErr.message);
          
          await prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'FAILED' }
          });

          // Create failed call record
          await prisma.call.create({
            data: {
              contactId: contact.id,
              status: 'failed',
              transcript: `Call failed initiation: ${callErr.message}`
            }
          });
        }

        // Slight delay to prevent spamming APIs (e.g. 1 second per call trigger)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if all contacts are processed, then complete campaign
      const activeOrPending = await prisma.contact.count({
        where: {
          campaignId: campaignId,
          status: { in: ['PENDING', 'CALLING'] }
        }
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: activeOrPending === 0 ? 'COMPLETED' : 'RUNNING' }
      });
      console.log(`Finished background processing for campaign: ${campaign.name}`);
    });

    res.json({ message: "Campaign started successfully in background" });

  } catch (error) {
    console.error("Start campaign error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add contact directly to campaign
router.post('/:id/contacts', async (req, res) => {
  const { name, phone, variables } = req.body;
  const campaignId = req.params.id;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const contact = await prisma.contact.create({
      data: {
        campaignId,
        name: name || 'Customer',
        phone: phone.trim(),
        variables: typeof variables === 'string' ? variables : JSON.stringify(variables || {}),
        status: 'PENDING'
      }
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({ error: "Failed to add contact", details: error.message });
  }
});

// Dial individual contact
router.post('/contacts/:id/dial', async (req, res) => {
  const contactId = req.params.id;

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { campaign: true }
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Update contact status to Calling
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'CALLING' }
    });

    // Trigger call using Vapi
    const variables = JSON.parse(contact.variables || '{}');
    const result = await triggerCall({
      phone: contact.phone,
      name: contact.name,
      agentId: contact.campaign.agentId,
      variables
    });

    // Save call record
    const call = await prisma.call.create({
      data: {
        contactId: contact.id,
        vapiCallId: result.vapiCallId,
        status: result.status
      }
    });

    res.json({ message: "Individual call initiated successfully", callId: call.id, status: result.status });

  } catch (error) {
    console.error("Dial individual contact error:", error);
    
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'FAILED' }
    });

    await prisma.call.create({
      data: {
        contactId,
        status: 'failed',
        transcript: `Call failed initiation: ${error.message}`
      }
    });

    res.status(500).json({ error: "Failed to initiate call", details: error.message });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
