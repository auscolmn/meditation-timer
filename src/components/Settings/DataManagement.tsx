import { useState, useRef, ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import {
  exportDataToJson,
  downloadExport,
  generateExportFilename,
  parseImportData,
  readFileAsText
} from '../../utils/dataExport';
import styles from './DataManagement.module.css';

function DataManagement() {
  const { exportAllData, importAllData, sessions } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    sessions: number;
    quotes: number;
    presets: number;
    customSounds: number;
  } | null>(null);
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Handle export
  const handleExport = () => {
    setIsExporting(true);
    try {
      const data = exportAllData();
      const jsonString = exportDataToJson(data);
      const filename = generateExportFilename();
      downloadExport(jsonString, filename);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection for import
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setImportError(null);
    setImportPreview(null);
    setPendingImportData(null);

    try {
      const content = await readFileAsText(file);
      const result = parseImportData(content);

      if (!result.valid) {
        setImportError(result.error || 'Invalid backup file');
        setShowImportModal(true);
        return;
      }

      // Set preview data
      if (result.data) {
        setImportPreview({
          sessions: result.data.data.sessions?.length || 0,
          quotes: result.data.data.quotes?.length || 0,
          presets: result.data.data.presets?.length || 0,
          customSounds: result.data.data.customSounds?.length || 0
        });
        setPendingImportData(content);
      }

      setShowImportModal(true);
    } catch (err) {
      console.error('Import failed:', err);
      setImportError('Failed to read file');
      setShowImportModal(true);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm import
  const confirmImport = () => {
    if (!pendingImportData) return;

    try {
      const result = parseImportData(pendingImportData);
      if (result.valid && result.data) {
        importAllData(result.data);
        setShowImportModal(false);
        setPendingImportData(null);
        setImportPreview(null);
        alert('Data imported successfully!');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportError('Failed to import data');
    }
  };

  // Close modal
  const closeModal = () => {
    setShowImportModal(false);
    setImportError(null);
    setImportPreview(null);
    setPendingImportData(null);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Data Management</h2>
      <p className={styles.description}>
        Export your meditation data for backup or import from a previous backup.
      </p>

      <div className={styles.actions}>
        {/* Export Button */}
        <button
          className={`btn btn--secondary ${styles.actionButton}`}
          onClick={handleExport}
          disabled={isExporting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Backup
        </button>

        {/* Import Button */}
        <label className={`btn btn--secondary ${styles.actionButton}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import Backup
        </label>
      </div>

      <p className={styles.stats}>
        Current data: {sessions.length} session{sessions.length !== 1 ? 's' : ''}
      </p>

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <h2 id="import-modal-title" className="modal-title">
              {importError ? 'Import Error' : 'Import Backup'}
            </h2>

            {importError ? (
              <p className={styles.error}>{importError}</p>
            ) : importPreview ? (
              <div className={styles.preview}>
                <p className={styles.previewWarning}>
                  This will replace all your current data with:
                </p>
                <ul className={styles.previewList}>
                  <li>{importPreview.sessions} meditation session{importPreview.sessions !== 1 ? 's' : ''}</li>
                  <li>{importPreview.quotes} quote{importPreview.quotes !== 1 ? 's' : ''}</li>
                  <li>{importPreview.presets} preset{importPreview.presets !== 1 ? 's' : ''}</li>
                  <li>{importPreview.customSounds} custom sound{importPreview.customSounds !== 1 ? 's' : ''}</li>
                </ul>
                <p className={styles.previewNote}>
                  This action cannot be undone. Consider exporting your current data first.
                </p>
              </div>
            ) : null}

            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              {!importError && importPreview && (
                <button
                  className="btn btn--primary"
                  onClick={confirmImport}
                >
                  Import
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;
