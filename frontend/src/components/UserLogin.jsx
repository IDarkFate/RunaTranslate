import React, { useState } from 'react';
import { User, Key, UserPlus, LogIn, AlertCircle, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function UserLogin({ onLoginSuccess, showToast }) {
  // Modos soportados: 'login' | 'register' | 'recover'
  const [mode, setMode] = useState('login');
  
  // Estados para formularios
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Limpiar campos al cambiar de modo
  const changeMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRecoveryPin('');
    setNewPassword('');
  };

  // --- CONTROLADOR DE SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        // --- INICIAR SESIÓN ---
        if (!username.trim()) {
          throw new Error('Por favor, ingresa tu usuario.');
        }
        if (password.length < 4) {
          throw new Error('La contraseña debe tener al menos 4 caracteres.');
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || 'Usuario o contraseña incorrectos.');
        }

        // Guardar credenciales en sessionStorage
        sessionStorage.setItem('tokenUser', data.token);
        sessionStorage.setItem('userName', data.username);
        if (data.is_admin) {
          sessionStorage.setItem('tokenAdmin', data.token);
        }
        showToast(`¡Bienvenido, ${data.username}!`, 'success');
        onLoginSuccess();

      } else if (mode === 'register') {
        // --- REGISTRAR USUARIO ---
        if (username.trim().length < 3) {
          throw new Error('El usuario debe tener al menos 3 caracteres.');
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Por favor, ingresa un correo electrónico válido.');
        }
        if (password.length < 4) {
          throw new Error('La contraseña debe tener al menos 4 caracteres.');
        }
        if (recoveryPin.trim().length < 4 || recoveryPin.trim().length > 6) {
          throw new Error('El PIN de seguridad debe tener entre 4 y 6 dígitos.');
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: username.trim(), 
            email: email.trim(),
            password, 
            recovery_pin: recoveryPin.trim() 
          })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Error al crear la cuenta.');
        }

        showToast('¡Cuenta creada con éxito! Ya puedes iniciar sesión.', 'success');
        changeMode('login');

      } else if (mode === 'recover') {
        // --- RESTABLECER CONTRASEÑA ---
        if (!username.trim()) {
          throw new Error('Por favor, ingresa tu usuario.');
        }
        if (recoveryPin.trim().length < 4 || recoveryPin.trim().length > 6) {
          throw new Error('Por favor, ingresa un PIN válido de 4 a 6 dígitos.');
        }
        if (newPassword.length < 4) {
          throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
        }

        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: username.trim(), 
            recovery_pin: recoveryPin.trim(), 
            new_password: newPassword 
          })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'El PIN o usuario ingresado es incorrecto.');
        }

        showToast('Contraseña actualizada con éxito. Inicia sesión con tu nueva contraseña.', 'success');
        changeMode('login');
      }

    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error en el servidor.');
      showToast(error.message || 'Error en la operación.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar ícono de cabecera dinámico
  const renderHeaderIcon = () => {
    let icon = <LogIn size={28} />;
    let bg = 'rgba(99, 102, 241, 0.1)';
    let color = 'var(--color-secondary)';

    if (mode === 'register') {
      icon = <UserPlus size={28} />;
      bg = 'rgba(16, 185, 129, 0.1)';
      color = 'var(--color-accent)';
    } else if (mode === 'recover') {
      icon = <ShieldCheck size={28} />;
      bg = 'rgba(245, 158, 11, 0.1)';
      color = 'var(--color-primary)';
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: 'var(--radius-full)',
          background: bg,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5 fadeIn">
      <Card 
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem 1.5rem',
          textAlign: 'center'
        }}
      >
        {renderHeaderIcon()}

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {mode === 'login' && 'Iniciar Sesión'}
          {mode === 'register' && 'Crear Cuenta'}
          {mode === 'recover' && 'Recuperar Contraseña'}
        </h2>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          {mode === 'login' && 'Ingresa tus credenciales para acceder al Historial y Centro de Preservación.'}
          {mode === 'register' && 'Regístrate ingresando tus datos obligatorios. Define tu PIN de seguridad.'}
          {mode === 'recover' && 'Ingresa tu usuario, tu PIN registrado y tu nueva contraseña.'}
        </p>

        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3 text-start">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          
          {/* MODO LOGIN */}
          {mode === 'login' && (
            <>
              <div className="form-group">
                <label htmlFor="loginUser" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Usuario
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="loginUser"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="loginPass" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                    Contraseña
                  </label>
                  <button 
                    type="button" 
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                    onClick={() => changeMode('recover')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="loginPass"
                    type="password"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}

          {/* MODO REGISTRO */}
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="regUser" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Nombre de Usuario (Obligatorio)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="regUser"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Ej. kenny123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="regEmail" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Correo Electrónico (Obligatorio)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="regEmail"
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="regPass" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Contraseña (Obligatorio)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="regPass"
                    type="password"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="regPin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  PIN de Recuperación (4 a 6 dígitos numéricos)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="regPin"
                    type="text"
                    pattern="\d*"
                    maxLength={6}
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%', letterSpacing: '4px' }}
                    placeholder="Ej. 1234"
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    disabled={isLoading}
                    required
                  />
                  <ShieldCheck size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}

          {/* MODO RECUPERAR */}
          {mode === 'recover' && (
            <>
              <div className="form-group">
                <label htmlFor="recUser" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Nombre de Usuario
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="recUser"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recPin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  PIN de Recuperación
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="recPin"
                    type="text"
                    pattern="\d*"
                    maxLength={6}
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%', letterSpacing: '4px' }}
                    placeholder="Ej. 1234"
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    disabled={isLoading}
                    required
                  />
                  <ShieldCheck size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recPass" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Nueva Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="recPass"
                    type="password"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="Mínimo 4 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            variant={
              mode === 'login' ? 'primary' : 
              mode === 'register' ? 'success' : 'warning'
            }
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontWeight: 600 }}
            disabled={isLoading}
          >
            {isLoading && 'Procesando...'}
            {!isLoading && mode === 'login' && 'Entrar'}
            {!isLoading && mode === 'register' && 'Crear Cuenta'}
            {!isLoading && mode === 'recover' && 'Restablecer Contraseña'}
          </Button>
        </form>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {mode === 'login' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              ¿No tienes una cuenta?{' '}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => changeMode('register')}
              >
                Regístrate aquí
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              ¿Ya tienes una cuenta?{' '}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => changeMode('login')}
              >
                Inicia sesión
              </button>
            </p>
          )}

          {mode === 'recover' && (
            <button 
              type="button" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.35rem', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                fontSize: '0.8rem', 
                cursor: 'pointer',
                margin: '0 auto'
              }}
              onClick={() => changeMode('login')}
            >
              <ArrowLeft size={14} /> Volver a Iniciar Sesión
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
