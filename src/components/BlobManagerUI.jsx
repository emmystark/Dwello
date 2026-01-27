// components/BlobManagerUI.jsx
// User interface for listing, viewing, and downloading Walrus blobs

import React, { useState, useEffect } from 'react';
import {
  getAllBlobIdsFromDatabase,
  getMultipleBlobsMetadata,
  downloadBlobFromWalrus,
  downloadMultipleBlobsAsZip,
  createFullBackup,
  exportPropertiesWithBlobs,
  auditBlobSync
} from '../lib/walrusManager';
import { getWalrusUrl } from '../lib/walrusUpload';

export default function BlobManagerUI() {
  const [blobs, setBlobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBlobs, setSelectedBlobs] = useState(new Set());
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [filter, setFilter] = useState('all'); // 'all', 'images', 'documents'
  const [syncAudit, setSyncAudit] = useState(null);

  useEffect(() => {
    loadBlobs();
  }, []);

  const loadBlobs = async () => {
    setLoading(true);
    try {
      // Get all blob IDs from database
      const { blobIds } = await getAllBlobIdsFromDatabase();
      
      if (blobIds.length === 0) {
        setBlobs([]);
        return;
      }

      // Get metadata for each blob
      const metadata = await getMultipleBlobsMetadata(blobIds);
      setBlobs(metadata);
    } catch (error) {
      console.error('Error loading blobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectBlob = (blobId) => {
    const newSelected = new Set(selectedBlobs);
    if (newSelected.has(blobId)) {
      newSelected.delete(blobId);
    } else {
      newSelected.add(blobId);
    }
    setSelectedBlobs(newSelected);
  };

  const selectAll = () => {
    const filtered = getFilteredBlobs();
    setSelectedBlobs(new Set(filtered.map(b => b.blobId)));
  };

  const deselectAll = () => {
    setSelectedBlobs(new Set());
  };

  const downloadSelected = async () => {
    if (selectedBlobs.size === 0) return;

    setLoading(true);
    try {
      if (selectedBlobs.size === 1) {
        // Single download
        const blobId = [...selectedBlobs][0];
        await downloadBlobFromWalrus(blobId);
      } else {
        // Multiple download as ZIP
        await downloadMultipleBlobsAsZip([...selectedBlobs]);
      }
      alert(`Downloaded ${selectedBlobs.size} file(s)`);
    } catch (error) {
      alert('Download failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullBackup = async () => {
    if (!confirm('Download all files as ZIP? This may take a while.')) return;
    
    setLoading(true);
    try {
      const result = await createFullBackup();
      if (result.success) {
        alert(`Backup created with ${result.totalFiles} files`);
      } else {
        alert('Backup failed: ' + result.error);
      }
    } catch (error) {
      alert('Backup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const result = await exportPropertiesWithBlobs();
      if (result.success) {
        alert(`Exported ${result.propertiesExported} properties`);
      } else {
        alert('Export failed: ' + result.error);
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAudit = async () => {
    setLoading(true);
    try {
      const result = await auditBlobSync();
      setSyncAudit(result);
    } catch (error) {
      alert('Audit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBlobs = () => {
    if (filter === 'all') return blobs;
    if (filter === 'images') {
      return blobs.filter(b => b.contentType?.startsWith('image/'));
    }
    return blobs.filter(b => !b.contentType?.startsWith('image/'));
  };

  const filteredBlobs = getFilteredBlobs();

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Walrus Blob Manager</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Manage all files stored in Walrus decentralized storage
      </p>

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={loadBlobs}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>

          <button
            onClick={selectAll}
            style={{
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✓ Select All
          </button>

          <button
            onClick={deselectAll}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Deselect All
          </button>

          <button
            onClick={downloadSelected}
            disabled={selectedBlobs.size === 0 || loading}
            style={{
              padding: '10px 16px',
              backgroundColor: selectedBlobs.size === 0 ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedBlobs.size === 0 || loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ⬇ Download ({selectedBlobs.size})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleFullBackup}
            disabled={loading || blobs.length === 0}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || blobs.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            📦 Full Backup
          </button>

          <button
            onClick={handleExportData}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            📄 Export JSON
          </button>

          <button
            onClick={handleSyncAudit}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#ec4899',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            🔍 Sync Audit
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
            {blobs.length}
          </div>
          <div style={{ fontSize: '13px', color: '#3b82f6' }}>Total Blobs</div>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
            {blobs.filter(b => b.contentType?.startsWith('image/')).length}
          </div>
          <div style={{ fontSize: '13px', color: '#10b981' }}>Images</div>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fde68a'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
            {selectedBlobs.size}
          </div>
          <div style={{ fontSize: '13px', color: '#f59e0b' }}>Selected</div>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: '#fce7f3',
          borderRadius: '8px',
          border: '1px solid #fbcfe8'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9f1239' }}>
            {(blobs.reduce((sum, b) => sum + (parseInt(b.contentLength) || 0), 0) / 1024 / 1024).toFixed(1)} MB
          </div>
          <div style={{ fontSize: '13px', color: '#ec4899' }}>Total Size</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px'
      }}>
        {['all', 'images', 'documents'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === f ? '#3b82f6' : 'transparent',
              color: filter === f ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: filter === f ? 'bold' : 'normal',
              textTransform: 'capitalize'
            }}
          >
            {f} ({f === 'all' ? blobs.length : 
               f === 'images' ? blobs.filter(b => b.contentType?.startsWith('image/')).length :
               blobs.filter(b => !b.contentType?.startsWith('image/')).length})
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {view === 'grid' ? '☰ List' : '⊞ Grid'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          ⏳ Loading blobs...
        </div>
      )}

      {/* Empty State */}
      {!loading && blobs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
          <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#374151' }}>
            No Blobs Found
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Upload some properties with images to see them here
          </p>
        </div>
      )}

      {/* Grid View */}
      {!loading && view === 'grid' && filteredBlobs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {filteredBlobs.map(blob => (
            <div
              key={blob.blobId}
              onClick={() => toggleSelectBlob(blob.blobId)}
              style={{
                border: selectedBlobs.has(blob.blobId) ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: 'white',
                boxShadow: selectedBlobs.has(blob.blobId) ? '0 4px 12px rgba(59,130,246,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {/* Image Preview */}
              {blob.contentType?.startsWith('image/') ? (
                <img
                  src={getWalrusUrl(blob.blobId)}
                  alt={blob.blobId}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    backgroundColor: '#f3f4f6'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '180px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px'
                }}>
                  📄
                </div>
              )}

              {/* Info */}
              <div style={{ padding: '12px' }}>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '6px'
                }}>
                  {blob.blobId.slice(0, 16)}...
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {blob.contentType || 'Unknown'}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  {blob.contentLength ? `${(parseInt(blob.contentLength) / 1024).toFixed(1)} KB` : 'Size unknown'}
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedBlobs.has(blob.blobId) && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && view === 'list' && filteredBlobs.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Select</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Preview</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Blob ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlobs.map(blob => (
                <tr key={blob.blobId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedBlobs.has(blob.blobId)}
                      onChange={() => toggleSelectBlob(blob.blobId)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    {blob.contentType?.startsWith('image/') ? (
                      <img
                        src={getWalrusUrl(blob.blobId)}
                        alt="Preview"
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        📄
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>
                    {blob.blobId.slice(0, 20)}...
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                    {blob.contentType || 'Unknown'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                    {blob.contentLength ? `${(parseInt(blob.contentLength) / 1024).toFixed(1)} KB` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadBlobFromWalrus(blob.blobId);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sync Audit Results */}
      {syncAudit && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Sync Audit Results</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <strong>Database:</strong> {syncAudit.database.total} blobs
            </div>
            <div>
              <strong>Blockchain:</strong> {syncAudit.blockchain.total} blobs
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#10b981' }}>✓ In Sync:</strong> {syncAudit.sync.inBoth} blobs
          </div>

          {syncAudit.sync.onlyInDatabase.length > 0 && (
            <div style={{ marginBottom: '10px', color: '#f59e0b' }}>
              <strong>⚠ Only in Database:</strong> {syncAudit.sync.onlyInDatabase.length} blobs
              <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '5px' }}>
                {syncAudit.sync.onlyInDatabase.slice(0, 3).join(', ')}
                {syncAudit.sync.onlyInDatabase.length > 3 && '...'}
              </div>
            </div>
          )}

          {syncAudit.sync.onlyInBlockchain.length > 0 && (
            <div style={{ color: '#ef4444' }}>
              <strong>✕ Only in Blockchain:</strong> {syncAudit.sync.onlyInBlockchain.length} blobs
              <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '5px' }}>
                {syncAudit.sync.onlyInBlockchain.slice(0, 3).join(', ')}
                {syncAudit.sync.onlyInBlockchain.length > 3 && '...'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}