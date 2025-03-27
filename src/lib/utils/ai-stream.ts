import { StreamTextResult } from 'ai';

export function createResponseFromDataStream(dataStream: StreamTextResult<any, any>): Response {
  // Create a TransformStream to convert the data stream to a web-standard stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Process the data stream
  (async () => {
    try {
      for await (const part of dataStream) {
        if ('text' in part) {
          // Write the text chunk to the stream
          await writer.write(encoder.encode(part.text));
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
    } finally {
      await writer.close();
    }
  })();

  // Return a standard Response object with the readable stream
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
} 