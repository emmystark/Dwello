// src/App.tsx
import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { UploadZone } from './components/UploadZone';
import { ImageCard } from './components/ImageCard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Image {
  blobId: string;
  url: string;
  timestamp: number;
}

function App() {
  const account = useCurrentAccount();
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('dwello-images');
    if (saved) setImages(JSON.parse(saved));
  }, []);

  const addImage = (blobId: string, url: string) => {
    const newImage = { blobId, url, timestamp: Date.now() };
    const updated = [newImage, ...images];
    setImages(updated);
    localStorage.setItem('dwello-images', JSON.stringify(updated));
  };

  return (
    <>
      <div className="app">
        <header>
          <h1>Dwello 🦭</h1>
          <ConnectButton />
        </header>

        {account ? (
          <>
            <UploadZone onUpload={addImage} />
            
            <div className="gallery">
              {images.map((img) => (
                <ImageCard key={img.blobId} blobId={img.blobId} url={img.url} />
              ))}
            </div>
          </>
        ) : (
          <p>Connect wallet to upload permanent images to Walrus</p>
        )}
      </div>
      <ToastContainer position="bottom-right" />
    </>
  );
}

export default App;