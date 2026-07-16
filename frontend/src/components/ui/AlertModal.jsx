import React from 'react';
import Card from './Card';
import Button from './Button';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export default function AlertModal({ 
  isOpen, 
  title = 'Confirmación', 
  message, 
  type = 'confirm', // 'alert' o 'confirm'
  onConfirm, 
  onClose 
}) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <Card style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', textAlign: 'center' }} className="animate-scaleUp mx-3">
        <div className="d-flex justify-content-center mb-3">
          <div className="rounded-circle p-3 d-flex align-items-center justify-content-center" 
               style={{ 
                 background: type === 'confirm' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                 color: type === 'confirm' ? 'var(--color-primary)' : 'var(--color-danger)',
                 width: '60px',
                 height: '60px'
               }}>
            {type === 'confirm' ? <HelpCircle size={28} /> : <AlertTriangle size={28} />}
          </div>
        </div>
        
        <h3 className="h5 fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-secondary small mb-4" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        
        <div className="d-flex justify-content-center gap-2">
          {type === 'confirm' && (
            <Button variant="secondary" onClick={onClose} style={{ minWidth: '100px' }}>
              Cancelar
            </Button>
          )}
          <Button variant={type === 'confirm' ? 'primary' : 'danger'} onClick={() => { onConfirm(); }} style={{ minWidth: '100px' }}>
            Aceptar
          </Button>
        </div>
      </Card>
    </div>
  );
}
