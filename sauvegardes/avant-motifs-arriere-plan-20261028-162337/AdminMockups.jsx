import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './AdminMockups.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

function AdminMockups() {
  const [file, setFile] = useState(null)
  const [style, setStyle] = useState('nature')
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [customImage, setCustomImage] = useState('')
  const [customTitle, setCustomTitle] = useState('YOUR NEXT CHAPTER')
  const [customBackground, setCustomBackground] = useState('#e5eadc')
  const [downloadFormat, setDownloadFormat] = useState('png')

  async function createCustomMockup() {
    if (!customImage) {
      setMessage('Importez d’abord une image PNG, JPG ou WebP.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const image = new Image()
      image.src = customImage

      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () => reject(
          new Error('Impossible de lire cette image.')
        )
      })

      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 900

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Impossible de préparer le canvas.')
      }

      ctx.fillStyle = customBackground
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const margin = 70
      const maxWidth = canvas.width - margin * 2
      const maxHeight = 650
      const ratio = Math.min(
        maxWidth / image.width,
        maxHeight / image.height
      )
      const width = image.width * ratio
      const height = image.height * ratio
      const x = (canvas.width - width) / 2
      const y = 40 + (maxHeight - height) / 2

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.20)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 10
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 10, y - 10, width + 20, height + 20)
      ctx.restore()

      ctx.drawImage(image, x, y, width, height)

      const title = customTitle.trim()
      if (title) {
        ctx.fillStyle = '#24344b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = 'bold 38px Arial, sans-serif'

        const maxTextWidth = canvas.width - 100
        let displayedTitle = title
        while (
          ctx.measureText(displayedTitle).width > maxTextWidth &&
          displayedTitle.length > 3
        ) {
          displayedTitle = displayedTitle.slice(0, -4) + '…'
        }

        ctx.fillText(displayedTitle, canvas.width / 2, 790)
      }

      setPreview(canvas.toDataURL('image/png'))
      setMessage('Mockup personnalisé créé. Vous pouvez le télécharger.')
    } catch (error) {
      console.error('Erreur de création du mockup personnalisé :', error)
      setMessage('Impossible de créer le mockup. Essayez une autre image.')
    } finally {
      setLoading(false)
    }
  }

  async function createMockup() {
    if (!file) {
      setMessage('Importez d’abord un fichier PDF.')
      return
    }

    setLoading(true)
    setMessage('')
    setPreview('')

    try {
      const data = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const pageCanvas = document.createElement('canvas')
      const pageContext = pageCanvas.getContext('2d')

      if (!pageContext) {
        throw new Error('Impossible de préparer le rendu de la page.')
      }

      pageCanvas.width = Math.ceil(viewport.width)
      pageCanvas.height = Math.ceil(viewport.height)

      await page.render({
        canvas: pageCanvas,
        canvasContext: pageContext,
        viewport,
      }).promise

      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 900
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Impossible de créer l’image publicitaire.')
      }

      const palettes = {
        nature: ['#e5eadc', '#6e8665', '#354331'],
        elegant: ['#eee5dc', '#a47d62', '#49372d'],
        professional: ['#dfe6f0', '#455d80', '#24344b'],
        colorful: ['#fae4d7', '#d77a60', '#713d35'],
      }
      const [background, accent, ink] = palettes[style]

      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(1050, 110, 210, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(300, 85, 570, 730, 22)
      ctx.fill()

      ctx.save()
      ctx.shadowColor = 'rgba(35, 40, 30, 0.25)'
      ctx.shadowBlur = 35
      ctx.shadowOffsetX = 18
      ctx.shadowOffsetY = 22
      ctx.fillStyle = '#fff'
      ctx.fillRect(330, 110, 470, 665)
      ctx.restore()

      const imageRatio = pageCanvas.width / pageCanvas.height
      const maxWidth = 440
      const maxHeight = 620
      let imageWidth = maxWidth
      let imageHeight = imageWidth / imageRatio

      if (imageHeight > maxHeight) {
        imageHeight = maxHeight
        imageWidth = imageHeight * imageRatio
      }

      ctx.drawImage(
        pageCanvas,
        330 + (470 - imageWidth) / 2,
        125 + (640 - imageHeight) / 2,
        imageWidth,
        imageHeight,
      )

      ctx.fillStyle = ink
      ctx.font = 'bold 37px Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('YOUR NEXT', 65, 390)
      ctx.fillText('CHAPTER', 65, 438)

      ctx.fillStyle = accent
      ctx.fillRect(67, 462, 100, 5)

      ctx.font = '20px Arial, sans-serif'
      ctx.fillStyle = ink
      ctx.fillText('A digital planner made for you', 65, 505)

      ctx.font = 'bold 17px Arial, sans-serif'
      ctx.fillText('DIGITAL DOWNLOAD', 65, 830)

      ctx.font = '16px Arial, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText('PLAN  •  CREATE  •  GROW', 930, 790)

      setPreview(canvas.toDataURL('image/png'))
      setMessage(`Mockup créé à partir de la première page de « ${file.name} ».`)
      await pdf.destroy()
    } catch (error) {
      console.error('Erreur de création du mockup :', error)
      setMessage(
        'Impossible de lire ce PDF. Essayez un PDF valide et non protégé par mot de passe.',
      )
    } finally {
      setLoading(false)
    }
  }

  function downloadMockup() {
    if (!preview) return

    const link = document.createElement('a')
    const safeName = (file?.name || 'planner')
      .replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9-_]+/gi, '-')

    const extension = downloadFormat === 'jpg' ? 'jpg' : 'png'
    const finishDownload = (dataUrl) => {
      link.href = dataUrl
      link.download = `${safeName || 'planner'}-mockup.${extension}`
      link.click()
    }

    if (downloadFormat === 'png') {
      finishDownload(preview)
      return
    }

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setMessage('Impossible de préparer l’export JPG.')
        return
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)

      finishDownload(canvas.toDataURL('image/jpeg', 0.92))
    }
    image.onerror = () => setMessage('Impossible de convertir l’image en JPG.')
    image.src = preview
  }

  return (
    <section className="admin-mockups">
      <div className="admin-mockups-heading">
        <p className="admin-mockups-eyebrow">OUTIL DE PROMOTION</p>
        <h2>Générateur de mockups PDF</h2>
        <p>
          Importez un PDF, créez une image publicitaire et téléchargez-la
          en PNG. Le PDF original n’est pas modifié.
        </p>
      </div>

      <div className="mockup-controls">
        <h3>1. Créer un mockup à partir d’un PDF</h3>
        <label htmlFor="mockup-pdf">Fichier PDF</label>
        <input
          id="mockup-pdf"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null
            setFile(nextFile)
            setPreview('')
            setMessage('')
            if (nextFile && nextFile.size > 40 * 1024 * 1024) {
              setFile(null)
              event.target.value = ''
              setMessage('Le PDF dépasse la limite de 40 Mo.')
            }
          }}
        />

        <label htmlFor="mockup-style">Ambiance publicitaire</label>
        <select
          id="mockup-style"
          value={style}
          onChange={(event) => {
            setStyle(event.target.value)
            setPreview('')
          }}
        >
          <option value="nature">Nature</option>
          <option value="elegant">Élégante</option>
          <option value="professional">Professionnelle</option>
          <option value="colorful">Colorée</option>
        </select>

        <button
          className="mockup-primary-button"
          type="button"
          onClick={createMockup}
          disabled={!file || loading}
        >
          {loading ? 'Création en cours…' : 'Créer le mockup'}
        </button>

        <h3>2. Importer et personnaliser une image</h3>
        <label htmlFor="mockup-custom-image">Image du mockup</label>
        <input
          id="mockup-custom-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const nextFile = event.target.files?.[0]
            setPreview('')
            setMessage('')

            if (!nextFile) {
              setCustomImage('')
              return
            }

            if (nextFile.size > 20 * 1024 * 1024) {
              event.target.value = ''
              setCustomImage('')
              setMessage('L’image dépasse la limite de 20 Mo.')
              return
            }

            if (!['image/png', 'image/jpeg', 'image/webp'].includes(nextFile.type)) {
              event.target.value = ''
              setCustomImage('')
              setMessage('Format non accepté. Choisissez PNG, JPG ou WebP.')
              return
            }

            const reader = new FileReader()
            reader.onload = () => {
              setCustomImage(String(reader.result || ''))
              setMessage('Image importée. Personnalisez le texte et le fond.')
            }
            reader.onerror = () => setMessage('Impossible de lire ce fichier image.')
            reader.readAsDataURL(nextFile)
          }}
        />

        <label htmlFor="mockup-custom-title">Texte à afficher sous l’image</label>
        <input
          id="mockup-custom-title"
          type="text"
          maxLength={100}
          value={customTitle}
          onChange={(event) => {
            setCustomTitle(event.target.value)
            setPreview('')
          }}
          placeholder="Ex. : YOUR NEXT CHAPTER"
        />

        <label htmlFor="mockup-custom-background">Couleur de fond</label>
        <input
          id="mockup-custom-background"
          type="color"
          value={customBackground}
          onChange={(event) => {
            setCustomBackground(event.target.value)
            setPreview('')
          }}
        />

        <button
          className="mockup-primary-button"
          type="button"
          onClick={createCustomMockup}
          disabled={!customImage || loading}
        >
          {loading ? 'Création en cours…' : 'Créer le mockup personnalisé'}
        </button>

        <label htmlFor="mockup-export-format">Format de téléchargement</label>
        <select
          id="mockup-export-format"
          value={downloadFormat}
          onChange={(event) => setDownloadFormat(event.target.value)}
        >
          <option value="png">PNG — qualité sans perte</option>
          <option value="jpg">JPG — fichier compressé</option>
        </select>

        {message && <p className="mockup-message" role="status">{message}</p>}
      </div>

      {preview && (
        <div className="mockup-result">
          <h3>Aperçu publicitaire</h3>
          <img src={preview} alt="Aperçu du mockup publicitaire du PDF" />
          <button
            className="mockup-primary-button"
            type="button"
            onClick={downloadMockup}
          >
            Télécharger le mockup {downloadFormat.toUpperCase()}
          </button>
        </div>
      )}

      <p className="mockup-local-note">
        Prototype local : le PDF est traité dans le navigateur et n’est pas
        envoyé à un serveur par ce composant. Cette page n’est pas encore
        protégée par une authentification administrateur.
      </p>
    </section>
  )
}

export default AdminMockups
