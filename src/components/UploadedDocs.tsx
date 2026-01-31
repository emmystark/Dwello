import { useState, useEffect } from 'react';
import { useSui } from '../sui/SuiProviders';  // Assuming this provides the connected account
import { getWalrusBlobUrl } from '../walrus/client';  // For generating preview URLs
import '../styles/UploadedDocs.css';  // Create this CSS file if needed (styles below)

interface UploadMetadata {
  blobId: string;
  filename: string;
  originalFilename: string;
  uploadedAt: string;
  caretakerAddress: string;
  url: string;
  size: number;
  epochs: number;
  walrusResponse?: any;  // Optional full response
}

const UploadedDocs = () => {
  const { account } = useSui();  // Get connected Sui wallet address
  const [uploads, setUploads] = useState<UploadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUploads = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL('/api/walrus/uploads', window.location.origin);
        if (account) {
          url.searchParams.append('caretakerAddress', account);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch uploads: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Invalid response');
        }
        setUploads(data.uploads);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        console.error('Error fetching uploads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUploads();
  }, [account]);  // Refetch if account changes

  if (loading) {
    return (
      <div className="uploaded-docs-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading uploaded documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="uploaded-docs-page">
        <div className="error-state">
          <h2>Error Loading Uploads</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="uploaded-docs-page">
      <div className="header">
        <h1>Uploaded Documents</h1>
        <p>Showing {uploads.length} uploads {account ? `for ${account}` : '(all)'}</p>
      </div>
      {uploads.length === 0 ? (
        <div className="empty-state">
          <p>No uploads found.</p>
        </div>
      ) : (
        <div className="uploads-grid">
          {uploads.map((upload) => (
            <div key={upload.blobId} className="upload-item">
              <div className="preview">
                {upload.filename.endsWith('.mp4') || upload.url.includes('/video/') ? (
                  <video src={upload.url} controls muted loop className="media-preview" />
                ) : (
                  <img src={upload.url} alt={upload.filename} className="media-preview" onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';  // Fallback image
                  }} />
                )}
              </div>
              <div className="metadata">
                <h3>{upload.filename}</h3>
                <p>Blob ID: {upload.blobId}</p>
                <p>Size: {(upload.size / 1024).toFixed(2)} KiB</p>
                <p>Uploaded: {new Date(upload.uploadedAt).toLocaleString()}</p>
                <p>Expires after: {upload.epochs} epochs</p>
                <p>Caretaker: {upload.caretakerAddress}</p>
              </div>
              <div className="actions">
                <a href={upload.url} download={upload.originalFilename} className="btn-download">
                  Download
                </a>
                <button onClick={() => navigator.clipboard.writeText(upload.blobId)} className="btn-copy">
                  Copy Blob ID
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadedDocs;