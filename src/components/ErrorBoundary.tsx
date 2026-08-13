import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * Captura erros de renderização em toda a árvore de componentes filhos.
 * Sem isso, qualquer exceção de JS em qualquer componente resulta em tela branca.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Erro inesperado na interface.';
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Erro capturado:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, message: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="modal-viewport flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              O Jardim encontrou um erro
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Algo inesperado aconteceu. Seus dados não foram perdidos e continuam
              salvos no servidor.
            </p>
            {this.state.message && (
              <p className="mt-3 text-xs text-red-400/80 font-mono bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2">
                {this.state.message}
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-300 text-sm font-bold transition-colors"
            >
              Recarregar página
            </button>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm transition-colors"
            >
              Tentar continuar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
