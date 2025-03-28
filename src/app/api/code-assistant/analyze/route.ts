import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Types for code analysis responses
interface CodeAnalysisResult {
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    code?: string;
    lineNumber?: number;
    type: 'improvement' | 'error' | 'warning' | 'info';
  }>;
  reasoning?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { code, context } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code content is required' },
        { status: 400 }
      );
    }

    // Use AI SDK with Claude to analyze the code
    const { text, reasoning } = await generateText({
      model: anthropic('claude-3-opus-20240229'),
      prompt: `You are an expert HTML email developer assistant. You only know about HTML, CSS, Ampscript and SFMC. Analyze the following email HTML code and provide actionable suggestions for improvement.
      
      Focus on:
      1. Email client compatibility issues
      2. Responsive design best practices
      3. Accessibility concerns
      4. Code structure and organization
      5. Performance optimizations
      
      The code to analyze is:
      \`\`\`html
      ${code}
      \`\`\`
      ${context ? `\nAdditional context: ${context}` : ''}
      
      Respond with a JSON object that contains an array of suggestions with the following structure:
      {
        "suggestions": [
          {
            "id": "unique-id",
            "title": "Brief title of the suggestion",
            "description": "Detailed explanation of the issue and how to fix it",
            "code": "Optional code snippet to replace or add",
            "lineNumber": 123, // Optional line number where the issue occurs
            "type": "error" // One of: "improvement", "error", "warning", "info"
          }
        ]
      }
      
      Provide only the JSON object with no additional text or explanation.`,
      maxTokens: 2000,
      temperature: 0.2,
    });

    // Parse the response to get suggestions
    let analysisResult: CodeAnalysisResult;
    try {
      analysisResult = JSON.parse(text);
    } catch (e) {
      // If parsing fails, return a formatted error response
      return NextResponse.json(
        { error: 'Failed to parse model response', rawResponse: text },
        { status: 500 }
      );
    }

    // Include the reasoning if available
    if (reasoning) {
      analysisResult.reasoning = reasoning;
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing code:', error);
    return NextResponse.json(
      { error: 'Failed to analyze code' },
      { status: 500 }
    );
  }
} 