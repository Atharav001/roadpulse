const axios = require('axios');

const VISION_API_KEY = process.env.VISION_MODEL_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const VALID_ISSUE_TYPES = ['pothole', 'waterlogging', 'accident', 'signal_failure', 'blocked_road'];
const VALID_SEVERITIES = ['low', 'med', 'high'];

/**
 * Classifies a road/traffic issue from photos and optional text
 * @param {string[]} photoUrls - Array of photo URLs to analyze
 * @param {string} text - Optional descriptive text about the issue
 * @returns {Promise<{issue_type: string, severity: string}>}
 */
async function classify(photoUrls, text) {
  const maxRetries = 1;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const classification = await callVisionModel(photoUrls, text);
      return classification;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.warn(`Classification attempt ${attempt + 1} failed, retrying...`, error.message);
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // All retries exhausted, return fallback
  console.error('Classification failed after retries:', lastError?.message);
  return {
    issue_type: 'unclassified',
    severity: 'unknown',
    raw_result: null
  };
}

/**
 * Calls the Gemini Flash vision model to classify the issue
 * @param {string[]} photoUrls - Array of photo URLs
 * @param {string} text - Optional text description
 * @returns {Promise<{issue_type: string, severity: string}>}
 */
async function callVisionModel(photoUrls, text) {
  if (!VISION_API_KEY) {
    throw new Error('VISION_MODEL_API_KEY not set');
  }

  // Build the prompt
  const prompt = buildClassificationPrompt(text);

  // Build request content with images
  const content = {
    parts: []
  };

  // Add images
  for (const url of photoUrls || []) {
    content.parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: await fetchImageAsBase64(url)
      }
    });
  }

  // Add text prompt
  content.parts.push({
    text: prompt
  });

  const response = await axios.post(
    `${GEMINI_ENDPOINT}?key=${VISION_API_KEY}`,
    {
      contents: [content],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 200
      }
    },
    {
      timeout: 20000
    }
  );

  const responseText = response.data.candidates[0].content.parts[0].text;
  const parsed = parseVisionResponse(responseText);
  return {
    issue_type: parsed.issue_type,
    severity: parsed.severity,
    raw_result: responseText
  };
}

/**
 * Builds the classification prompt
 * @param {string} text - Optional user-provided text
 * @returns {string}
 */
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

  if (text && text.trim()) {
    return basePrompt + `\n\nUser description: ${text}`;
  }

  return basePrompt;
}

/**
 * Fetches an image from a URL and converts it to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64-encoded image data
 */
async function fetchImageAsBase64(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error(`Failed to fetch image from ${url}:`, error.message);
    throw new Error(`Unable to fetch image: ${error.message}`);
  }
}

/**
 * Parses the vision model response and validates fields
 * @param {string} responseText - Raw response from vision model
 * @returns {{issue_type: string, severity: string}}
 */
function parseVisionResponse(responseText) {
  try {
    // Try to extract JSON from the response (in case it has extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate issue_type
    if (!parsed.issue_type || !VALID_ISSUE_TYPES.includes(parsed.issue_type)) {
      parsed.issue_type = 'unclassified';
    }

    // Validate severity
    if (!parsed.severity || !VALID_SEVERITIES.includes(parsed.severity)) {
      parsed.severity = 'unknown';
    }

    return {
      issue_type: parsed.issue_type,
      severity: parsed.severity
    };
  } catch (error) {
    console.error('Failed to parse vision response:', error.message, 'Raw:', responseText);
    throw new Error(`Invalid classification response: ${error.message}`);
  }
}

module.exports = {
  classify
};
