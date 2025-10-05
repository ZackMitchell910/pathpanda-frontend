// src/components/ErrorBoundary.tsx
import React, { Component, type ErrorInfo } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Surfaces the crash in the console so you’re not stuck on a blank screen
    console.error("UI crash:", error, info);
  }

  handleReset = () => {
    // Soft reset the boundary (keeps app state if the offending component unmounts)
    this.setState({ hasError: false, error: undefined });
    // If you prefer a full page reload instead, use:
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 p-4 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] text-sm text-white">
          <div className="font-semibold mb-2">Something went wrong.</div>
          <pre className="whitespace-pre-wrap text-gray-300">
            {String(this.state.error ?? "Unknown error")}
          </pre>
          <button
            onClick={this.handleReset}
            className="mt-3 px-3.5 py-2 rounded-xl bg-[#27272A] border border-[#3F3F46] hover:bg-[#303036]"
            aria-label="Try to recover"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
