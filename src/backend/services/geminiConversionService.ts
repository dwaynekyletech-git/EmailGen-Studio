import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';

// Define interfaces for the service
interface ConversionResult {
  html: string;
  css?: string;
  metadata: {
    originalFileName: string;
    conversionTimestamp: string;
    designType: string;
    responsive: boolean;
    userId?: string;
    conversionId?: string;
  };
}

// Define conversion options interface
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
    // For Gemini, we need to use specific MIME types
    // Only PDF files are accepted now
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf'
    };
    
    return mimeTypes[fileExtension] || 'application/octet-stream';
  }
  
  /**
   * Validates that the file is a PDF
   * @param fileExtension The file extension
   */
  private validateFileType(fileExtension: string): boolean {
    return fileExtension.toLowerCase() === '.pdf';
  }

  /**
   * Process a PDF file to extract pages
   * @param pdfBuffer The PDF file as a buffer
   * @returns An array of data URLs for each page
   */
  private async processPdfFile(pdfBuffer: ArrayBuffer): Promise<string[]> {
    try {
      console.log('Processing PDF to extract pages');
      const pageDataUrls: string[] = [];
      
      // Extract pages with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log(`PDF has ${pageCount} pages`);
      
      // Extract each page
      for (let i = 0; i < pageCount; i++) {
        try {
          // Create a new PDF document containing just this page
          const singlePagePdf = await PDFDocument.create();
          const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
          singlePagePdf.addPage(copiedPage);
          
          // Save the single-page PDF as binary data
          const singlePagePdfBytes = await singlePagePdf.save();
          
          // Convert to base64 data URL
          const dataUrl = this.arrayBufferToDataURL(
            new Uint8Array(singlePagePdfBytes).buffer, 
            'application/pdf'
          );
          
          pageDataUrls.push(dataUrl);
          console.log(`Page ${i+1} processed successfully as PDF`);
        } catch (error) {
          console.error(`Error processing page ${i+1}:`, error);
        }
      }
      
      // If we couldn't extract any pages, use the full PDF
      if (pageDataUrls.length === 0) {
        console.log('Falling back to using entire PDF');
        const dataUrl = this.arrayBufferToDataURL(pdfBuffer, 'application/pdf');
        pageDataUrls.push(dataUrl);
      }
      
      return pageDataUrls;
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Fallback to just passing the entire PDF
      console.log('Falling back to using entire PDF without processing');
      const dataUrl = this.arrayBufferToDataURL(pdfBuffer, 'application/pdf');
      return [dataUrl];
    }
  }

  /**
   * Converts a design file to a format Gemini can process
   * @param filePath Path to the file in Supabase storage or a temp path
   * @param fileType Type of the design file
   * @param fileBuffer Optional buffer when using simulated paths
   */
  private async convertDesignToImage(
    filePath: string, 
    fileType: string,
    fileBuffer?: ArrayBuffer
  ): Promise<ArrayBuffer> {
    console.log(`Processing design file: ${filePath} (${fileType})`);
    
    // Validate file type is PDF
    if (!this.validateFileType(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}. Only PDF files are accepted.`);
    }
    
    // If a buffer is directly provided, use it instead of downloading
    if (fileBuffer) {
      console.log('Using provided file buffer instead of downloading');
      return fileBuffer;
    }
    
    // Check if this is a simulated path (starts with 'temp/')
    if (filePath.startsWith('temp/')) {
      console.log('Using simulated path - in a production environment, this would download from Supabase');
      throw new Error('No file buffer provided for simulated path. In development mode, please provide the file buffer directly.');
    }
    
    // Download the file from Supabase (only for real paths)
    try {
      const { data, error } = await this.supabase
        .storage
        .from('design-files')
        .download(filePath);
        
      if (error) {
        console.error('Error downloading file:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }
      
      const arrayBuffer = await data.arrayBuffer();
      return arrayBuffer;
    } catch (error) {
      console.error('Error in file processing:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generates HTML from the design image using Gemini
   * @param imageBuffer The image buffer
   * @param fileName Original file name
   * @param fileType File extension
   */
  private async generateHtmlWithGemini(
    imageBuffer: ArrayBuffer,
    fileName: string,
    fileType: string
  ): Promise<string> {
    console.log('Generating HTML with Gemini');
    
    // Get the appropriate MIME type for the file
    const mimeType = this.getMimeType(fileType);
    
    // Process the PDF file to extract pages
    const pdfPages = await this.processPdfFile(imageBuffer);
    console.log(`Extracted ${pdfPages.length} pages from PDF`);
    
    // Create a prompt for Gemini with information about multiple pages
    const prompt = `
You are an expert email developer specializing in converting design files to responsive HTML emails.

I have a PDF design file named "${fileName}" that contains a single page with both desktop and mobile versions of the email.

This PDF has only one page that I'm providing to you:
- This single page contains both the desktop and mobile versions of the email design.
- The desktop version is typically wider and appears on the left or top portion of the PDF.
- The mobile version is narrower and appears on the right or bottom portion of the PDF.

IMPORTANT: You MUST implement the EXACT design shown in the PDF, including:
- All text content exactly as it appears in the design
- All images, buttons, and layout elements in their exact positions
- The precise fonts, colors, and spacing shown
- The exact layout structure for both desktop and mobile designs

DO NOT use placeholders like "desktop content" or "mobile content". 
IMPLEMENT THE FULL HTML for the ACTUAL DESIGN shown in the PDF.

Please convert this design into an HTML email that is:
- Fully responsive for all devices
- The desktop version should be used to create the desktop view of the email
- The mobile version should be used to create the mobile view of the email using media queries
- All responsive elements should transform exactly as shown in both designs
- Compatible with email clients
- Specifically optimized for Salesforce Marketing Cloud

The HTML should:
1. Use table-based layout for email client compatibility
2. Include proper meta tags and media queries for responsiveness
3. Use inline CSS for maximum email client compatibility
4. Ensure font sizes, spacing, and layouts match both designs precisely
5. Follow accessibility best practices
6. Include commented sections to clearly identify desktop vs. mobile-specific code

Again, it is CRITICAL that you do not use placeholders - implement the actual design content exactly as shown in the PDF.

Please provide only the complete HTML code without any explanations.
`;

    try {
      // Use Gemini Flash model with temperature 0 for consistent results
      const model = this.gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0,
          topP: 0.95,
          topK: 0,
          maxOutputTokens: 8192,
        },
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
      
      // Create parts array with text prompt and PDF pages
      const parts: any[] = [{ text: prompt }];
      
      // Add all PDF pages to the parts array
      for (let i = 0; i < pdfPages.length; i++) {
        const pageDataUrl = pdfPages[i];
        const isImageData = pageDataUrl.startsWith('data:image/');
        
        parts.push({ 
          inlineData: { 
            mimeType: isImageData ? 'image/png' : 'application/pdf', 
            data: pageDataUrl.split(',')[1]
          }
        });
      }
      
      // Send the multipart content to Gemini
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: parts
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
      throw new Error(`Failed to generate HTML with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Converts a design file to HTML
   * @param filePath Path to the file in Supabase storage
   * @param fileName Original file name
   * @param fileBuffer Optional array buffer of the file (for simulated paths)
   */
  public async convertDesignToHtml(
    filePath: string,
    fileName: string,
    fileBuffer?: ArrayBuffer
  ): Promise<ConversionResult> {
    try {
      console.log(`Converting design file: ${fileName}`);
      
      // Get the file extension
      const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
      
      // Validate file type
      if (!this.validateFileType(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}. Only PDF files are accepted.`);
      }
      
      // Convert the design file to an image/buffer
      const imageBuffer = await this.convertDesignToImage(filePath, fileExtension, fileBuffer);
    
      // Generate HTML using Gemini
      const html = await this.generateHtmlWithGemini(
        imageBuffer,
        fileName,
        fileExtension
      );
      
      console.log('HTML generated successfully, length:', html.length);
      
      // Return the conversion result
      return {
        html,
        metadata: {
          originalFileName: fileName,
          conversionTimestamp: new Date().toISOString(),
          designType: fileExtension.replace('.', '').toUpperCase(),
          responsive: true
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
   * @param options Conversion options or file buffer for backward compatibility
   */
  public async streamConversion(
    filePath: string,
    fileName: string,
    options?: ConversionOptions | ArrayBuffer
  ): Promise<Response> {
    try {
      console.log(`Streaming conversion for: ${fileName}`);
      
      let fileBuffer: ArrayBuffer | undefined;
      
      // Handle backward compatibility - check if options is actually an ArrayBuffer
      if (options instanceof ArrayBuffer) {
        fileBuffer = options;
        options = {
          makeResponsive: true,
          optimizeForEmail: true,
          targetPlatform: 'sfmc'
        };
      }
      
      // Get the file extension
      const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
      
      // Validate file type
      if (!this.validateFileType(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}. Only PDF files are accepted.`);
      }
      
      // Convert the design file to an image buffer
      const imageBuffer = await this.convertDesignToImage(filePath, fileExtension, fileBuffer);
      
      // Process the PDF file
      const pdfPages = await this.processPdfFile(imageBuffer);
      console.log(`Extracted ${pdfPages.length} pages from PDF for streaming`);
      
      // Create a prompt using the options
      const prompt = `
You are an expert email developer specializing in converting design files to responsive HTML emails.

I have a multi-page PDF design file named "${fileName}" that contains separate pages for desktop and mobile versions of the email.

This PDF has ${pdfPages.length} pages that I'm providing to you:
- Page 1 contains the desktop version of the email design
${pdfPages.length >= 2 ? '- Page 2 contains the mobile version of the email design' : ''}
${pdfPages.length > 2 ? `- The remaining ${pdfPages.length - 2} pages contain additional design elements or content` : ''}

IMPORTANT: You MUST implement BOTH the desktop AND mobile versions shown in the different pages of the PDF:
- Analyze each page separately for its specific purpose (desktop or mobile)
- Extract all content, styling, and layout from each page precisely
- Ensure the responsive design switches correctly between desktop and mobile layouts
- Do not mix elements between pages unless they are clearly the same element in different views

DO NOT use placeholders like "desktop content" or "mobile content". 
IMPLEMENT THE FULL HTML for the ACTUAL DESIGNS shown across all pages of the PDF.

Please convert these designs into ${options?.optimizeForEmail ? 'an HTML email' : 'HTML'} that is:
${options?.makeResponsive ? '- Fully responsive for all devices' : '- Optimized for desktop viewing'}
${options?.makeResponsive ? '- The desktop version in page 1 should be used to create the desktop view of the email' : ''}
${options?.makeResponsive ? '- The mobile version in page 2 should be used to create the mobile view of the email using media queries' : ''}
${options?.makeResponsive ? '- All responsive elements should transform exactly as shown in the desktop vs mobile designs' : ''}
${options?.optimizeForEmail ? '- Compatible with email clients' : '- Compatible with web browsers'}
${options?.targetPlatform === 'sfmc' ? '- Specifically optimized for Salesforce Marketing Cloud' : '- Using standard HTML practices'}

The HTML should:
1. Use table-based layout for email client compatibility
2. Include proper meta tags and media queries for responsiveness that accurately reflect the mobile design in the PDF
3. Use inline CSS for maximum email client compatibility
4. Ensure font sizes, spacing, and layouts match both desktop and mobile designs precisely
5. Follow accessibility best practices
6. Include commented sections to clearly identify desktop vs. mobile-specific code

Again, it is CRITICAL that you do not use placeholders - implement the actual design content exactly as shown across all pages of the PDF.

Please provide only the complete HTML code without any explanations.
`;

      // Setup Gemini model with streaming and temperature 0
      const model = this.gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0,
          topP: 0.95,
          topK: 0,
          maxOutputTokens: 8192,
        },
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
      
      // Create a streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Create parts array with text prompt and PDF pages
      const parts: any[] = [{ text: prompt }];
      
      // Add all PDF pages to the parts array
      for (let i = 0; i < pdfPages.length; i++) {
        const pageDataUrl = pdfPages[i];
        const isImageData = pageDataUrl.startsWith('data:image/');
        
        parts.push({ 
          inlineData: { 
            mimeType: isImageData ? 'image/png' : 'application/pdf', 
            data: pageDataUrl.split(',')[1]
          }
        });
      }
      
      // Start the streaming process
      (async () => {
        try {
          const result = await model.generateContentStream({
            contents: [
              {
                role: "user",
                parts: parts
              }
            ],
          });
          
          let isFirstChunk = true;
          let htmlContent = '';
          
          // Process the stream
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            htmlContent += chunkText;
            
            // Detect if this is HTML content
            if (isFirstChunk) {
              isFirstChunk = false;
              // Write the initial JSON object with status
              await writer.write(
                new TextEncoder().encode(
                  JSON.stringify({
                    status: 'processing',
                    message: 'Converting design to HTML...'
                  }) + '\n'
                )
              );
            }
            
            // Send the chunk to the client
            await writer.write(
              new TextEncoder().encode(
                JSON.stringify({
                  status: 'chunk',
                  data: chunkText
                }) + '\n'
              )
            );
          }
          
          // Clean up the HTML - extract from markdown if needed
          const htmlMatch = htmlContent.match(/```html\s*([\s\S]*?)\s*```/) || 
                            htmlContent.match(/```\s*([\s\S]*?)\s*```/) ||
                            [null, htmlContent];
          
          const cleanedHtml = htmlMatch[1] || htmlContent;
          
          // Complete the response
          await writer.write(
            new TextEncoder().encode(
              JSON.stringify({
                status: 'complete',
                message: 'Conversion completed',
                html: cleanedHtml,
                metadata: {
                  originalFileName: fileName,
                  conversionTimestamp: new Date().toISOString(),
                  designType: fileExtension.replace('.', '').toUpperCase(),
                  responsive: options?.makeResponsive ?? true
                }
              }) + '\n'
            )
          );
          
          await writer.close();
        } catch (error) {
          console.error('Streaming error:', error);
          await writer.write(
            new TextEncoder().encode(
              JSON.stringify({
                status: 'error',
                error: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }) + '\n'
            )
          );
          await writer.close();
        }
      })();
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } catch (error) {
      console.error('Stream setup error:', error);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: `Failed to set up streaming: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
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