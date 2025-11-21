import { useState, useEffect } from 'react';

export function ImageCard({ blobId }: { blobId: string }) {
  const urls = [
    `https://walrus.my-gateway.io/v1/${blobId}`,
    `https://aggregator.walrus.space/v1/${blobId}`,
    `https://walrus-storage.s3.us-east-1.amazonaws.com/${blobId}`, // emergency backup
  ];

  const [currentUrl, setCurrentUrl] = useState(urls[0]);

  useEffect(() => {
    const img = new Image();
    img.src = currentUrl;

    const timer = setTimeout(() => {
      if (!img.complete || img.naturalWidth === 0) {
        const next = urls.find(u => u !== currentUrl);
        if (next) setCurrentUrl(next);
      }
    }, 8000); // wait 8s before fallback

    return () => clearTimeout(timer);
  }, [currentUrl]);

  return (
    <img
      src={currentUrl}
      alt="Dwello on Walrus"
      loading="lazy"
      onError={() => setCurrentUrl('https://via.placeholder.com/400?text=Aggregating...')}
    />
  );
}