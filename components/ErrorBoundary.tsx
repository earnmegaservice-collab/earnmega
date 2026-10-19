'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';

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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] text-zinc-100 p-6 text-center font-sans relative bg-[#050505]">
          <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)] opacity-100"></div>
          <div className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center">
             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-500/30">
                <span className="text-red-400 font-bold text-2xl">!</span>
             </div>
             <h2 className="text-xl font-bold mb-4">Runtime Error</h2>
             <p className="text-sm text-zinc-400 mb-6 text-center break-words w-full">
               {this.state.error?.message || "An unexpected error occurred in the module."}
             </p>
             <button
               onClick={() => {
                 this.setState({ hasError: false, error: null });
                 window.location.assign('/');
               }}
               className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg border border-white/10"
             >
               Reset to Hub
             </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
