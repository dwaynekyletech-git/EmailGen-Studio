import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Define interfaces for the service
interface ConversionResult {
  html: string;
  css?: string;
  metadata: {
    originalFileName: string;
    conversionTimestamp: string;
    designType: string;
    responsive: boolean;
  };
}

interface ConversionOptions {
  makeResponsive: boolean;
  optimizeForEmail: boolean;
  targetPlatform: 'sfmc' | 'generic';
}

/**
 * AI-powered service to convert design files to HTML
 */
export class AIConversionService {
  private anthropic: Anthropic;
  private supabase: ReturnType<typeof createClient>;
  
  constructor(
    anthropicApiKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Analyzes a design file and extracts its structure
   * @param filePath Path to the file in Supabase storage
   * @param fileType Type of the design file (.psd, .xd, .fig)
   */
  private async analyzeDesignFile(filePath: string, fileType: string): Promise<any> {
    // In a real implementation, this would use specialized libraries to parse design files
    // For now, we'll return a mock structure based on the file type
    
    console.log(`Analyzing design file: ${filePath} (${fileType})`);
    
    // Get the file URL from Supabase
    const { data: { publicUrl } } = this.supabase
      .storage
      .from('design-files')
      .getPublicUrl(filePath);
      
    console.log(`File public URL: ${publicUrl}`);
    
    // Mock analysis result
    return {
      layout: 'single-column',
      elements: [
        { type: 'header', text: 'Welcome to our Newsletter' },
        { type: 'image', src: 'placeholder.jpg', alt: 'Header Image' },
        { type: 'text', content: 'This is the main content of the email.' },
        { type: 'button', text: 'Call to Action', url: '#' },
        { type: 'footer', text: '© 2023 Company Name' }
      ],
      colors: {
        primary: '#4A90E2',
        secondary: '#50E3C2',
        background: '#FFFFFF',
        text: '#333333'
      },
      fonts: {
        heading: 'Arial, sans-serif',
        body: 'Helvetica, sans-serif'
      }
    };
  }
  
  /**
   * Generates HTML from the analyzed design structure using Claude
   * @param designStructure The analyzed design structure
   * @param options Conversion options
   */
  private async generateHtmlWithClaude(
    designStructure: any,
    fileName: string,
    options: ConversionOptions
  ): Promise<string> {
    console.log('Generating HTML with Claude');
    
    const prompt = `
You are an expert email developer specializing in converting design files to responsive HTML emails.

I have a design file named "${fileName}" with the following structure:
${JSON.stringify(designStructure, null, 2)}

Please convert this design into ${options.optimizeForEmail ? 'an HTML email' : 'HTML'} that is:
${options.makeResponsive ? '- Fully responsive for all devices' : '- Optimized for desktop viewing'}
${options.optimizeForEmail ? '- Compatible with email clients' : '- Compatible with web browsers'}
${options.targetPlatform === 'sfmc' ? '- Specifically optimized for Salesforce Marketing Cloud' : '- Using standard HTML practices'}

The HTML should:
1. Use table-based layout for email client compatibility
2. Include proper meta tags and media queries for responsiveness
3. Use inline CSS for maximum email client compatibility
4. Follow accessibility best practices
5. Include comments explaining the structure
6. Pay special attention to precise spacing and positioning between elements

IMPORTANT SPACING AND POSITIONING REQUIREMENTS:
- For all elements, maintain exact spacing as would be shown in the design
- Use precise pixel values for margins, padding, and line-heights
- Ensure consistent whitespace distribution throughout the email
- Maintain proper vertical alignment of all elements
- For text blocks, set appropriate line spacing to ensure readability
- Use spacer elements with fixed dimensions when necessary to maintain layout
- For vertical spacing between sections, use precise measurements
- Ensure proper separation between paragraphs and content blocks

IMPLEMENTATION TECHNIQUES:
- Use table cells with fixed heights for spacing when needed
- Use line-height with exact pixel values for text spacing
- Use padding and margin with precise values
- For maintaining whitespace, use transparent spacer elements with exact dimensions
- Set specific heights on container elements to prevent content from collapsing

Please provide only the complete HTML code without any explanations.
`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.2,
        system: "You are an expert email developer who converts design mockups into responsive HTML emails that work across all email clients.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      // Extract the HTML from the response
      const htmlContent = response.content[0].text;
      return htmlContent;
    } catch (error) {
      console.error('Error generating HTML with Claude:', error);
      throw new Error('Failed to generate HTML with Claude');
    }
  }
  
