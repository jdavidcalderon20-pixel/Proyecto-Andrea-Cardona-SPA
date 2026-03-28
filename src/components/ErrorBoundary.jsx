import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary atrapó un error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '12px', margin: '20px', wordBreak: 'break-word' }}>
          <h4 style={{ color: '#b91c1c', marginTop: 0 }}>🚨 Error de Renderizado en Componente</h4>
          <p style={{ fontWeight: 'bold' }}>El módulo experimentó un fallo interno y no pudo dibujarse en pantalla.</p>
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #fca5a5', overflowX: 'auto' }}>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-wrap' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
             onClick={() => window.location.reload()} 
             style={{ marginTop: '15px', padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
             Recargar App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
