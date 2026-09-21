import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Muda quando a pessoa troca de aba: o erro de uma aba não deve travar as outras. */
  resetKey: string;
  children: ReactNode;
}

interface State {
  erro: Error | null;
  resetKey: string;
}

/** Protege o conteúdo de uma aba da ficha. Se ela quebrar, a pessoa vê o
 * motivo e pode trocar de aba, em vez de ficar com a página em branco. */
export class AbaErrorBoundary extends Component<Props, State> {
  state: State = { erro: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { erro: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    console.error('[Ficha] Erro ao desenhar a aba:', erro, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        <p className="mb-1 font-bold text-red-100">Esta aba não conseguiu abrir.</p>
        <p className="mb-3 text-red-200/80">Você pode trocar de aba normalmente. Se o problema continuar, envie esta mensagem ao suporte:</p>
        <code className="block break-words rounded-lg bg-black/40 p-3 text-xs text-red-100">{this.state.erro.message}</code>
        <button
          type="button"
          onClick={() => this.setState({ erro: null })}
          className="mt-4 rounded-lg border border-red-400/40 px-4 py-2 text-xs font-bold text-red-100 hover:bg-red-500/10"
        >
          Tentar de novo
        </button>
      </div>
    );
  }
}
