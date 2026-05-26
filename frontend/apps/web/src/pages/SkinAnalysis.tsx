import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, X, Loader2, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'

const API = 'http://localhost:5050'
const skinAnalysisStorageKey = 'selfglow-skin-analysis-result'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

  .skin-analysis * { box-sizing: border-box; }
  .skin-analysis { font-family: 'Outfit', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scan {
    0%   { top: 0%; }
    50%  { top: 90%; }
    100% { top: 0%; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sa-fade-up { animation: fadeUp 0.4s ease forwards; }
  .sa-upload-zone {
    border: 2px dashed #e0c9a8;
    border-radius: 20px;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .sa-upload-zone:hover { border-color: #D4A574; background: rgba(212,165,116,0.05); }
  .sa-upload-zone.drag-over { border-color: #D4A574; background: rgba(212,165,116,0.08); }
  .sa-btn { transition: all 0.2s ease; cursor: pointer; font-family: 'Outfit', sans-serif; }
  .sa-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .sa-btn:active { transform: translateY(0); }
  .sa-score-bar { height: 6px; border-radius: 100px; background: #F0DCC8; overflow: hidden; }
  .sa-score-fill { height: 100%; border-radius: 100px; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .sa-product-card { transition: all 0.2s ease; cursor: pointer; }
  .sa-product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,165,116,0.18); }
  .sa-scanning .scan-line {
    position: absolute; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #D4A574, transparent);
    animation: scan 2s ease-in-out infinite;
  }
`

function compressImage(dataUrl: string, maxSize = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height / width) * maxSize)
          width = maxSize
        } else {
          width = Math.round((width / height) * maxSize)
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    img.src = dataUrl
  })
}

interface AnalysisResult {
  skinType: string
  dryness: number
  redness: number
  blemishes: number
  sensitivity: number
  overall: string
  tips: string[]
  products: { name: string; category: string; reason: string }[]
}

interface SkinAnalysisProps {
  onClose?: () => void
}

function loadSavedAnalysis(): { imageData: string | null; result: AnalysisResult | null } | null {
  try {
    const saved = sessionStorage.getItem(skinAnalysisStorageKey)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export default function SkinAnalysis({ onClose }: SkinAnalysisProps) {
  const savedAnalysis = loadSavedAnalysis()

  const [mode, setMode] = useState<'choose' | 'camera' | 'preview' | 'loading' | 'result'>(
    savedAnalysis?.result ? 'result' : 'choose'
  )
  const [imageData, setImageData] = useState<string | null>(savedAnalysis?.imageData || null)
  const [result, setResult] = useState<AnalysisResult | null>(savedAnalysis?.result || null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cameraErr, setCameraErr] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const navigate = useNavigate()

  const styleInjected = useRef(false)

  if (!styleInjected.current) {
    styleInjected.current = true
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
  }

  const startCamera = useCallback(async () => {
    setCameraErr(null)
    setMode('camera')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setCameraErr('Kamera konnte nicht geöffnet werden. Bitte erlaube den Kamerazugriff.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    canvas.getContext('2d')!.drawImage(video, 0, 0)

    const data = canvas.toDataURL('image/jpeg', 0.85)

    setImageData(data)
    stopCamera()
    setMode('preview')
  }, [stopCamera])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Bitte lade ein Bild hoch.')
      return
    }

    const reader = new FileReader()

    reader.onload = (event) => {
      setImageData(event.target?.result as string)
      setMode('preview')
    }

    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(false)

      const file = event.dataTransfer.files[0]

      if (file) handleFile(file)
    },
    [handleFile]
  )

  const analyse = useCallback(async () => {
    if (!imageData) return

    setMode('loading')
    setError(null)

    try {
<<<<<<< HEAD
      const compressed = await compressImage(imageData, 800, 0.7)
      const mediaType = 'image/jpeg'
=======
      // Bild komprimieren bevor es gesendet wird
      const compressed = await compressImage(imageData, 1200, 0.85)
      const mediaType  = 'image/jpeg'
>>>>>>> 9a6effc7386f907515fbeb414e0af3cd386fc64d

      const response = await fetch(`${API}/api/skin-analysis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: compressed, mediaType }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Serverfehler ${response.status}`)
      }

      const parsed = await response.json()

      if (parsed.error) {
        setError(parsed.error)
        setMode('preview')
        return
      }

      setResult(parsed)
      setMode('result')

      sessionStorage.setItem(
        skinAnalysisStorageKey,
        JSON.stringify({
          imageData,
          result: parsed,
        })
      )
    } catch (err: any) {
      console.error('Analyse-Fehler:', err)
      setError(err.message || 'Analyse fehlgeschlagen. Bitte versuche es erneut.')
      setMode('preview')
    }
  }, [imageData])

  const reset = useCallback(() => {
    stopCamera()
    sessionStorage.removeItem(skinAnalysisStorageKey)

    setMode('choose')
    setImageData(null)
    setResult(null)
    setError(null)
    setCameraErr(null)
  }, [stopCamera])

  const scoreColor = (value: number) => {
    if (value < 30) return '#7ab87a'
    if (value < 60) return '#D4A574'
    return '#c47a5a'
  }

  const scoreLabel = (value: number) => {
    if (value < 30) return 'Niedrig'
    if (value < 60) return 'Mittel'
    return 'Hoch'
  }

  const categoryEmoji = (category: string) => {
    if (category === 'Serum') return '💧'
    if (category === 'Feuchtigkeitspflege') return '🌿'
    if (category === 'Toner') return '✨'
    if (category === 'Sonnenschutz') return '☀️'
    return '🧴'
  }

  return (
    <div
      className="skin-analysis"
      style={{
        background: '#FDFAF6',
        borderRadius: 20,
        overflow: 'hidden',
        maxWidth: 500,
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: '#1c1209',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="#D4A574" />
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.01em',
            }}
          >
            Virtuelle Haut-Analyse
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: 24 }}>
        {mode === 'choose' && (
          <div className="sa-fade-up">
            <p
              style={{
                fontSize: 14,
                color: '#9a7a5a',
                margin: '0 0 20px',
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Mache ein Selfie oder lade ein Foto hoch. KI analysiert deinen Hauttyp und gibt
              personalisierte Empfehlungen.
            </p>

            {error && (
              <div
                style={{
                  background: '#fff0f0',
                  border: '1px solid #fcc',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#c47a5a',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={startCamera}
                className="sa-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: '#1c1209',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(212,165,116,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Camera size={18} color="#D4A574" />
                </div>

                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>
                    Selfie aufnehmen
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.5)',
                      margin: 0,
                      fontWeight: 300,
                    }}
                  >
                    Kamera öffnen und Foto machen
                  </p>
                </div>

                <ArrowRight
                  size={15}
                  style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }}
                />
              </button>

              <div
                className={`sa-upload-zone ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#FDF6EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Upload size={18} color="#D4A574" />
                </div>

                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#1c1209' }}>
                    Foto hochladen
                  </p>
                  <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0, fontWeight: 300 }}>
                    Klicken oder Bild reinziehen
                  </p>
                </div>

                <ArrowRight
                  size={15}
                  style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }}
                />
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFile(file)
              }}
            />

            <p
              style={{
                fontSize: 11,
                color: '#c4a882',
                textAlign: 'center',
                marginTop: 16,
                fontWeight: 300,
              }}
            >
              Dein Foto wird nicht gespeichert und nur für die Analyse verwendet.
            </p>
          </div>
        )}

        {mode === 'camera' && (
          <div className="sa-fade-up">
            {cameraErr ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#c47a5a', fontSize: 14, marginBottom: 16 }}>
                  {cameraErr}
                </p>

                <button
                  onClick={reset}
                  className="sa-btn"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 100,
                    background: '#F5E6D3',
                    border: 'none',
                    color: '#7a5c42',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Zurück
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#000',
                    marginBottom: 16,
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      display: 'block',
                      maxHeight: 320,
                      objectFit: 'cover',
                    }}
                  />

                  <div
                    className="sa-scanning"
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  >
                    <div className="scan-line" />
                  </div>
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <p
                  style={{
                    fontSize: 12,
                    color: '#9a7a5a',
                    textAlign: 'center',
                    margin: '0 0 16px',
                    fontWeight: 300,
                  }}
                >
                  Positioniere dein Gesicht gut sichtbar
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      stopCamera()
                      setMode('choose')
                    }}
                    className="sa-btn"
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 100,
                      background: 'transparent',
                      border: '1.5px solid #e0c9a8',
                      color: '#7a5c42',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Abbrechen
                  </button>

                  <button
                    onClick={takeSelfie}
                    className="sa-btn"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: 100,
                      background: '#D4A574',
                      border: 'none',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Camera size={16} /> Aufnehmen
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'preview' && imageData && (
          <div className="sa-fade-up">
            {error && (
              <div
                style={{
                  background: '#fff0f0',
                  border: '1px solid #fcc',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#c47a5a',
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 16,
                background: '#000',
              }}
            >
              <img
                src={imageData}
                alt="Vorschau"
                style={{
                  width: '100%',
                  display: 'block',
                  maxHeight: 300,
                  objectFit: 'cover',
                }}
              />
            </div>

            <p
              style={{
                fontSize: 13,
                color: '#9a7a5a',
                textAlign: 'center',
                margin: '0 0 16px',
                fontWeight: 300,
              }}
            >
              Sieht gut aus! Bereit für die Analyse?
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={reset}
                className="sa-btn"
                style={{
                  padding: '12px 16px',
                  borderRadius: 100,
                  background: 'transparent',
                  border: '1.5px solid #e0c9a8',
                  color: '#7a5c42',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCcw size={14} /> Neu
              </button>

              <button
                onClick={analyse}
                className="sa-btn"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 100,
                  background: '#D4A574',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={15} /> Jetzt analysieren
              </button>
            </div>
          </div>
        )}

        {mode === 'loading' && (
          <div className="sa-fade-up" style={{ textAlign: 'center', padding: '32px 0' }}>
            {imageData && (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  margin: '0 auto 20px',
                  border: '3px solid #D4A574',
                }}
              >
                <img
                  src={imageData}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <Loader2
              size={28}
              color="#D4A574"
              style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}
            />

            <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1209', margin: '0 0 6px' }}>
              Analyse läuft…
            </p>

            <p style={{ fontSize: 13, color: '#9a7a5a', margin: 0, fontWeight: 300 }}>
              KI erkennt Trockenheit, Rötungen & mehr
            </p>
          </div>
        )}

        {mode === 'result' && result && (
          <div className="sa-fade-up">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              {imageData && (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '3px solid #D4A574',
                  }}
                >
                  <img
                    src={imageData}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div>
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#C4925A',
                    margin: '0 0 4px',
                    fontWeight: 600,
                  }}
                >
                  Dein Hauttyp
                </p>

                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#1c1209',
                    margin: '0 0 4px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {result.skinType}
                </p>

                <p
                  style={{
                    fontSize: 13,
                    color: '#9a7a5a',
                    margin: 0,
                    fontWeight: 300,
                    lineHeight: 1.5,
                  }}
                >
                  {result.overall}
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '16px 18px',
                marginBottom: 16,
                border: '1px solid #F0DCC8',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#1c1209',
                  margin: '0 0 14px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Detailanalyse
              </p>

              {[
                { label: 'Trockenheit', val: result.dryness },
                { label: 'Rötungen', val: result.redness },
                { label: 'Unreinheiten', val: result.blemishes },
                { label: 'Sensibilität', val: result.sensitivity },
              ].map((score) => (
                <div key={score.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#7a5c42', fontWeight: 500 }}>
                      {score.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: scoreColor(score.val),
                        fontWeight: 600,
                      }}
                    >
                      {scoreLabel(score.val)}
                    </span>
                  </div>

                  <div className="sa-score-bar">
                    <div
                      className="sa-score-fill"
                      style={{
                        width: `${score.val}%`,
                        background: scoreColor(score.val),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {result.tips?.length > 0 && (
              <div
                style={{
                  background: '#FDF6EE',
                  borderRadius: 16,
                  padding: '16px 18px',
                  marginBottom: 16,
                  border: '1px solid #F0DCC8',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1c1209',
                    margin: '0 0 10px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Tipps für dich
                </p>

                {result.tips.map((tip, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: index < result.tips.length - 1 ? 8 : 0,
                    }}
                  >
                    <span
                      style={{
                        color: '#D4A574',
                        fontWeight: 700,
                        flexShrink: 0,
                        fontSize: 14,
                      }}
                    >
                      ✦
                    </span>

                    <p
                      style={{
                        fontSize: 13,
                        color: '#7a5c42',
                        margin: 0,
                        fontWeight: 300,
                        lineHeight: 1.5,
                      }}
                    >
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.products?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1c1209',
                    margin: '0 0 10px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Empfohlene Produkte
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.products.map((product, index) => (
                    <div
                      key={index}
                      className="sa-product-card"
                      style={{
                        background: '#fff',
                        border: '1px solid #F0DCC8',
                        borderRadius: 14,
                        padding: '12px 16px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: '#FDF6EE',
                          border: '1px solid #e8c9a0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 16,
                        }}
                      >
                        {categoryEmoji(product.category)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            margin: '0 0 2px',
                            color: '#1c1209',
                          }}
                        >
                          {product.name}
                        </p>

                        <p
                          style={{
                            fontSize: 11,
                            color: '#D4A574',
                            margin: '0 0 4px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {product.category}
                        </p>

                        <p
                          style={{
                            fontSize: 12,
                            color: '#9a7a5a',
                            margin: 0,
                            fontWeight: 300,
                            lineHeight: 1.4,
                          }}
                        >
                          {product.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={reset}
                className="sa-btn"
                style={{
                  padding: '12px 16px',
                  borderRadius: 100,
                  background: 'transparent',
                  border: '1.5px solid #e0c9a8',
                  color: '#7a5c42',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCcw size={13} /> Neu
              </button>

              <button
                onClick={() => {
                  const skinTypeMap: Record<string, string> = {
                    Normal: 'Normal',
                    Fettig: 'Oily',
                    Trocken: 'Dry',
                    Mischhaut: 'Combination',
                    Sensibel: 'Sensitive',
                    Oily: 'Oily',
                    Dry: 'Dry',
                    Sensitive: 'Sensitive',
                    Combination: 'Combination',
                  }

                  const concernMap: Record<string, string> = {
                    redness: 'Rötungen',
                    blemishes: 'Acne',
                  }

                  const mappedSkinType = skinTypeMap[result.skinType] || result.skinType
                  const params = new URLSearchParams()

                  params.set('skinType', mappedSkinType)

                  const activeConcerns = [
                    { key: 'redness', val: result.redness },
                    { key: 'blemishes', val: result.blemishes },
                  ].filter((concern) => concern.val >= 50)

                  activeConcerns.forEach((concern) => {
                    params.append('concern', concernMap[concern.key])
                  })

                  onClose?.()
                  navigate(`/shop?${params.toString()}`)
                }}
                className="sa-btn"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 100,
                  background: '#D4A574',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                Passende Produkte <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}