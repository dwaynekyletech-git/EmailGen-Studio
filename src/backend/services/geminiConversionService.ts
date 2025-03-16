import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
 * Gemini-powered service to convert design files to HTML
 */
export class GeminiConversionService {
  private gemini: GoogleGenerativeAI;
  private supabase: ReturnType<typeof createClient>;
  
  constructor(
    geminiApiKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Converts a file to a base64 data URL
   * @param arrayBuffer The array buffer of the file
   * @param mimeType The MIME type of the file
   */
  private arrayBufferToDataURL(arrayBuffer: ArrayBuffer, mimeType: string): string {
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
  
  /**
   * Gets the MIME type for a file extension
   * @param fileExtension The file extension
   */
  private getMimeType(fileExtension: string): string {
    const mimeTypes: Record<string, string> = {
      '.psd': 'image/vnd.adobe.photoshop',
      '.xd': 'application/vnd.adobe.xd',
      '.fig': 'application/octet-stream', // Figma doesn't have a standard MIME type
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    
    return mimeTypes[fileExtension] || 'application/octet-stream';
  }
  
  /**
   * Converts a design file to a PNG for Gemini to process
   * @param filePath Path to the file in Supabase storage
   * @param fileType Type of the design file
   */
  private async convertDesignToImage(filePath: string, fileType: string): Promise<ArrayBuffer> {
    console.log(`Converting design file to image: ${filePath} (${fileType})`);
    
    // For now, we'll just download the file and use it directly
    // In a real implementation, you would convert PSD/XD/FIG to PNG
    const { data, error } = await this.supabase
      .storage
      .from('design-files')
      .download(filePath);
      
    if (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
    
    // For demonstration purposes, we're using the file directly
    // In a real implementation, you would convert the file to PNG here
    return await data.arrayBuffer();
  }
  
  /**
   * Generates HTML from the design image using Gemini
   * @param imageBuffer The image buffer
   * @param fileName Original file name
   * @param options Conversion options
   */
  private async generateHtmlWithGemini(
    imageBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    options: ConversionOptions
  ): Promise<string> {
    console.log('Generating HTML with Gemini');
    
    // Convert the image buffer to a data URL
    const mimeType = this.getMimeType(fileType);
    const imageDataUrl = this.arrayBufferToDataURL(imageBuffer, mimeType);
    
    // Create a prompt for Gemini
    const prompt = `
You are an expert email developer specializing in converting design files to responsive HTML emails.

I have a design file named "${fileName}" that I need to convert to HTML.

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

Please provide only the complete HTML code without any explanations.
`;

    try {
      // Use Gemini Flash 2.0 model
      const model = this.gemini.getGenerativeModel({
        model: "gemini-flash-2.0",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
      
      // Create a multipart content array with text and image
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageDataUrl.split(',')[1] } }
            ]
          }
        ],
      });
      
      const response = result.response;
      const htmlContent = response.text();
      
      // Extract HTML code from the response
      // Sometimes Gemini might wrap the HTML in markdown code blocks
      const htmlMatch = htmlContent.match(/```html\s*([\s\S]*?)\s*```/) || 
                        htmlContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, htmlContent];
      
      return htmlMatch[1] || htmlContent;
    } catch (error) {
      console.error('Error generating HTML with Gemini:', error);
      throw new Error('Failed to generate HTML with Gemini');
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
      
      // Convert the design file to an image
      const imageBuffer = await this.convertDesignToImage(filePath, fileExtension);
      
      // Generate HTML using Gemini
      const html = await this.generateHtmlWithGemini(imageBuffer, fileName, fileExtension, options);
      
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
    try {
      console.log(`Converting design file for streaming: ${fileName}`);
      
      // Get the file extension
      const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
      
      // Convert the design file to an image
      const imageBuffer = await this.convertDesignToImage(filePath, fileExtension);
      
      // Generate HTML using Gemini (non-streaming for now)
      const html = await this.generateHtmlWithGemini(imageBuffer, fileName, fileExtension, options);
      
      // Create a ReadableStream to simulate streaming
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Write the HTML to the stream
      const encoder = new TextEncoder();
      writer.write(encoder.encode(html));
      writer.close();
      
      // Return the readable stream as the response
      return new Response(readable);
    } catch (error) {
      console.error('Error streaming conversion:', error);
      throw new Error('Failed to stream conversion');
    }
  }
}

// Factory function to create the service
export function createGeminiConversionService(): GeminiConversionService {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!geminiApiKey) {
    console.warn('GEMINI_API_KEY is not set. AI conversion will not work properly.');
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase configuration is incomplete. File storage will not work properly.');
  }
  
  return new GeminiConversionService(geminiApiKey, supabaseUrl, supabaseKey);
}

// Default export
export default createGeminiConversionService; 