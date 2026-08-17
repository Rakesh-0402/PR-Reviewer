import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function reviewCode(patch) {
  const prompt = `
You are a Senior Software Engineer.

Review the following Pull Request.

Return ONLY valid JSON.

Do NOT wrap the JSON inside markdown.
Do NOT use \`\`\`json.
Do NOT write any explanation before or after the JSON.

Return this exact structure:

{
  "review": {
    "overallScore": 8,
    "summary": "...",
    "bugs": 0,
    "performance": 1,
    "security": 0,
    "bestPractices": 1,
    "estimatedFixTime": "15 mins",
    "priorityIssues": [
      {
        "severity": "High",
        "title": "SQL injection vulnerability",
        "description": "User-controlled input is directly used in the database query."
      }
    ],
    "markdown": "..."
  }
}

Rules:

- overallScore should be between 0 and 10.
- summary should contain 2-3 concise sentences.
- bugs = number of important bugs.
- performance = number of performance improvements.
- security = number of security concerns.
- bestPractices = number of code-quality suggestions.
- estimatedFixTime should be something like "15 mins", "30 mins", "1 hour".
- priorityIssues should contain 1–3 of the most important issues found in the PR.
- If there are no genuine issues, return an empty array.
- Do not invent issues just to fill the array.
- Each issue must have:
  - severity: "High", "Medium", or "Low"
  - title: short and specific
  - description: clear explanation of the problem and why it matters.
- markdown should contain the complete detailed review in GitHub Markdown format.

Here is the Pull Request:

${patch}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI returned an empty response.");
    }

    return content;
  } catch (error) {
    if (error.status === 429) {
      throw new Error(
        "AI review limit reached. Please try again later."
      );
    }

    if (error.status === 401) {
      throw new Error(
        "AI service authentication failed."
      );
    }

    if (error.status === 400) {
      throw new Error(
        "AI could not process this pull request."
      );
    }

    console.error("Groq API error:", error.message);

    throw new Error(
      "AI review service is temporarily unavailable."
    );
  }
}