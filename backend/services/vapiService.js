const axios = require('axios');
const prisma = require('../db');

/**
 * Validates if a string is a valid UUID
 */
function isUUID(str) {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Sanitizes and formats phone numbers to E.164 format
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Remove spaces, dashes, parentheses, keep digits and '+'
  let sanitized = phone.replace(/[^\d+]/g, '');

  if (sanitized.startsWith('+')) {
    return sanitized;
  }

  // Handle Indian numbers starting with '0' (e.g. 09250462610 -> +919250462610)
  if (sanitized.startsWith('0') && sanitized.length === 11) {
    return '+91' + sanitized.slice(1);
  }

  // Handle standard 10-digit numbers (defaulting to Indian country code +91)
  if (sanitized.length === 10) {
    return '+91' + sanitized;
  }

  // Handle numbers with country code but no '+' prefix (e.g. 919250462610 -> +919250462610)
  if (sanitized.startsWith('91') && sanitized.length === 12) {
    return '+' + sanitized;
  }

  // Fallback
  return '+' + sanitized;
}

/**
 * Auto-resolves raw phone numbers to Vapi Phone Number UUIDs
 */
async function resolveVapiPhoneNumberId(creds, headers) {
  const inputNumber = creds?.twilioNumber;
  if (!inputNumber) return null;

  const trimmed = inputNumber.trim();

  // If already a valid UUID, use it directly
  if (isUUID(trimmed)) {
    return trimmed;
  }

  console.log(`Twilio number is raw: "${trimmed}". Resolving its Vapi UUID via Vapi API...`);
  try {
    const response = await axios.get('https://api.vapi.ai/phone-number', { headers });
    const numbers = response.data;
    
    // Normalize input number (keep only digits)
    const normalizedInput = trimmed.replace(/\D/g, '');

    // 1. Try to find a match by number comparison
    const match = numbers.find(num => {
      const normalizedNum = (num.number || '').replace(/\D/g, '');
      return normalizedNum === normalizedInput || normalizedNum.endsWith(normalizedInput) || normalizedInput.endsWith(normalizedNum);
    });

    if (match) {
      console.log(`Found matching Vapi number! Mapping raw number "${trimmed}" to Vapi UUID: ${match.id}`);
      
      // Update database asynchronously for caching
      prisma.credential.update({
        where: { id: creds.id },
        data: { twilioNumber: match.id }
      }).catch(err => console.error("Failed to cache resolved Vapi phone UUID:", err.message));

      return match.id;
    }

    // 2. Fallback: if there is at least one active number in Vapi, use the first one
    if (numbers.length > 0) {
      console.log(`No exact match found for "${trimmed}". Falling back to first available Vapi phone ID: ${numbers[0].id}`);
      return numbers[0].id;
    }

  } catch (err) {
    console.error("Failed to resolve Vapi phone number list:", err.response?.data || err.message);
  }

  return null;
}

/**
 * Helper to build JSON Schema properties for Vapi's structured data extraction
 */
function buildVapiAnalysisPlan(extractionSchemaString) {
  try {
    const fields = JSON.parse(extractionSchemaString || '[]');
    if (!Array.isArray(fields) || fields.length === 0) return null;

    const properties = {};
    const required = [];

    fields.forEach(field => {
      if (!field.name) return;
      properties[field.name] = {
        type: field.type || 'string',
        description: field.description || `Extract value for ${field.name}`
      };
      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      structuredDataSchema: {
        type: "object",
        properties: properties,
        required: required.length > 0 ? required : undefined
      }
    };
  } catch (e) {
    console.error("Failed to build Vapi analysis plan schema", e);
    return null;
  }
}

/**
 * Get Vapi Authorization Headers
 */
async function getVapiHeaders() {
  const creds = await prisma.credential.findFirst();
  if (!creds || !creds.vapiApiKey) {
    throw new Error("Vapi API Key is not configured in the admin dashboard.");
  }
  return {
    'Authorization': `Bearer ${creds.vapiApiKey}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Sync Local Agent config with Vapi Assistant
 */
async function syncAgent(agentId) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId }
  });
  if (!agent) throw new Error("Agent not found");

  const headers = await getVapiHeaders();
  const analysisPlan = buildVapiAnalysisPlan(agent.extractionSchema);

  const payload = {
    name: agent.name,
    firstMessage: agent.firstMessage,
    model: {
      provider: "openai",
      model: "gpt-4o-mini", // Cost-effective, very low latency
      messages: [
        {
          role: "system",
          content: agent.systemPrompt
        }
      ]
    },
    voice: {
      provider: "11labs", // Fixed: Vapi API requires "11labs"
      voiceId: agent.voiceId
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en"
    },
    ...(analysisPlan && { analysisPlan })
  };

  let vapiAgentId = agent.vapiAgentId;

  if (vapiAgentId) {
    // Update existing Vapi assistant
    try {
      await axios.patch(`https://api.vapi.ai/assistant/${vapiAgentId}`, payload, { headers });
    } catch (err) {
      console.warn("Failed to patch assistant on Vapi, creating a new one instead...", err.response?.data || err.message);
      vapiAgentId = null; // force recreation if deleted on Vapi dashboard
    }
  }

  if (!vapiAgentId) {
    // Create new Vapi assistant
    const response = await axios.post('https://api.vapi.ai/assistant', payload, { headers });
    vapiAgentId = response.data.id;
    await prisma.agent.update({
      where: { id: agentId },
      data: { vapiAgentId }
    });
  }

  return vapiAgentId;
}

/**
 * Trigger an Outbound Phone Call
 */
async function triggerCall({ phone, name, agentId, variables = {} }) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Agent not found");

  // Sync agent configuration before call
  const vapiAgentId = await syncAgent(agent.id);

  const headers = await getVapiHeaders();
  const creds = await prisma.credential.findFirst();

  const formattedPhone = formatPhoneNumber(phone);
  const resolvedPhoneNumberId = await resolveVapiPhoneNumberId(creds, headers);

  const payload = {
    assistantId: vapiAgentId,
    customer: {
      number: formattedPhone,
      name: name
    },
    assistantOverrides: {
      variableValues: {
        name: name,
        ...variables
      }
    }
  };

  if (resolvedPhoneNumberId) {
    payload.phoneNumberId = resolvedPhoneNumberId;
  }

  console.log("Triggering call to Vapi with payload:", JSON.stringify(payload, null, 2));

  const response = await axios.post('https://api.vapi.ai/call/phone', payload, { headers });
  
  return {
    vapiCallId: response.data.id,
    status: response.data.status || 'initiated'
  };
}

module.exports = {
  syncAgent,
  triggerCall
};
