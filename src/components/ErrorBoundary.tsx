import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let errorDetails = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = parsed.error;
            errorDetails = parsed;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[32px] border border-slate-200 p-10 shadow-xl text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-8">
              <AlertCircle size={40} />
            </div>
            
            <h2 className="text-2xl font-display font-black text-slate-900 mb-4 tracking-tight">
              Something went wrong
            </h2>
            
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {errorMessage === "Missing or insufficient permissions." 
                ? "You don't have permission to perform this action or access this data. Please check if you are logged in correctly."
                : errorMessage}
            </p>

            {errorDetails && (
              <div className="mb-8 p-4 bg-slate-50 rounded-2xl text-left overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Error Context</p>
                <p className="text-xs font-mono text-slate-600 break-all">
                  Operation: {errorDetails.operationType}<br />
                  Path: {errorDetails.path}
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full py-4 bg-indigo-600 text-white font-display font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                RETRY
              </button>
              <button 
                onClick={this.handleGoHome}
                className="w-full py-4 bg-slate-100 text-slate-600 font-display font-black rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Home size={20} />
                GO TO HOME
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
