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
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red', background: '#ffebee', minHeight: '100vh', width: '100%' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>React Crash: Component Error</h1>
                    <p style={{ marginTop: '10px' }}>{this.state.error && this.state.error.toString()}</p>
                    <pre style={{ marginTop: '20px', padding: '10px', background: '#fff', border: '1px solid #ddd', overflowX: 'auto' }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
