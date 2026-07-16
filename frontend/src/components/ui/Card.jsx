import React from 'react';

export default function Card({ 
  children, 
  title, 
  headerActions,
  className = '', 
  ...props 
}) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {(title || headerActions) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem'
        }}>
          {title && <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600 }}>{title}</h3>}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
