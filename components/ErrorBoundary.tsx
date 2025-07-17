import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h1 className="text-2xl font-semibold text-red-600">
            Произошла ошибка
          </h1>
          <p className="mt-2 text-gray-500">
            Пожалуйста, попробуйте снова или свяжитесь с поддержкой.
          </p>
          <Button
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Попробовать снова
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
