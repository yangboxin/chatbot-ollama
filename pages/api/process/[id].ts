import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, File as FormidableFile } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Client } from 'minio';
import Redis from 'ioredis';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id, chunk } = req.query as { id: string; chunk?: string };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
   
    const form = new IncomingForm();
    const { files } = await new Promise<{ files: Files }>((resolve, reject) => {
      form.parse(req, (err, _fields, files) =>
        err ? reject(err) : resolve({ files })
      );
    });

    const fileField = files.file;
    if (!fileField) {
      return res.status(400).json({ error: 'Missing file upload' });
    }
    const file = Array.isArray(fileField)
      ? (fileField[0] as FormidableFile)
      : (fileField as FormidableFile);
    if (typeof file.filepath !== 'string') {
      return res.status(400).json({ error: 'Invalid file upload' });
    }


    const buffer = fs.readFileSync(file.filepath);
    fs.unlinkSync(file.filepath);
    const endpoint = process.env.MINIO_ENDPOINT;
      if(!endpoint){
        throw new Error('MINIO_ENDPOINT not set');
      }
    const minioClient = new Client({
      endPoint: endpoint,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    const bucket = process.env.MINIO_BUCKET_NAME;
    if (!bucket) {
      throw new Error('MINIO_BUCKET_NAME not set');
    }
    const objectName = `${id}`;
    await minioClient.putObject(bucket, objectName, buffer, buffer.length, {'Content-Type': file.mimetype || 'application/pdf'});

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const queueName = process.env.REDIS_QUEUE_NAME || 'document-processor';
    const redis = new Redis(redisUrl);
    const task = {
      chunk: chunk || 'paragraph',
      objectName: `${id}`,
    }
    await redis.lpush(queueName, JSON.stringify(task));
    const items = await redis.lrange(queueName, 0, 5);
    console.log('Redis queue:', items); 
    return res.status(200).json({ enqueued: true, queue: queueName, task });
  } catch (error: any) {
    console.error('Process handler error:', error);
    return res
      .status(500)
      .json({ error: 'Process failed', message: error.message });
  }
}