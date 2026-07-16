import React from 'react';

export default function Badge({ 
  children, 
  variant = 'info', // 'info', 'success', 'danger', 'warning'
  className = '', 
  ...props 
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}
