import React, { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-neutral-500 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-neutral-100 rounded p-3 mb-6 overflow-auto max-h-32 text-neutral-600">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
