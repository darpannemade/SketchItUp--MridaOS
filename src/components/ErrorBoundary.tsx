import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Section label shown in the fallback UI (e.g. "POS Terminal", "Inventory") */
  section?: string;
  /** Custom fallback node — overrides default UI if provided */
  fallback?: React.ReactNode;
}

/**
 * UX-02 FIX: ErrorBoundary wraps each major app section.
 * A JS error anywhere inside (null sale record, malformed Supabase JSONB,
 * failed Web Serial read) will be caught here instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary section="POS Terminal">
 *     <NewSaleModal ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console in dev; replace with Sentry/LogRocket in production
    console.error(`[ErrorBoundary:${this.props.section || 'App'}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const section = this.props.section || 'this section';

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">
            Something went wrong in {section}
          </h2>
          <p className="text-sm text-red-600 dark:text-red-400 max-w-sm mb-6">
            An unexpected error occurred. Your data is safe — this section failed to render.
            You can reload this section or refresh the page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs text-left bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 p-3 rounded-xl mb-4 max-w-full overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
            aria-label={`Reload ${section}`}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reload {section}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Convenience wrapper for functional usage
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  section: string
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary section={section}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}
