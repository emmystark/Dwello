import { useState, useEffect } from 'react';
import { 
  getWalrusImageUrl, 
  isValidBlobId, 
  formatBlobId,
  getWalrusBlobInfo,
  VERIFIED_BLOBS 
} from '../lib/walrus-utils';

/**
 * WalrusImageTester Component
 * Use this to test and debug your Walrus image retrieval
 */
const WalrusImageTester = () => {
  const [testBlobId, setTestBlobId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Test a blob ID
  const testBlob = async (blobId: string) => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log('Testing blob ID:', blobId);

      // Validate blob ID
      const isValid = isValidBlobId(blobId);
      if (!isValid) {
        setTestResult({
          success: false,
          error: 'Invalid blob ID format',
          blobId,
        });
        setLoading(false);
        return;
      }

      // Get URL
      const url = getWalrusImageUrl(blobId);
      console.log('Generated URL:', url);

      // Get blob info
      const info = await getWalrusBlobInfo(blobId);
      console.log('Blob info:', info);

      // Try to load image
      const imageLoadable = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url!;
        setTimeout(() => resolve(false), 5000); // 5s timeout
      });

      setTestResult({
        success: info?.exists && imageLoadable,
        blobId,
        url,
        exists: info?.exists,
        size: info?.size,
        contentType: info?.contentType,
        imageLoadable,
        formatted: formatBlobId(blobId),
      });

    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: error.message,
        blobId,
      });
    } finally {
      setLoading(false);
    }
  };

  // Test all verified blobs on mount
  useEffect(() => {
    console.log('Your verified Walrus blobs:', VERIFIED_BLOBS);
  }, []);

  return (
    <div className="walrus-tester">
      <h2>🔍 Walrus Image Tester</h2>
      
      <div className="tester-section">
        <h3>Test a Blob ID</h3>
        <div className="test-input">
          <input
            type="text"
            value={testBlobId}
            onChange={(e) => setTestBlobId(e.target.value)}
            placeholder="Enter Walrus blob ID"
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button 
            onClick={() => testBlob(testBlobId)}
            disabled={loading || !testBlobId}
            style={{ padding: '10px 20px', cursor: 'pointer' }}
          >
            {loading ? 'Testing...' : 'Test Blob'}
          </button>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <h4>{testResult.success ? '✅ Success!' : '❌ Failed'}</h4>
            
            {testResult.error && (
              <p className="error-msg">Error: {testResult.error}</p>
            )}

            {testResult.url && (
              <div className="result-details">
                <p><strong>URL:</strong> <a href={testResult.url} target="_blank" rel="noopener noreferrer">{testResult.url}</a></p>
                <p><strong>Blob ID:</strong> {testResult.formatted}</p>
                <p><strong>Exists:</strong> {testResult.exists ? 'Yes' : 'No'}</p>
                <p><strong>Size:</strong> {testResult.size ? `${(testResult.size / 1024).toFixed(2)} KB` : 'Unknown'}</p>
                <p><strong>Type:</strong> {testResult.contentType || 'Unknown'}</p>
                <p><strong>Image Loadable:</strong> {testResult.imageLoadable ? 'Yes' : 'No'}</p>

                {testResult.imageLoadable && testResult.url && (
                  <div className="test-image-preview">
                    <h4>Image Preview:</h4>
                    <img 
                      src={testResult.url} 
                      alt="Test" 
                      style={{ maxWidth: '400px', marginTop: '10px' }}
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="verified-blobs-section">
        <h3>📦 Your Verified Blobs</h3>
        <p>These are the blobs from your <code>walrus list-blobs</code> output:</p>
        
        <div className="blob-list">
          {Object.entries(VERIFIED_BLOBS).map(([name, blobId]) => (
            <div key={blobId} className="blob-item">
              <div className="blob-info">
                <strong>{name}</strong>
                <code>{formatBlobId(blobId, 20)}</code>
              </div>
              <button 
                onClick={() => {
                  setTestBlobId(blobId);
                  testBlob(blobId);
                }}
                style={{ padding: '5px 15px', cursor: 'pointer' }}
              >
                Test
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-test-section">
        <h3>🚀 Quick Test URLs</h3>
        <p>Click to test these URLs directly in your browser:</p>
        {Object.values(VERIFIED_BLOBS).map((blobId) => {
          const url = getWalrusImageUrl(blobId);
          return (
            <div key={blobId} className="quick-url">
              <a href={url!} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            </div>
          );
        })}
      </div>

      <style>{`
        .walrus-tester {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .tester-section {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .test-result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
        }

        .test-result.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .test-result.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .result-details {
          margin-top: 15px;
        }

        .result-details p {
          margin: 8px 0;
        }

        .verified-blobs-section {
          background: #e7f3ff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .blob-list {
          margin-top: 15px;
        }

        .blob-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: white;
          margin-bottom: 10px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .blob-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .blob-info code {
          font-size: 12px;
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .quick-test-section {
          background: #fff3cd;
          padding: 20px;
          border-radius: 8px;
        }

        .quick-url {
          margin: 10px 0;
          padding: 10px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
          word-break: break-all;
        }

        .quick-url a {
          color: #007bff;
          text-decoration: none;
        }

        .quick-url a:hover {
          text-decoration: underline;
        }

        .test-image-preview {
          margin-top: 20px;
          padding: 15px;
          background: white;
          border-radius: 4px;
        }

        .error-msg {
          color: #721c24;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default WalrusImageTester;