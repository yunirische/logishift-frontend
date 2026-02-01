import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Analytics ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Произошла ошибка
            </h3>
            <p className="text-slate-600 text-center mb-6 max-w-md">
              При загрузке аналитики произошла непредвиденная ошибка.
              Попробуйте обновить страницу.
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
