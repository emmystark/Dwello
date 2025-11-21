// upload.js (Node)
const fetch = require('node-fetch'); 
const fs = require('fs');
const FormData = require('form-data');

(async () => {
  const UPLOAD_URL = 'https://publisher.walrus-testnet.walrus.space/v1/blob-upload-relay';
  const WALRUS_BASE = 'https://publisher.walrus-testnet.walrus.space';


  const TIP_CONFIG_URL = `${WALRUS_BASE}/v1/tip-config`;

  fetch(TIP_CONFIG_URL)
    .then(res => res.json())
    .then(config => {
      console.log('Tip config:', config);
    });

fetch(TIP_CONFIG_URL)
  .then(res => res.json())
  .then(config => {
    console.log('Tip config:', config);
    // If config indicates a tip is required, you must send a tip transaction and use its digest as TOKEN
  });


  const TOKEN = 'YOUR_TOKEN'; // replace

  const form = new FormData();
  form.append('file', fs.createReadStream('/mnt/data/3F34F437-01E0-4714-8088-D04E50AF5BF6.png'));

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form
  });

  const json = await res.json();
  console.log('upload response:', json);

  const blobId = json.blob_id ?? json.blobId ?? json.id ?? json.cid ?? json.hash;
  if (!blobId) throw new Error('No blob id found in upload response.');

  const blobUrl = new URL(`/v1/blobs/${encodeURIComponent(blobId)}`, WALRUS_BASE).toString();

  const property = { id: 'prop_1', title: 'Example' };
  property.walrusId = blobId;
  property.imageUrl = blobUrl;

  console.log('Saved property:', property);
})();