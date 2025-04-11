import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: NextRequest) {
  try {
    const { code, request } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code to analyze is required' },
        { status: 400 }
      );
    }

    if (!request) {
      return NextResponse.json(
        { error: 'Request description is required' },
        { status: 400 }
      );
    }

    // Create a system message with instructions
    const prompt = `You are an expert HTML email developer assistant that helps users modify their HTML email templates.

Given the following HTML code:
\`\`\`html
${code}
\`\`\`

And this user request: "${request}"

Analyze the code and determine what changes should be made. 

IMPORTANT APPROACH GUIDELINES:
1. First, determine if you need additional information to provide the best solution
2. If you need clarification, include 1-2 specific questions in your response to the user
3. If the request is clear, focus on providing a single, best solution rather than alternatives
4. Be direct and concise in your explanations
5. For complex changes, prioritize the most impactful modifications

CONTEXT AND VALIDATION REQUIREMENTS:
1. Analyze the ENTIRE HTML structure before suggesting any changes
2. Ensure each change properly integrates with the existing code (check parent elements, siblings, etc.)
3. Verify that your modifications maintain proper HTML nesting and document structure
4. Confirm that elements you're modifying actually exist and are in the correct context
5. For styling changes, check if the element already has styles that you should preserve or override
6. If adding new elements, ensure they belong in the suggested location based on the document structure
7. For any attribute changes, verify they're appropriate for the target element
8. Consider how your changes affect the document's overall structure and layout
9. If a requested change doesn't make sense in the document context, explain why and suggest alternatives

EMAIL CODING STRATEGY:
When implementing code changes, follow these best practices:
1. Use table-based layouts for maximum email client compatibility
2. Always use inline CSS styles instead of style blocks or external CSS
3. Set exact pixel values for spacing, margins, and padding to ensure precise positioning
4. Use media queries to implement responsive design, hiding desktop elements and showing mobile ones
5. Set MSO conditional comments for Outlook compatibility when needed
6. Add proper HTML comments to clearly identify different sections of the email
7. Maintain precise line spacing, padding, and margins between elements
8. Follow exact design specifications without approximations
9. Ensure all elements maintain their relative positions at various screen sizes
10. Include proper meta tags for responsiveness

Provide the following in your response:
1. A brief explanation of what changes you'll make and why
2. The specific code modifications to implement the request
3. Confirmation that you've validated these changes in the context of the entire HTML document

Your response should be in the following JSON format:
{
  "response": "Your explanation to the user about what changes you're making and why. Include follow-up questions here if you need clarification.",
  "modifications": [
    {
      "description": "Brief description of what this change does",
      "originalCode": "The exact code being replaced",
      "newCode": "The new code to use instead",
      "startLine": 10, // Starting line number (1-indexed)
      "endLine": 12, // Ending line number (1-indexed)
      "startCol": 0, // Optional: Starting column for more precise changes
      "endCol": 20, // Optional: Ending column for more precise changes
      "contextValidation": "Brief explanation of how you verified this change fits in the document context"
    }
    // Include additional modifications if needed
  ]
}

Make sure your modifications are correct, precise, and fully implement the user's request. Don't include line numbers in the code. The startLine and endLine should be the actual line numbers in the original code. Be as specific as possible about which parts of the code to modify.`;

    // Generate the response using AI SDK
    const { text, reasoning } = await generateText({
      model: anthropic('claude-3-7-sonnet-20250219'),
      prompt,
      maxTokens: 2000,
      temperature: 0.3,
    });

    // Parse the response
    try {
      // Try to parse directly, assuming the model returned valid JSON
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonString = jsonMatch[0];
          const jsonResponse = JSON.parse(jsonString);
          return NextResponse.json(jsonResponse);
        } catch (innerE) {
          console.error('Failed to parse extracted JSON:', innerE);
        }
      }
      
      // If all parsing attempts fail, return a generic response
      return NextResponse.json({
        response: text,
        modifications: []
      });
    }
  } catch (error) {
    console.error('Error in analyze-and-modify endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to analyze and modify code' },
      { status: 500 }
    );
  }
} 