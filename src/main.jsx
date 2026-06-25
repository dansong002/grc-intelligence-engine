import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#E8EEF2", background: "#0E1419", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Something went wrong</h1>
          <pre style={{ fontSize: 13, color: "#E5544B", whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: "8px 16px", background: "#F5A623", color: "#1a1206", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
