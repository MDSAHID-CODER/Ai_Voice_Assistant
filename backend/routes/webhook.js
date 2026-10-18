const express = require('express');
const router = express.Router();
const axios = require('axios');
const prisma = require('../db');

// Main Vapi Webhook receiver
router.post('/', async (req, res) => {
  const payload = req.body;
  
  // Vapi sends events wrapped under a "message" key
  const message = payload.message;
  if (!message) {
    return res.status(400).json({ error: "Missing message payload" });
  }

  const messageType = message.type;
  console.log(`Received Vapi Webhook event: ${messageType}`);

  try {
    if (messageType === 'call.status-update') {
      const { id: vapiCallId, status } = message.call || {};
      if (vapiCallId) {
        // Update call status locally
        const localCall = await prisma.call.findUnique({
          where: { vapiCallId }
        });

        if (localCall) {
          await prisma.call.update({
            where: { vapiCallId },
            data: { status }
          });
        }
      }
    } 
    
    else if (messageType === 'end-of-call-report') {
      const callData = message.call || {};
      const analysis = message.analysis || {};
      const vapiCallId = callData.id;

      if (!vapiCallId) {
        return res.status(400).json({ error: "Missing call ID in report" });
      }

      // Find local call record
      const localCall = await prisma.call.findUnique({
        where: { vapiCallId },
        include: {
          contact: {
            include: {
              campaign: {
                include: { agent: true }
              }
            }
          }
        }
      });

      if (!localCall) {
        console.warn(`Call not found for vapiCallId: ${vapiCallId}`);
        return res.status(404).json({ error: "Call record not found" });
      }

      // Parse final status
      const finalStatus = callData.endedReason === 'customer-hung-up' || 
                          callData.endedReason === 'assistant-hung-up' ||
                          callData.status === 'completed'
                          ? 'COMPLETED' 
                          : 'FAILED';

      const duration = callData.duration ? Math.round(callData.duration) : 0;
      const recordingUrl = callData.recordingUrl || null;
      const transcript = callData.transcript || null;
      const cost = callData.cost ? parseFloat(callData.cost) : 0.0;

      // Update call details in DB
      const updatedCall = await prisma.call.update({
        where: { id: localCall.id },
        data: {
          status: finalStatus.toLowerCase(),
          duration,
          recordingUrl,
          transcript,
          cost
        }
      });

      // Update contact status
      await prisma.contact.update({
        where: { id: localCall.contactId },
        data: {
          status: finalStatus
        }
      });

      // Process Structured Extractions
      const structuredData = analysis.structuredData || {};
      const extractionsToSave = [];

      Object.keys(structuredData).forEach(key => {
        let val = structuredData[key];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        } else if (val !== undefined && val !== null) {
          val = String(val);
        }

        if (val) {
          extractionsToSave.push({
            callId: localCall.id,
            key,
            value: val
          });
        }
      });

      if (extractionsToSave.length > 0) {
        // Clear old ones if they exist (insurance)
        await prisma.callExtraction.deleteMany({
          where: { callId: localCall.id }
        });
        
        // Insert new ones
        await prisma.callExtraction.createMany({
          data: extractionsToSave
        });
      }

      // Trigger Outbound Webhook to CRM/ERP
      await dispatchCrmWebhook(localCall.id);
    }

    // Always acknowledge Vapi webhook with 200
    res.sendStatus(200);

  } catch (error) {
    console.error("Webhook processing failed:", error);
    res.status(500).json({ error: "Internal processing error" });
  }
});

/**
 * Dispatch Call Results to External CRM/ERP Webhook
 */
async function dispatchCrmWebhook(callId) {
  try {
    const crm = await prisma.crmConfig.findFirst({
      where: { isEnabled: true }
    });

    if (!crm || !crm.webhookUrl) {
      console.log("CRM Integration is disabled or no URL set. Skipping webhook dispatch.");
      return;
    }

    // Load full call details with extractions
    const call = await prisma.call.findUnique({
      where: { id: callId },
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

    if (!call) return;

    const extractionsObj = call.extractions.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const payload = {
      event: "call.completed",
      timestamp: new Date().toISOString(),
      data: {
        callId: call.id,
        vapiCallId: call.vapiCallId,
        contactName: call.contact.name,
        contactPhone: call.contact.phone,
        campaignName: call.contact.campaign.name,
        agentName: call.contact.campaign.agent.name,
        duration: call.duration,
        status: call.status,
        recordingUrl: call.recordingUrl,
        transcript: call.transcript,
        cost: call.cost,
        extractions: extractionsObj
      }
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (crm.authHeaderName && crm.authHeaderVal) {
      headers[crm.authHeaderName] = crm.authHeaderVal;
    }

    console.log(`Dispatching CRM Webhook to ${crm.webhookUrl}...`);
    await axios.post(crm.webhookUrl, payload, { headers, timeout: 5000 });
    console.log("CRM Webhook dispatched successfully.");

  } catch (err) {
    console.error("Failed to dispatch CRM webhook:", err.message);
  }
}

module.exports = router;
