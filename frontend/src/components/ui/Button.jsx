import React from 'react';

export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', // 'primary', 'secondary', 'danger', 'icon'
  disabled = false, 
  className = '', 
  ...props 
}) {
  const getButtonClass = () => {
    if (variant === 'icon') return `btn-icon ${className}`;
    return `btn btn-${variant} ${className}`;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={getButtonClass()}
      {...props}
    >
      {children}
    </button>
  );
}
