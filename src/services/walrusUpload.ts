import fetch from 'node-fetch';
import FormData from 'form-data';

const WALRUS_PUBLISHER =
  'https://publisher.walrus-testnet.walrus.space';

export async function uploadToWalrus(
  buffer: Buffer,
  filename: string,
  metadata: Record<string, any>
) {
  const form = new FormData();
  form.append('file', buffer, filename);
  form.append('metadata', JSON.stringify(metadata));

  const res = await fetch(
    `${WALRUS_PUBLISHER}/v1/blob-upload-relay`,
    {
      method: 'POST',
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  const json = await res.json();

  const blobId =
    json.blob_id ||
    json.blobId ||
    json.id ||
    json.cid ||
    json.hash;

  if (!blobId) {
    throw new Error('Walrus did not return a blobId');
  }

  return blobId;
}
