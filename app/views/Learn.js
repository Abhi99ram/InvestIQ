import { useState } from 'react';

export default function Learn() {
  const [term, setTerm] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const presetTerms = ['ETF', 'SIP', 'Diversification', 'PE Ratio', 'Bonds', 'Market Cap'];

  const fetchExplanation = async (query) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setTerm(query);
    setExplanation('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Explain the financial concept: "${query}". Make the explanation simple, clear, and tailored for a beginner investor. Include an example if possible. Do not use markdown headers, just return a simple paragraph or two.`,
          messages: [],
          marketContext: {}
        })
      });

      if (!response.ok) throw new Error('Failed to get explanation');
      
      const data = await response.json();
      setExplanation(data.response);
    } catch (err) {
      setError('Could not fetch explanation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="section-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📚 Learn Financial Concepts</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Master investing terminology with AI-powered explanations tailored to your level
        </p>
      </div>

      <div className="card" style={{ padding: '30px', marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px' }}>Understand Financial Terms</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Ask anything about investing... (e.g. Mutual Funds)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchExplanation(term)}
            style={{ flex: 1 }}
          />
          <button 
            className="btn-primary" 
            onClick={() => fetchExplanation(term)}
            disabled={loading || !term.trim()}
          >
            {loading ? 'Thinking...' : 'Explain'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', paddingTop: '5px' }}>Popular:</span>
          {presetTerms.map(preset => (
            <button 
              key={preset}
              className="btn-secondary btn-sm"
              onClick={() => fetchExplanation(preset)}
              style={{ padding: '4px 12px', fontSize: '0.85rem' }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Result Container */}
      {(explanation || loading || error) && (
        <div className="card" style={{ background: 'var(--bg-card)', borderLeft: '4px solid var(--accent-cyan)' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🤖</span> AI Explanation
          </h3>
          
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <span className="pulse">●</span> Analyzing concept...
            </div>
          ) : error ? (
            <p style={{ color: 'var(--accent-red)' }}>{error}</p>
          ) : (
            <div style={{ lineHeight: '1.8', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
