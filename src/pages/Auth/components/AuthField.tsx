import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

// Rótulo visível em versalete + sublinhado dourado no lugar do ícone-dentro-da-caixa
// arredondada que qualquer formulário de login usa por padrão.
export const AuthField: React.FC<AuthFieldProps> = ({ id, label, icon: Icon, accent, ...inputProps }) => (
  <div className="group">
    <label
      htmlFor={id}
      className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gray-500 transition-colors group-focus-within:text-primary/80"
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </label>
    <input
      id={id}
      {...inputProps}
      className={`w-full border-0 border-b bg-transparent py-2.5 text-white placeholder:text-gray-600 outline-none transition-colors ${
        accent ? 'border-primary/30 focus:border-primary' : 'border-white/15 focus:border-primary/70'
      }`}
    />
  </div>
);