  /**
   * Converts a design file to HTML
   * @param filePath Path to the file in Supabase storage
   * @param fileName Original file name
   * @param options Conversion options
   */
  public async convertDesignToHtml(
    filePath: string,
    fileName: string,
    options: ConversionOptions = {
      makeResponsive: true,
      optimizeForEmail: true,
      targetPlatform: 'sfmc'
    }
  ): Promise<ConversionResult> {
    try {
      console.log(`Converting design file: ${fileName}`);
      
      // Get the file extension
      const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
      
      // Analyze the design file
      const designStructure = await this.analyzeDesignFile(filePath, fileExtension);
      
      // Generate HTML using Claude
      const html = await this.generateHtmlWithClaude(designStructure, fileName, options);
      
      // Return the conversion result
      return {
        html,
        metadata: {
          originalFileName: fileName,
          conversionTimestamp: new Date().toISOString(),
          designType: fileExtension.replace('.', '').toUpperCase(),
          responsive: options.makeResponsive
        }
      };
    } catch (error) {
      console.error('Error converting design to HTML:', error);
      throw new Error(`Failed to convert design to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Streams the HTML generation process
   * @param filePath Path to the file in Supabase storage
   * @param fileName Original file name
   * @param options Conversion options
   */
  public async streamConversion(
    filePath: string,
    fileName: string,
    options: ConversionOptions = {
      makeResponsive: true,
      optimizeForEmail: true,
      targetPlatform: 'sfmc'
    }
  ): Promise<Response> {
    console.log(`Streaming conversion for: ${fileName}`);
    
    // Get the file extension
    const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
    
    // Analyze the design file
    const designStructure = await this.analyzeDesignFile(filePath, fileExtension);
    
    const prompt = `
You are an expert email developer specializing in converting design files to responsive HTML emails.

I have a design file named "${fileName}" with the following structure:
${JSON.stringify(designStructure, null, 2)}

Please convert this design into ${options.optimizeForEmail ? 'an HTML email' : 'HTML'} that is:
${options.makeResponsive ? '- Fully responsive for all devices' : '- Optimized for desktop viewing'}
${options.optimizeForEmail ? '- Compatible with email clients' : '- Compatible with web browsers'}
${options.targetPlatform === 'sfmc' ? '- Specifically optimized for Salesforce Marketing Cloud' : '- Using standard HTML practices'}

The HTML should:
1. Use table-based layout for email client compatibility
2. Include proper meta tags and media queries for responsiveness
3. Use inline CSS for maximum email client compatibility
4. Follow accessibility best practices
5. Include comments explaining the structure
6. Pay special attention to precise spacing and positioning between elements

IMPORTANT SPACING AND POSITIONING REQUIREMENTS:
- For all elements, maintain exact spacing as would be shown in the design
- Use precise pixel values for margins, padding, and line-heights
- Ensure consistent whitespace distribution throughout the email
- Maintain proper vertical alignment of all elements
- For text blocks, set appropriate line spacing to ensure readability
- Use spacer elements with fixed dimensions when necessary to maintain layout
- For vertical spacing between sections, use precise measurements
- Ensure proper separation between paragraphs and content blocks

IMPLEMENTATION TECHNIQUES:
- Use table cells with fixed heights for spacing when needed
- Use line-height with exact pixel values for text spacing
- Use padding and margin with precise values
- For maintaining whitespace, use transparent spacer elements with exact dimensions
- Set specific heights on container elements to prevent content from collapsing

Please provide only the complete HTML code without any explanations.
`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.2,
        system: "You are an expert email developer who converts design mockups into responsive HTML emails that work across all email clients.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: true
      });
      
      // Create a TransformStream to handle the streaming response
      const { readable, writable } = new TransformStream();
      
      // Pipe the Anthropic stream to our transform stream
      const writer = writable.getWriter();
      
      // Process the stream events
      (async () => {
        try {
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.text) {
              writer.write(new TextEncoder().encode(chunk.delta.text));
            }
          }
          writer.close();
        } catch (err) {
          writer.abort(err);
          console.error('Error processing stream:', err);
        }
      })();
      
      // Return the readable stream as the response
      return new Response(readable);
    } catch (error) {
      console.error('Error streaming conversion:', error);
      throw new Error('Failed to stream conversion');
    }
  }
}

// Factory function to create the service
export function createAIConversionService(): AIConversionService {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!anthropicApiKey) {
    console.warn('ANTHROPIC_API_KEY is not set. AI conversion will not work properly.');
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase configuration is incomplete. File storage will not work properly.');
  }
  
  return new AIConversionService(anthropicApiKey, supabaseUrl, supabaseKey);
}

// Default export
export default createAIConversionService; 