import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QUOTE_CATEGORIES } from '../../utils/constants';
import styles from './QuoteEditor.module.css';

function QuoteEditor({ onClose }) {
  const { quotes, addQuote, updateQuote, deleteQuote, resetQuotes } = useApp();

  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formText, setFormText] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategory, setFormCategory] = useState('Other');

  // Reset form
  const resetForm = () => {
    setFormText('');
    setFormAuthor('');
    setFormCategory('Other');
    setEditingId(null);
    setShowAddForm(false);
  };

  // Handle add quote
  const handleAdd = () => {
    if (!formText.trim()) return;
    addQuote({
      text: formText.trim(),
      author: formAuthor.trim() || 'Unknown',
      category: formCategory
    });
    resetForm();
  };

  // Handle edit quote
  const handleEdit = (quote) => {
    setEditingId(quote.id);
    setFormText(quote.text);
    setFormAuthor(quote.author);
    setFormCategory(quote.category);
    setShowAddForm(false);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!formText.trim()) return;
    updateQuote(editingId, {
      text: formText.trim(),
      author: formAuthor.trim() || 'Unknown',
      category: formCategory
    });
    resetForm();
  };

  // Handle delete quote
  const handleDelete = (quoteId) => {
    if (confirm('Delete this quote?')) {
      deleteQuote(quoteId);
      if (editingId === quoteId) {
        resetForm();
      }
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    if (confirm('Reset all quotes to defaults? This will delete any custom quotes.')) {
      resetQuotes();
    }
  };

  // Group quotes by category
  const quotesByCategory = quotes.reduce((acc, quote) => {
    const cat = quote.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(quote);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${styles.editorModal}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Quotes</h2>
          <button className="btn btn--icon modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className={styles.form}>
            <div className="form-group">
              <label className="form-label">Quote Text</label>
              <textarea
                className={`input ${styles.textarea}`}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter the quote..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Author</label>
              <input
                type="text"
                className="input"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                placeholder="Author name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {QUOTE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.formActions}>
              <button className="btn btn--secondary" onClick={resetForm}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={editingId ? handleSaveEdit : handleAdd}
              >
                {editingId ? 'Save' : 'Add Quote'}
              </button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showAddForm && !editingId && (
          <button
            className="btn btn--primary btn--full mb-lg"
            onClick={() => setShowAddForm(true)}
          >
            + Add New Quote
          </button>
        )}

        {/* Quote list */}
        <div className={styles.quoteList}>
          {QUOTE_CATEGORIES.map(category => {
            const categoryQuotes = quotesByCategory[category] || [];
            if (categoryQuotes.length === 0) return null;

            return (
              <div key={category} className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>{category}</h3>
                {categoryQuotes.map(quote => (
                  <div key={quote.id} className={styles.quoteItem}>
                    <div className={styles.quoteContent}>
                      <p className={styles.quoteText}>"{quote.text}"</p>
                      <p className={styles.quoteAuthor}>— {quote.author}</p>
                    </div>
                    <div className={styles.quoteActions}>
                      <button
                        className="btn btn--icon btn--secondary"
                        onClick={() => handleEdit(quote)}
                        aria-label="Edit quote"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="btn btn--icon btn--secondary"
                        onClick={() => handleDelete(quote.id)}
                        aria-label="Delete quote"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          className="btn btn--secondary btn--full mt-lg"
          onClick={handleReset}
        >
          Reset to Defaults
        </button>

        <p className={styles.quoteCount}>
          {quotes.length} quotes total
        </p>
      </div>
    </div>
  );
}

export default QuoteEditor;
