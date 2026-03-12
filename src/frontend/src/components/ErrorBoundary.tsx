import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
          <div className="text-4xl">🐼</div>
          <h2 className="text-lg font-semibold text-zinc-800">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-500 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
