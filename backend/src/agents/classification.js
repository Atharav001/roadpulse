const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VISION_API_KEY = process.env.VISION_MODEL_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const VALID_ISSUE_TYPES = ['pothole', 'waterlogging', 'accident', 'signal_failure', 'blocked_road'];
const VALID_SEVERITIES = ['low', 'med', 'medium', 'high', 'critical'];

async function classify(photoSources, text) {
  const maxRetries = 1;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callVisionModel(photoSources, text);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.warn(`Classification attempt ${attempt + 1} failed, retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.error('Classification failed after retries:', lastError?.message);
  return { issue_type: 'unclassified', severity: 'unknown', raw_result: null };
}

async function callVisionModel(photoSources, text) {
  if (!VISION_API_KEY) {
    throw new Error('VISION_MODEL_API_KEY not set');
  }

  const content = { parts: [] };

  for (const source of photoSources || []) {
    content.parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: await resolveImageBase64(source),
      },
    });
  }

  content.parts.push({ text: buildClassificationPrompt(text) });

  const response = await axios.post(
    `${GEMINI_ENDPOINT}?key=${VISION_API_KEY}`,
    { contents: [content], generationConfig: { temperature: 0.2, maxOutputTokens: 200 } },
    { timeout: 20000 }
  );

  const responseText = response.data.candidates[0].content.parts[0].text;
  const parsed = parseVisionResponse(responseText);
  return { issue_type: parsed.issue_type, severity: parsed.severity, raw_result: responseText };
}

function buildClassificationPrompt(text) {
  const basePrompt = `You are an expert at classifying road and traffic problems. Analyze the image(s) and classify the issue.

Valid issue types: pothole, waterlogging, accident, signal_failure, blocked_road
Valid severity levels: low, med, high

Respond with ONLY a JSON object on a single line (no markdown, no code blocks):
{"issue_type": "<type>", "severity": "<level>"}

For severity:
- low: minor cosmetic damage, no immediate safety risk
- med: moderate damage or obstruction, potential safety concern
- high: severe damage, significant obstruction, or immediate safety hazard`;

  return text?.trim() ? `${basePrompt}\n\nUser description: ${text}` : basePrompt;
}

async function resolveImageBase64(source) {
  if (!source) throw new Error('Empty image source');

  if (source.startsWith('data:')) {
    const match = source.match(/^data:[^;]+;base64,(.+)$/);
    if (match) return match[1];
  }

  if (fs.existsSync(source)) {
    return fs.readFileSync(source).toString('base64');
  }

  if (source.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '../../', source.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath).toString('base64');
    }
  }

  if (source.startsWith('http')) {
    const response = await axios.get(source, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(response.data).toString('base64');
  }

  if (/^[A-Za-z0-9+/=]+$/.test(source.slice(0, 100))) {
    return source;
  }

  throw new Error(`Unable to resolve image: ${source.slice(0, 50)}`);
}

function parseVisionResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.issue_type || !VALID_ISSUE_TYPES.includes(parsed.issue_type)) {
      parsed.issue_type = 'unclassified';
    }
    if (!parsed.severity || !VALID_SEVERITIES.includes(parsed.severity)) {
      parsed.severity = 'unknown';
    }
    if (parsed.severity === 'med') parsed.severity = 'medium';
    return parsed;
  } catch (error) {
    console.error('Failed to parse vision response:', error.message, 'Raw:', responseText);
    throw new Error(`Invalid classification response: ${error.message}`);
  }
}

module.exports = { classify };
