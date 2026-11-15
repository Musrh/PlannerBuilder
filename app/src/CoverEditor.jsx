import './CoverEditor.css'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'

const INITIAL = [
  {
    id: 1,
    type: 'text',
    text: 'Mon Planner',
    x: 12,
    y: 22,
    w: 76,
    h: 12,
    fontSize: 34,
    color: '#263B2B',
    fontFamily: 'Georgia',
    bold: true,
    rotation: 0
  },
  {
    id: 2,
    type: 'text',
    text: 'Organisez vos journées',
    x: 15,
    y: 36,
    w: 70,
    h: 8,
    fontSize: 15,
    color: '#667466',
    fontFamily: 'Arial',
    bold: false,
    rotation: 0
  }
]

const CoverEditor = forwardRef(function CoverEditor(
  { onChange },
  ref
) {
  const pageRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(null)

  const [elements, setElements] = useState(INITIAL)
  const [selected, setSelected] = useState(1)
  const [background, setBackground] = useState('#F7F5EF')
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])

  const active = elements.find(item => item.id === selected)

  function saveHistory(next) {
    setHistory(previous => [...previous, elements].slice(-30))
    setFuture([])
    setElements(next)
  }

  function updateElement(id, changes) {
    const next = elements.map(item =>
      item.id === id ? { ...item, ...changes } : item
    )
    saveHistory(next)
  }

  function addText() {
    const id = Date.now()
    const next = [
      ...elements,
      {
        id,
        type: 'text',
        text: 'Nouveau texte',
        x: 15,
        y: 50,
        w: 70,
        h: 10,
        fontSize: 22,
        color: '#263B2B',
        fontFamily: 'Arial',
        bold: false,
        rotation: 0
      }
    ]
    saveHistory(next)
    setSelected(id)
  }

  function addShape(shape = 'circle') {
    const id = Date.now()
    const next = [
      ...elements,
      {
        id,
        type: 'shape',
        shape,
        x: 40,
        y: 60,
        w: 20,
        h: 20,
        color: '#A5B99C',
        rotation: 0
      }
    ]
    saveHistory(next)
    setSelected(id)
  }

  function addImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Formats acceptés : PNG, JPG et WebP.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image trop volumineuse. Maximum : 10 Mo.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const id = Date.now()
      const next = [
        ...elements,
        {
          id,
          type: 'image',
          src: reader.result,
          x: 25,
          y: 48,
          w: 50,
          h: 25,
          rotation: 0
        }
      ]
      saveHistory(next)
      setSelected(id)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function removeSelected() {
    if (!selected) return
    saveHistory(elements.filter(item => item.id !== selected))
    setSelected(null)
  }

  function undo() {
    if (!history.length) return
    const previous = history[history.length - 1]
    setFuture(items => [elements, ...items].slice(0, 30))
    setHistory(items => items.slice(0, -1))
    setElements(previous)
  }

  function redo() {
    if (!future.length) return
    const next = future[0]
    setHistory(items => [...items, elements].slice(-30))
    setFuture(items => items.slice(1))
    setElements(next)
  }

  function moveLayer(direction) {
    const index = elements.findIndex(item => item.id === selected)
    if (index < 0) return

    const target = index + direction
    if (target < 0 || target >= elements.length) return

    const next = [...elements]
    ;[next[index], next[target]] = [next[target], next[index]]
    saveHistory(next)
  }

  function startDrag(event, item) {
    if (!pageRef.current) return
    event.preventDefault()
    event.stopPropagation()

    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSelected(item.id)

    const rect = pageRef.current.getBoundingClientRect()
    dragRef.current = {
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: item.x,
      originalY: item.y,
      width: rect.width,
      height: rect.height
    }
  }

  function drag(event) {
    const drag = dragRef.current
    if (!drag) return

    const dx = (event.clientX - drag.startX) / drag.width * 100
    const dy = (event.clientY - drag.startY) / drag.height * 100

    setElements(items =>
      items.map(item =>
        item.id === drag.id
          ? {
              ...item,
              x: Math.max(0, Math.min(95, drag.originalX + dx)),
              y: Math.max(0, Math.min(95, drag.originalY + dy))
            }
          : item
      )
    )
  }

  function stopDrag() {
    if (!dragRef.current) return
    dragRef.current = null
    setHistory(items => [...items, elements].slice(-30))
    setFuture([])
  }

  async function renderCover() {
    const canvas = document.createElement('canvas')
    canvas.width = 1240
    canvas.height = 1754

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (const item of elements) {
      const x = item.x / 100 * canvas.width
      const y = item.y / 100 * canvas.height
      const w = item.w / 100 * canvas.width
      const h = item.h / 100 * canvas.height

      ctx.save()
      ctx.translate(x + w / 2, y + h / 2)
      ctx.rotate((item.rotation || 0) * Math.PI / 180)

      if (item.type === 'text') {
        ctx.fillStyle = item.color
        ctx.font = `${item.bold ? 'bold' : 'normal'} ${item.fontSize * 2}px ${item.fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.text || '', 0, 0, w)
      }

      if (item.type === 'shape') {
        ctx.fillStyle = item.color
        if (item.shape === 'circle') {
          ctx.beginPath()
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (item.shape === 'line') {
          ctx.fillRect(-w / 2, -2, w, 4)
        } else {
          ctx.fillRect(-w / 2, -h / 2, w, h)
        }
      }

      if (item.type === 'image') {
        const image = new Image()
        image.src = item.src
        await new Promise(resolve => {
          image.onload = resolve
          image.onerror = resolve
        })
        if (image.complete && image.naturalWidth) {
          ctx.drawImage(image, -w / 2, -h / 2, w, h)
        }
      }

      ctx.restore()
    }

    return canvas.toDataURL('image/png')
  }

  useImperativeHandle(ref, () => ({
    exportImage: renderCover,
    getDesign: () => ({ elements, background })
  }))

  useEffect(() => {
    onChange?.({ elements, background })
  }, [elements, background, onChange])

  return (
    <div className="cover-editor">
      <div className="cover-editor-toolbar">
        <button onClick={addText}>＋ Texte</button>
        <button onClick={() => addShape('circle')}>＋ Cercle</button>
        <button onClick={() => addShape('rectangle')}>＋ Rectangle</button>
        <button onClick={() => addShape('line')}>＋ Ligne</button>
        <button onClick={() => fileRef.current?.click()}>＋ Image</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={addImage}
        />
        <button onClick={undo} disabled={!history.length}>↶</button>
        <button onClick={redo} disabled={!future.length}>↷</button>
      </div>

      <div className="cover-editor-workspace">
        <div
          ref={pageRef}
          className="cover-editor-page"
          style={{ background }}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          {elements.map(item => (
            <div
              key={item.id}
              onPointerDown={event => startDrag(event, item)}
              onClick={() => setSelected(item.id)}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.w}%`,
                height: `${item.h}%`,
                transform: `rotate(${item.rotation || 0}deg)`,
                border: selected === item.id ? '1px dashed #2878D0' : '1px solid transparent',
                touchAction: 'none',
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: item.color,
                fontSize: `${item.fontSize || 20}px`,
                fontFamily: item.fontFamily || 'Arial',
                fontWeight: item.bold ? 'bold' : 'normal',
                userSelect: 'none'
              }}
            >
              {item.type === 'text' && item.text}
              {item.type === 'shape' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: item.color,
                    borderRadius: item.shape === 'circle' ? '50%' : 0
                  }}
                />
              )}
              {item.type === 'image' && (
                <img
                  src={item.src}
                  alt=""
                  draggable="false"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cover-editor-properties">
        <label>
          Fond de couverture
          <input
            type="color"
            value={background}
            onChange={event => setBackground(event.target.value)}
          />
        </label>

        {active && (
          <>
            {active.type === 'text' && (
              <>
                <label>
                  Texte
                  <input
                    value={active.text}
                    onChange={event =>
                      setElements(items => items.map(item =>
                        item.id === selected
                          ? { ...item, text: event.target.value }
                          : item
                      ))
                    }
                  />
                </label>

                <label>
                  Taille du texte
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={active.fontSize}
                    onChange={event =>
                      updateElement(selected, {
                        fontSize: Number(event.target.value)
                      })
                    }
                  />
                </label>

                <label>
                  Couleur du texte
                  <input
                    type="color"
                    value={active.color}
                    onChange={event =>
                      updateElement(selected, { color: event.target.value })
                    }
                  />
                </label>

                <label>
                  Police
                  <select
                    value={active.fontFamily}
                    onChange={event =>
                      updateElement(selected, { fontFamily: event.target.value })
                    }
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={active.bold}
                    onChange={event =>
                      updateElement(selected, { bold: event.target.checked })
                    }
                  />
                  Gras
                </label>
              </>
            )}

            <label>
              Rotation
              <input
                type="range"
                min="-180"
                max="180"
                value={active.rotation || 0}
                onChange={event =>
                  updateElement(selected, {
                    rotation: Number(event.target.value)
                  })
                }
              />
            </label>

            <div className="cover-editor-layer-actions">
              <button onClick={() => moveLayer(-1)}>Envoyer derrière</button>
              <button onClick={() => moveLayer(1)}>Mettre devant</button>
              <button onClick={removeSelected}>Supprimer</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
})

export default CoverEditor
