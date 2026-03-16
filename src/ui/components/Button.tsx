import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'danger' | 'accent' | 'lavender' | 'purple';

interface ButtonProps extends Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  label: string;
  active?: boolean;
  variant?: ButtonVariant;
  onClick: () => void;
  fullWidth?: boolean;
}

export default function Button({
  label,
  active = false,
  variant = 'default',
  onClick,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const base =
    'rounded-lg px-4 py-2 text-sm font-medium border transition-colors cursor-pointer select-none';

  const width = fullWidth ? 'w-full' : '';

  const disabledStyle = disabled
    ? 'opacity-40 cursor-not-allowed'
    : '';

  let variantStyle: string;

  if (active) {
    switch (variant) {
      case 'accent':
        variantStyle = 'bg-blue-500 text-white border-blue-500';
        break;
      case 'lavender':
        variantStyle = 'bg-violet-300 text-white border-violet-300';
        break;
      case 'purple':
        variantStyle = 'bg-fuchsia-600 text-white border-fuchsia-600';
        break;
      default:
        variantStyle = 'bg-blue-500 text-white border-blue-500';
        break;
    }
  } else {
    switch (variant) {
      case 'danger':
        variantStyle = 'bg-white border-red-400 text-red-500 hover:bg-red-50';
        break;
      default:
        variantStyle = 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50';
        break;
    }
  }

  return (
    <button
      className={`${base} ${variantStyle} ${width} ${disabledStyle}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
