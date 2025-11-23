// src/components/UploadZone.tsx
import { useCurrentAccount } from '@mysten/dapp-kit';
import { walrusClient } from '../lib/walrus';
import { toast } from 'react-toastify';

interface Props {
  onUpload: (blobId: string, url: string) => void;
}

export function UploadZone({ onUpload }: Props) {
  const account = useCurrentAccount();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!account || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();

    try {
      const result = await walrusClient.writeBlob({
        blob: new Uint8Array(arrayBuffer),
        epochs: 26, // ~1 year on mainnet
      });

      const url = `${walrusClient.config.aggregatorUrl}/v1/${result.blobId}`;
      
      onUpload(result.blobId, url);
      toast.success('Uploaded to Walrus forever!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };

  return (
    <div className="upload-zone">
      <input type="file" accept="image/*" onChange={handleFile} />
      <p>Drag & drop or click to upload to Walrus</p>
    </div>
  );
}