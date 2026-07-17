import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, Copy, Star, Check, Sparkles, AlertTriangle, X, Heart, Square 
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import AlertModal from './ui/AlertModal';

export default function Translator({ onTranslationSaved, showToast }) {
  const [sourceLang, setSourceLang] = useState('es');
  const [targetLang, setTargetLang] = useState('qu');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [engineMeta, setEngineMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const [translationId, setTranslationId] = useState(null);
  
  // Favorito
  const [isStarred, setIsStarred] = useState(false);

  // Calificación y Retroalimentación
  const [rating, setRating] = useState(0);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctedText, setCorrectedText] = useState('');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState('');

  // Estado para el modal de error de API de traducción
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: ''
  });

  // Cancelar audio activo si cambia el idioma o el texto
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeechText(null);
  }, [sourceLang, targetLang, sourceText, targetText]);

  // Reconocimiento de Voz (STT)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Efecto para autoajustar idiomas y no duplicar
  const handleSourceLangChange = (lang) => {
    setSourceLang(lang);
    if (lang === 'es') {
      setTargetLang('qu');
    } else {
      setTargetLang('es');
    }
  };

  const handleTargetLangChange = (lang) => {
    setTargetLang(lang);
    if (lang === 'es') {
      setSourceLang('qu');
    } else {
      setSourceLang('es');
    }
  };

  // Inicializar Reconocimiento de Voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = sourceLang === 'es' ? 'es-PE' : 'es-PE';
      
      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setSourceText((prev) => prev + (prev ? ' ' : '') + transcript);
        showToast('Texto de voz reconocido con éxito', 'success');
      };
      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsRecording(false);
        showToast('No se pudo reconocer la voz o se canceló.', 'info');
      };
      
      recognitionRef.current = rec;
    }
  }, [sourceLang]);

  // --- AUTOMATIZACIÓN DE TRADUCCIÓN CON DEBOUNCE (OPTIMIZACIÓN UX) ---
  useEffect(() => {
    if (!sourceText.trim()) {
      setTargetText('');
      setEngineMeta(null);
      setTranslationId(null);
      setRating(0);
      setFeedbackSubmitted(false);
      setIsStarred(false);
      return;
    }

    const timer = setTimeout(() => {
      ejecutarTraduccion();
    }, 1000); // Debounce de 1000ms (1.0 segundo) para esperar cómodamente a que el usuario termine de escribir

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  // Ejecutar STT
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      showToast('El reconocimiento de voz no es compatible con este navegador. Por favor usa Chrome.', 'error');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // TTS (Lectura en Voz Alta)
  const speakText = (text, lang) => {
    if (!window.speechSynthesis) {
      showToast('La síntesis de voz no es compatible con este navegador.', 'error');
      return;
    }

    if (activeSpeechText === text) {
      window.speechSynthesis.cancel();
      setActiveSpeechText(null);
      showToast('Pronunciación detenida.', 'info');
      return;
    }

    window.speechSynthesis.cancel();
    setActiveSpeechText(text);

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (lang === 'es') {
      utterance.lang = 'es-PE';
    } else {
      // Configuración de fallback fonético andino sobre motor español peruano
      utterance.lang = 'es-PE';
      utterance.rate = 0.82;
      utterance.pitch = 0.95;
    }

    utterance.onend = () => setActiveSpeechText(null);
    utterance.onerror = () => setActiveSpeechText(null);
    utterance.oncancel = () => setActiveSpeechText(null);
    
    window.speechSynthesis.speak(utterance);
    showToast('Reproduciendo pronunciación...', 'info');
  };

  // Copiar traducción al portapapeles
  const copyToClipboard = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText);
    setCopied(true);
    showToast('¡Copiado al portapapeles!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Función Principal de Traducción
  const ejecutarTraduccion = async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    setEngineMeta(null);
    setRating(0);
    setFeedbackSubmitted(false);
    setIsStarred(false);
    setDetectedLanguage('');

    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Límite de peticiones de traducción excedido (Máximo 30 por minuto).');
        }
        throw new Error('Error al conectar con el servidor de traducción.');
      }
      
      const data = await res.json();
      if (data.engine === "Error de API") {
        setErrorModal({
          isOpen: true,
          message: data.explanation
        });
        setTargetText('');
        setEngineMeta(null);
        return;
      }

      setTargetText(data.translated_text);
      setTranslationId(data.id);
      
      if (data.detected_lang) {
        setDetectedLanguage(data.detected_lang);
      }

      setEngineMeta({
        engine: data.engine,
        explanation: data.explanation
      });
      
      if (onTranslationSaved) {
        onTranslationSaved();
      }
    } catch (e) {
      console.error(e);
      setTargetText('');
      showToast(e.message || 'Error de traducción', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Alternar Favorito (Estrella) - OPTIMISTIC UI
  const handleToggleStar = async () => {
    const token = sessionStorage.getItem('tokenUser');
    if (!token) {
      showToast('Inicia sesión para guardar esta traducción en tus favoritos.', 'info');
      return;
    }

    const estadoPrevio = isStarred;
    const nuevoEstado = !isStarred;
    
    // UI Optimista: cambiar estado inmediatamente
    setIsStarred(nuevoEstado);
    showToast(nuevoEstado ? 'Añadido a favoritos' : 'Eliminado de favoritos', 'success');

    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      if (!translationId) {
        // La traducción no se ha guardado en el historial aún. Se crea en este paso.
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            source_text: sourceText,
            translated_text: targetText,
            source_lang: detectedLanguage || sourceLang,
            target_lang: targetLang,
            is_starred: nuevoEstado
          })
        });

        if (res.ok) {
          const data = await res.json();
          setTranslationId(data.id);
          if (onTranslationSaved) onTranslationSaved();
        } else {
          setIsStarred(estadoPrevio);
          showToast('Error al guardar el favorito en el historial.', 'error');
        }
      } else {
        // Ya existe en el historial, alternar el favorito
        const res = await fetch(`/api/history/${translationId}/star`, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify({ is_starred: nuevoEstado })
        });
        
        if (!res.ok) {
          setIsStarred(estadoPrevio);
          showToast('Error al actualizar el favorito.', 'error');
        } else {
          if (onTranslationSaved) onTranslationSaved();
        }
      }
    } catch (e) {
      setIsStarred(estadoPrevio);
      showToast('Error de red al actualizar favorito.', 'error');
    }
  };

  // Enviar feedback simple de estrellas
  const handleStarRating = async (stars) => {
    setRating(stars);
    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          rating: stars,
          source_text: sourceText,
          translated_text: targetText,
          source_lang: detectedLanguage || sourceLang,
          target_lang: targetLang
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setTranslationId(data.id);
        }
        showToast('¡Gracias por calificar la traducción!', 'success');
        if (onTranslationSaved) onTranslationSaved();

        if (stars <= 3) {
          setCorrectedText(targetText);
          setShowCorrectionModal(true);
        } else {
          setFeedbackSubmitted(true);
        }
      }
    } catch (e) {
      console.error('Error enviando feedback:', e);
      showToast('No se pudo enviar la calificación.', 'error');
    }
  };

  // Guardar corrección formal del usuario
  const handleSubmitCorrection = async () => {
    if (!correctedText.trim()) {
      showToast('Por favor escribe la corrección sugerida.', 'error');
      return;
    }

    try {
      const token = sessionStorage.getItem('tokenUser');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          rating: rating,
          source_text: sourceText,
          translated_text: targetText,
          source_lang: detectedLanguage || sourceLang,
          target_lang: targetLang,
          corrected_text: correctedText,
          comments: feedbackComments
        })
      });
      
      if (res.ok) {
        showToast('Sugerencia de corrección guardada en MongoDB Atlas.', 'success');
        setFeedbackSubmitted(true);
        setShowCorrectionModal(false);
        setFeedbackComments('');
      }
    } catch (e) {
      console.error('Error enviando correccion:', e);
      showToast('No se pudo guardar la sugerencia.', 'error');
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      
      <div className="row g-4 align-items-stretch">
        {/* Caja de Origen */}
        <div className="col-md-5">
          <div className={`translation-box card h-100 ${sourceText ? 'translation-box-active' : ''}`}>
            <div className="box-header d-flex justify-content-between align-items-center mb-2">
              <select 
                className="form-select w-auto lang-selector fw-semibold"
                value={sourceLang}
                onChange={(e) => {
                  handleSourceLangChange(e.target.value);
                  setDetectedLanguage('');
                }}
              >
                <option value="auto">Detectar idioma</option>
                <option value="es">Español</option>
                <option value="qu">Quechua</option>
                <option value="ay">Aymara</option>
              </select>

              {sourceLang === 'auto' && detectedLanguage && (
                <span className="badge badge-info ms-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Detectado: {detectedLanguage === 'es' ? 'Español' : detectedLanguage === 'qu' ? 'Quechua' : 'Aymara'}
                </span>
              )}
              
              {isRecording && (
                <div className="voice-wave ms-auto" title="Grabando audio...">
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                </div>
              )}
            </div>

            <div className="textarea-container flex-grow-1 d-flex flex-column">
              <textarea
                className="form-control translation-textarea flex-grow-1 fs-5"
                style={{ minHeight: '180px' }}
                placeholder={
                  sourceLang === 'es' 
                    ? 'Escribe el texto a traducir aquí...' 
                    : `Escribe en ${sourceLang === 'qu' ? 'Quechua' : 'Aymara'}...`
                }
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>

            <div className="box-footer d-flex justify-content-between align-items-center mt-2">
              <div className="action-buttons d-flex gap-2">
                <Button 
                  variant="icon"
                  className={isRecording ? 'active animate-pulse' : ''}
                  onClick={toggleRecording}
                  title={isRecording ? "Detener grabación" : "Reconocimiento de voz"}
                >
                  <Mic size={18} style={{ color: isRecording ? 'var(--color-danger)' : 'inherit' }} />
                </Button>
                {sourceText && (
                  <Button 
                    variant="icon"
                    onClick={() => speakText(sourceText, sourceLang)}
                    title="Escuchar pronunciación"
                  >
                    <Volume2 size={18} />
                  </Button>
                )}
              </div>
              
              {sourceText && (
                <span className="char-counter text-muted small">
                  {sourceText.length} caracteres
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botón de Intercambio (Swap) */}
        <div className="col-md-2 d-flex align-items-center justify-content-center my-3 my-md-0">
          <button 
            className="btn-swap btn-icon rounded-circle" 
            style={{ width: '48px', height: '48px' }}
            onClick={() => {
              const resolvedSrc = sourceLang === 'auto' ? (detectedLanguage || 'es') : sourceLang;
              if (resolvedSrc === targetLang) return;
              setSourceLang(targetLang);
              setTargetLang(resolvedSrc);
              setSourceText(targetText);
              setTargetText(sourceText);
              setEngineMeta(null);
              setRating(0);
              setFeedbackSubmitted(false);
              setDetectedLanguage('');
            }}
            title="Intercambiar idiomas"
          >
            <Sparkles size={18} />
          </button>
        </div>

        {/* Caja de Destino (Con Skeleton Loader) */}
        <div className="col-md-5">
          <div className={`translation-box card h-100 ${targetText ? 'translation-box-active' : ''}`}>
            <div className="box-header d-flex justify-content-between align-items-center mb-2">
              <select 
                className="form-select w-auto lang-selector fw-semibold"
                value={targetLang}
                onChange={(e) => handleTargetLangChange(e.target.value)}
              >
                <option value="qu">Quechua</option>
                <option value="ay">Aymara</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="textarea-container flex-grow-1 d-flex flex-column" style={{ minHeight: '180px' }}>
              {isTranslating ? (
                <div className="d-flex flex-column gap-2 w-100 h-100 p-3">
                  <div className="skeleton w-100" style={{ height: '24px' }}></div>
                  <div className="skeleton w-75" style={{ height: '24px' }}></div>
                  <div className="skeleton w-50" style={{ height: '24px' }}></div>
                </div>
              ) : (
                <textarea
                  className="form-control translation-textarea flex-grow-1 fs-5"
                  style={{ minHeight: '180px' }}
                  placeholder="La traducción aparecerá aquí automáticamente al escribir..."
                  value={targetText}
                  readOnly
                />
              )}
            </div>

            <div className="box-footer d-flex justify-content-between align-items-center mt-2">
              <div className="action-buttons d-flex gap-2">
                {targetText && !isTranslating && (
                  <>
                    <Button 
                      variant="icon"
                      onClick={copyToClipboard}
                      title="Copiar traducción"
                    >
                      {copied ? <Check size={18} style={{ color: 'var(--color-accent)' }} /> : <Copy size={18} />}
                    </Button>
                    <Button 
                      variant="icon"
                      onClick={() => speakText(targetText, targetLang)}
                      title={activeSpeechText === targetText ? "Detener reproducción" : "Escuchar pronunciación"}
                      style={{
                        color: activeSpeechText === targetText ? 'var(--color-primary)' : 'var(--text-secondary)',
                        background: activeSpeechText === targetText ? 'var(--info-glow-bg)' : 'transparent'
                      }}
                    >
                      {activeSpeechText === targetText ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                    </Button>
                    {translationId && (
                      <Button 
                        variant="icon"
                        className={isStarred ? 'active' : ''}
                        onClick={handleToggleStar}
                        title={isStarred ? "Quitar de favoritos" : "Guardar en favoritos"}
                      >
                        <Star size={18} style={{ fill: isStarred ? 'var(--color-primary)' : 'none' }} />
                      </Button>
                    )}
                  </>
                )}
              </div>
              {targetText && !isTranslating && (
                <span className="char-counter text-muted small">
                  {targetText.length} caracteres
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadatos del motor de traducción */}
      {engineMeta && !isTranslating && (
        <div className="translation-meta fadeIn">
          <div className="meta-title">
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Motor de IA: {engineMeta.engine}</span>
          </div>
          <div className="meta-desc">{engineMeta.explanation}</div>
        </div>
      )}

      {/* Módulo de Calificación y Corrección */}
      {targetText && engineMeta && !isTranslating && (
        <div className="rating-section fadeIn">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              ¿Es correcta la traducción? Califícanos:
            </span>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${rating >= star ? 'active' : ''}`}
                  onClick={() => handleStarRating(star)}
                  title={`Calificar con ${star} estrellas`}
                >
                  <Star size={18} style={{ fill: rating >= star ? 'var(--color-primary)' : 'none' }} />
                </button>
              ))}
            </div>
          </div>

          {feedbackSubmitted && (
            <Badge variant="success" className="fadeIn">
              ¡Gracias por tu retroalimentación! Ayuda a mejorar la IA.
            </Badge>
          )}

          {rating > 0 && rating <= 3 && !feedbackSubmitted && (
            <Button 
              variant="secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setShowCorrectionModal(true)}
            >
              Sugerir una corrección manual
            </Button>
          )}
        </div>
      )}

      {/* Modal de Corrección Manual */}
      {showCorrectionModal && (
        <div className="correction-overlay">
          <div className="correction-modal">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Heart size={20} style={{ color: '#f43f5e', fill: '#f43f5e' }} />
                Proponer Corrección
              </h3>
              <Button 
                variant="icon"
                onClick={() => setShowCorrectionModal(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label className="form-label">Texto original ({sourceLang === 'es' ? 'Español' : sourceLang === 'qu' ? 'Quechua' : 'Aymara'})</label>
              <div style={{ padding: '0.75rem', background: 'var(--card-inner-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                {sourceText}
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label className="form-label">Corrección Propuesta ({targetLang === 'es' ? 'Español' : targetLang === 'qu' ? 'Quechua' : 'Aymara'})</label>
              <textarea
                className="form-control"
                style={{ minHeight: '80px', resize: 'none' }}
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label className="form-label">Comentarios o Contexto Lingüístico</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. 'En mi comunidad se dice...', 'Es una palabra de cariño'"
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
              />
            </div>

            <p style={{ 
              fontSize: '0.82rem', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.45', 
              margin: '0.25rem 0',
              padding: '0.8rem',
              background: 'var(--info-glow-bg)',
              borderLeft: '3px solid var(--color-primary)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              textAlign: 'left'
            }}>
              💝 <strong>Nota de nuestro equipo:</strong> Nuestros desarrolladores y traductores estarán muy pendientes de tu sugerencia y la leerán con mucho cariño más tarde. Tu ayuda nos permite cuidar este traductor paso a paso, logrando traducciones con mayor precisión y amor para preservar nuestras raíces y darte una experiencia maravillosa.
            </p>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button 
                variant="secondary"
                onClick={() => setShowCorrectionModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary"
                onClick={handleSubmitCorrection}
                disabled={!correctedText.trim()}
              >
                Enviar Sugerencia
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Mensaje de cortesía y advertencia de IA en la parte inferior */}
      <div className="translator-warning-note">
        <strong>Nota del Proyecto:</strong> Al ser un sistema en desarrollo bilingüe, las traducciones pueden presentar imprecisiones. Valoramos tu paciencia y aportes para seguir mejorando.
      </div>

      {/* MODAL DE ERROR DE API DE TRADUCCIÓN */}
      <AlertModal 
        isOpen={errorModal.isOpen}
        title="Problema con el Motor de IA"
        message={errorModal.message}
        type="alert"
        onConfirm={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
