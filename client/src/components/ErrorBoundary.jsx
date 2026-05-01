import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container" style={{ textAlign: 'center', paddingTop: '10vh' }}>
          <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Oops!</h1>
            <h2 style={{ marginBottom: '1.5rem' }}>Something went wrong.</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              We've encountered an unexpected error. Please try refreshing the page.
            </p>
            <button 
              className="btn btn-primary btn-full" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button 
              className="btn btn-secondary btn-full" 
              style={{ marginTop: '1rem' }}
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
