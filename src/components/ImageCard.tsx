// src/components/ImageCard.tsx
import { getWalrusUrl } from '../lib/walrus';

interface Props {
  blobId: string;
  url?: string; // optional fallback
}

export function ImageCard({ blobId, url }: Props) {
  const finalUrl = url || getWalrusUrl(blobId);

  return (
    <div className="image-card">
      <img 
        src={finalUrl} 
        alt="Walrus stored"
        loading="lazy"
        style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
        onError={(e) => {
          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Walrus+Loading...';
        }}
      />
      <div className="info">
        <small>{blobId.slice(0, 12)}...</small>
        <a href={finalUrl} target="_blank" rel="noopener">Open</a>
      </div>
    </div>
  );
}
