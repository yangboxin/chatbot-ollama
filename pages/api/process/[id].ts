import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, File as FormidableFile } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id: string };

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

    const upstreamForm = new FormData();
    upstreamForm.append(
      'file',
      buffer,
      {
        filename: file.originalFilename || 'upload.pdf',
        contentType: file.mimetype || 'application/pdf',
      }
    );

    const processorUrl = process.env.DOCUMENT_PROCESSOR_URL;
    if (!processorUrl) {
      throw new Error('DOCUMENT_PROCESSOR_URL not set');
    }


    const upstream = await fetch(`${processorUrl}/process/${id}`, {
      method: 'POST',
      headers: upstreamForm.getHeaders(),
      body: upstreamForm,
    });

    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: any) {
    console.error('Process handler error:', error);
    return res
      .status(500)
      .json({ error: 'Process failed', message: error.message });
  }
}