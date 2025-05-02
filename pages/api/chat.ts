import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OllamaError, OllamaStream } from '@/utils/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import { ChatBody, Message } from '@/types/chat';


export const config = {
  runtime: 'edge',
};

const handler = async (req: NextRequest): Promise<Response> => {
  try {
    const token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as JWT & { user?: { id?:string; email?: string } } | null;
    const uuid = token?.user?.id;
    const email = token?.user?.email;
    const { model, system, options, prompt } = (await req.json()) as ChatBody;


    let promptToSend = system;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = options?.temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const stream = await OllamaStream (model, promptToSend, temperatureToUse, prompt, {uuid, email});

    return new Response(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof OllamaError) {
      // Return a more descriptive error message to help with debugging
      return new Response(JSON.stringify({ 
        error: 'Ollama Error', 
        message: error.message,
        suggestion: error.message.includes('OLLAMA_HOST') ? 
          'Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434' : 
          'Check if Ollama is running and accessible'
      }), { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    }
  }
};

export default handler;
