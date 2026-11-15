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

    link.href = preview
    link.download = `${safeName || 'planner'}-mockup.png`
    link.click()
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
            Télécharger le mockup PNG
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
