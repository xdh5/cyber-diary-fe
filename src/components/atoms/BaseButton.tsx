import React from 'react';

type BaseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const BaseButton: React.FC<BaseButtonProps> = ({
  className = '',
  icon,
  variant = 'primary',
  children,
  ...rest
}) => {
  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
    secondary: 'bg-[var(--color-secondary)] text-black border border-[var(--border-color)] hover:bg-slate-50',
    danger: 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]',
    ghost: 'bg-[var(--color-ghost)] text-[var(--color-primary)] hover:bg-slate-100',
  };

  return (
    <button
      className={`w-full py-3.5 rounded-xl font-medium transition flex items-center justify-center gap-2 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
};

export default BaseButton;