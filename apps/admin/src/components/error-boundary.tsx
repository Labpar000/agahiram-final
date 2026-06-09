'use client';

import { Component, type ReactNode } from 'react';
import { Button, ErrorState } from '@agahiram/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center py-16">
            <ErrorState
              title="خطایی رخ داد"
              description={this.state.error?.message ?? 'مشکلی در بارگذاری پیش آمد'}
              onRetry={() => this.setState({ hasError: false, error: undefined })}
            />
          </div>
        )
      );
    }
    return this.props.children;
  }
}
