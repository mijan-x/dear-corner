import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { failed: boolean };

/** Last-resort boundary around the whole app. Route errors use RouteError. */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Dear Corner] Unhandled error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-linen px-4 text-center text-ink">
        <div className="max-w-md">
          <p className="type-eyebrow text-terracotta-deep">Dear Corner</p>
          <h1 className="mt-3 type-h1">Something went wrong on our side.</h1>
          <p className="mt-3 type-body text-soft-ink">
            Reload the page to try again. Your cart is saved on this device.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-12 items-center rounded-control bg-rosewood px-6 type-button text-white hover:bg-rosewood-hover active:bg-rosewood-pressed"
          >
            Reload page
          </button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
