import { Message } from '@/types/chat';
import { OllamaModel } from '@/types/ollama';

import { OLLAMA_HOST, API_TIMEOUT_DURATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

export const OllamaStream = async (
  model: string,
  systemPrompt: string,
  temperature : number,
  prompt: string,
) => {
  let url = `${OLLAMA_HOST}/api/generate`;
  
  // Create an AbortController with a long timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);
  const useStream = process.env.OLLAMA_STREAM === 'true';
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': useStream? 'text/event_stream':'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      method: 'POST',
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: useStream,
        system: systemPrompt,
        options: {
          temperature: temperature,
        },
      }),
      signal: controller.signal,
    });
    // console.log(res);
    
    // Clear the timeout since the request has completed
    clearTimeout(timeoutId);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
      const result = await res.json();
      if (result.error) {
        throw new OllamaError(
          result.error
        );
      } 
    }

    const responseStream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        for await (const chunk of res.body as any) {
          // Decode and accumulate the data
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          // Process all complete lines, keep last partial line in buffer
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const json = JSON.parse(trimmed);
              // Optionally check if done; if done, then close the stream
              if (json.done === true) {
                controller.close();
                return;
              }
              // Enqueue each response chunk
              if (json.response) {
                controller.enqueue(encoder.encode(json.response));
              }
            } catch (err) {
              // If parsing fails, optionally log and continue
              console.error('Failed to parse JSON chunk:', err);
            }
          }
        }
        // Process any remaining buffered text
        if (buffer.trim()) {
          try {
            const json = JSON.parse(buffer.trim());
            if (json.response) {
              controller.enqueue(encoder.encode(json.response));
            }
          } catch (err) {
            console.error('Failed to parse final JSON chunk:', err);
          }
        }
        controller.close();
      },
    });
    
    return responseStream;
  } catch (error) {
    // Clear the timeout if there was an error
    clearTimeout(timeoutId);
    
    // Check if this is a connection error, which might be related to OLLAMA_HOST setting
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OllamaError(
        `Connection error: Could not connect to Ollama at ${OLLAMA_HOST}. If you have set the OLLAMA_HOST environment variable, try removing it or ensuring it points to a valid Ollama instance.`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
};
