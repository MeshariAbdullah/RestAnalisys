import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-8">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-6xl text-amber-500">!</div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Something went wrong
            </h1>
            <p className="text-neutral-600">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Return to homepage
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
