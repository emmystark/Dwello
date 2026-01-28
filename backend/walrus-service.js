import fetch from 'node-fetch';
import FormData from 'form-data';

const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space';

export async function uploadToWalrus(buffer, filename, metadata = {}) {
  const TIP_CONFIG_URL = `${WALRUS_PUBLISHER}/v1/tip-config`;

  // 1️⃣ Check tip config
  const tipRes = await fetch(TIP_CONFIG_URL);
  const tipConfig = await tipRes.json();

  let headers = {};
  if (tipConfig?.required) {
    throw new Error('Walrus tip required — implement tip tx');
  }

  // 2️⃣ Upload
  const form = new FormData();
  form.append('file', buffer, filename);
  form.append('metadata', JSON.stringify(metadata));

  const uploadRes = await fetch(
    `${WALRUS_PUBLISHER}/v1/blob-upload-relay`,
    {
      method: 'POST',
      headers,
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(text);
  }

  const json = await uploadRes.json();

  const blobId =
    json.blob_id || json.blobId || json.id || json.cid || json.hash;

  if (!blobId) {
    throw new Error('No blobId returned from Walrus');
  }

  return {
    blobId,
    url: `${WALRUS_PUBLISHER}/v1/blobs/${blobId}`,
    size: buffer.length,
    tags: metadata,
  };
}
