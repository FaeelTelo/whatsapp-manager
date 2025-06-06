import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StrictMode } from "react";
import { enableMapSet } from "immer";

// Enable Immer maps and sets
enableMapSet();

// Error boundary para capturar erros globais
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
    // Aqui você pode enviar o erro para um serviço de monitoramento
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-screen place-items-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Algo deu errado</h1>
            <p className="mt-2">Por favor, recarregue a página ou tente novamente mais tarde.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-primary text-white px-4 py-2 rounded"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Registrar service worker em produção
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
      },
      err => {
        console.log('ServiceWorker registration failed:', err);
      }
    );
  });
}
