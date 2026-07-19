const axios = require('axios');

const TEXT_MODEL_API_KEY = process.env.VISION_MODEL_API_KEY; // Reuse vision API key for text
const GEMINI_TEXT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Department email addresses and contact info
const DEPARTMENT_INFO = {
  'municipal-roads': {
    email: 'roads@municipality.gov',
    address: 'Municipal Roads Department\nCity Hall\nMain Street',
    name: 'Municipal Road Dept',
  },
  'drainage-dept': {
    email: 'drainage@municipality.gov',
    address: 'Drainage Department\nCity Hall\nMain Street',
    name: 'Drainage Dept',
  },
  'traffic-police': {
    email: 'traffic@police.gov',
    address: 'Traffic Police Department\nCity Traffic Control Center',
    name: 'Traffic Police',
  },
};

/**
 * Generates a formal complaint email draft
 * @param {Object} incident - Incident data
 * @param {string} incident.issue_type - Type of issue
 * @param {string} incident.severity - Severity level
 * @param {string} incident.landmark_description - Landmark description
 * @param {string} incident.department - Department name
 * @param {string} user_email - User's email address
 * @returns {Promise<{subject: string, body: string}>}
 */
async function draftEmail(incident, user_email) {
  const { issue_type, severity, landmark_description, department } = incident;

  try {
    const email = await generateEmailWithAI(
      issue_type,
      severity,
      landmark_description,
      department,
      user_email
    );
    return email;
  } catch (error) {
    console.error('Failed to generate email with AI:', error.message);
    return generateFallbackEmail(issue_type, severity, landmark_description, department, user_email);
  }
}

/**
 * Generates email using Gemini text model
 * @param {string} issue_type - Type of issue
 * @param {string} severity - Severity level
 * @param {string} landmark_description - Landmark location
 * @param {string} department - Department name
 * @param {string} user_email - User email
 * @returns {Promise<{subject: string, body: string}>}
 */
async function generateEmailWithAI(issue_type, severity, landmark_description, department, user_email) {
  if (!TEXT_MODEL_API_KEY) {
    throw new Error('VISION_MODEL_API_KEY not set');
  }

  const dept = department && DEPARTMENT_INFO[department] ? department : 'municipal-roads';
  const departmentInfo = DEPARTMENT_INFO[dept];
  const prompt = buildEmailPrompt(issue_type, severity, landmark_description, dept, departmentInfo.email);

  const response = await axios.post(
    `${GEMINI_TEXT_ENDPOINT}?key=${TEXT_MODEL_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    },
    {
      timeout: 15000
    }
  );

  const responseText = response.data.candidates[0].content.parts[0].text;
  return parseEmailResponse(responseText, departmentInfo);
}

/**
 * Builds the email generation prompt
 * @param {string} issue_type - Type of issue
 * @param {string} severity - Severity level
 * @param {string} landmark_description - Landmark description
 * @param {string} department - Department name
 * @param {string} email - Department email
 * @returns {string}
 */
function buildEmailPrompt(issue_type, severity, landmark_description, department, email) {
  const severityLabel = {
    low: 'minor',
    med: 'moderate',
    high: 'critical'
  }[severity] || 'unspecified';

  return `Generate a formal complaint email with the following details:
- Issue: ${issue_type}
- Severity: ${severityLabel}
- Location: ${landmark_description}
- Department: ${department}

The email should include:
1. A formal greeting
2. Clear description of the issue with severity indication
3. Exact location reference
4. Request for immediate action
5. Professional closing

Format the response EXACTLY as follows (on separate lines):
SUBJECT: <subject line>
BODY: <full email body with proper line breaks>

Do not use markdown or any other formatting. Keep it professional and concise.`;
}

/**
 * Parses the AI-generated email response
 * @param {string} responseText - Raw response from AI
 * @param {Object} departmentInfo - Department contact info
 * @returns {{subject: string, body: string}}
 */
function parseEmailResponse(responseText, departmentInfo) {
  try {
    const subjectMatch = responseText.match(/SUBJECT:\s*(.+?)(?=\nBODY:|$)/s);
    const bodyMatch = responseText.match(/BODY:\s*([\s\S]+?)$/);

    if (!subjectMatch || !bodyMatch) {
      throw new Error('Invalid email format in response');
    }

    let subject = subjectMatch[1].trim();
    let body = bodyMatch[1].trim();

    // Add department address to body
    body = body + '\n\n' + departmentInfo.address;

    return {
      subject,
      body
    };
  } catch (error) {
    console.error('Failed to parse email response:', error.message);
    throw error;
  }
}

/**
 * Generates a fallback email when AI fails
 * @param {string} issue_type - Type of issue
 * @param {string} severity - Severity level
 * @param {string} landmark_description - Landmark description
 * @param {string} department - Department name
 * @param {string} user_email - User email
 * @returns {{subject: string, body: string}}
 */
function generateFallbackEmail(issue_type, severity, landmark_description, department, user_email) {
  const dept = department && DEPARTMENT_INFO[department] ? department : 'municipal-roads';
  const departmentInfo = DEPARTMENT_INFO[dept];
  const severityLabel = {
    low: 'minor',
    med: 'moderate',
    high: 'critical'
  }[severity] || 'unspecified';

  const subject = `Road Issue Report: ${issue_type} at ${landmark_description}`;

  const body = `Dear ${departmentInfo.name},

We are writing to report a road/traffic issue that requires your immediate attention.

Issue Type: ${issue_type}
Severity: ${severityLabel}
Location: ${landmark_description}

This issue has been reported through the RoadPulse citizen reporting system. We request immediate inspection and remediation to ensure public safety and infrastructure quality.

For more details or to track this report, please reference your incident tracking system.

Thank you for your prompt attention to this matter.

Best regards,
RoadPulse Reporting System
On behalf of concerned citizens

---
${departmentInfo.address}`;

  return {
    subject,
    body
  };
}

module.exports = {
  draftEmail
};
