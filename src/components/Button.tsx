import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * The single shared Button. Equivalent actions reuse the same variant so
 * shape, color, and label wording stay identical across views (Req 10.4).
 * All buttons meet the 44x44px minimum touch target (Req 12.6) via tokens.
 */
export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  const cls = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
