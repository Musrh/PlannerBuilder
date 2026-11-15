from pathlib import Path
from datetime import datetime
import shutil
import sys

jsx = Path("src/AdminMockups.jsx")
css = Path("src/AdminMockups.css")

if not jsx.exists() or not css.exists():
    print("ERREUR : fichier JSX ou CSS introuvable.")
    sys.exit(1)

original = jsx.read_text(encoding="utf-8")
original_css = css.read_text(encoding="utf-8")

markers = {
    "import": "import { useState } from 'react'",
    "state": "const [customPatternImage, setCustomPatternImage] = useState('')",
    "format": "const [downloadFormat, setDownloadFormat] = useState('png')",
    "message": '{message && <p className="mockup-message" role="status">{message}</p>}',
    "export": "export default AdminMockups",
}

for name, marker in markers.items():
    if original.count(marker) != 1:
        print(f"ERREUR : le repère « {name} » apparaît {original.count(marker)} fois.")
        print("Aucune modification effectuée.")
        sys.exit(1)

if "plannerbuilder-mockup-library" in original:
    print("La bibliothèque semble déjà installée. Arrêt pour éviter un doublon.")
    sys.exit(1)

# Sauvegarde datée avant toute modification
backup = Path("../sauvegardes") / (
    "avant-bibliotheque-motifs-" + datetime.now().strftime("%Y%m%d-%H%M%S")
)
backup.mkdir(parents=True, exist_ok=False)
shutil.copy2(jsx, backup / "AdminMockups.jsx")
shutil.copy2(css, backup / "AdminMockups.css")

# 1. Import de useEffect
updated = original.replace(
    markers["import"],
    "import { useEffect, useState } from 'react'",
    1
)

# 2. Etats, IndexedDB et actions de gestion de la bibliothèque
library_code = r'''
  const [savedPatterns, setSavedPatterns] = useState([])
  const [patternName, setPatternName] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(true)

  const openPatternDatabase = () => new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB indisponible dans ce navigateur.'))
      return
    }

    const request = window.indexedDB.open('plannerbuilder-mockup-library', 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('patterns')) {
        db.createObjectStore('patterns', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  const readPatternLibrary = async () => {
    const db = await openPatternDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('patterns', 'readonly')
      const request = transaction.objectStore('patterns').getAll()

      request.onsuccess = () => {
        resolve(request.result.sort((a, b) => b.updatedAt - a.updatedAt))
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    })
  }

  const writePatternLibrary = async (pattern) => {
    const db = await openPatternDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('patterns', 'readwrite')
      transaction.objectStore('patterns').put(pattern)
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
      transaction.onabort = () => {
        db.close()
        reject(transaction.error || new Error('Enregistrement annulé.'))
      }
    })
  }

  const removePatternFromLibrary = async (id) => {
    const db = await openPatternDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('patterns', 'readwrite')
      transaction.objectStore('patterns').delete(id)
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
      transaction.onabort = () => {
        db.close()
        reject(transaction.error || new Error('Suppression annulée.'))
      }
    })
  }

  useEffect(() => {
    let active = true

    readPatternLibrary()
      .then((patterns) => {
        if (active) setSavedPatterns(patterns)
      })
      .catch(() => {
        if (active) {
          setMessage('Impossible de lire la bibliothèque locale de motifs.')
        }
      })
      .finally(() => {
        if (active) setLibraryLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const saveCurrentPattern = async () => {
    if (!customPatternImage) {
      setMessage('Importe d’abord une image de motif.')
      return
    }

    const name = patternName.trim()
    if (!name) {
      setMessage('Donne un nom à ce motif avant de l’enregistrer.')
      return
    }

    try {
      const pattern = {
        id: window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        dataUrl: customPatternImage,
        updatedAt: Date.now(),
      }

      await writePatternLibrary(pattern)
      setSavedPatterns(await readPatternLibrary())
      setPatternName('')
      setMessage(`Motif « ${name} » enregistré dans la bibliothèque.`)
    } catch (error) {
      console.error('Enregistrement du motif impossible :', error)
      setMessage('Échec de l’enregistrement. Vérifie l’espace disponible du navigateur.')
    }
  }

  const applySavedPattern = (pattern) => {
    setCustomPatternImage(pattern.dataUrl)
    setBackgroundType('upload')
    setPreview('')
    setMessage(`Motif « ${pattern.name} » sélectionné.`)
  }

  const renameSavedPattern = async (pattern) => {
    const proposedName = window.prompt('Nouveau nom du motif :', pattern.name)
    if (proposedName === null) return

    const name = proposedName.trim()
    if (!name) {
      setMessage('Le nom du motif ne peut pas être vide.')
      return
    }

    try {
      await writePatternLibrary({ ...pattern, name, updatedAt: Date.now() })
      setSavedPatterns(await readPatternLibrary())
      setMessage('Nom du motif mis à jour.')
    } catch (error) {
      console.error('Renommage impossible :', error)
      setMessage('Impossible de renommer ce motif.')
    }
  }

  const deleteSavedPattern = async (pattern) => {
    if (!window.confirm(`Supprimer le motif « ${pattern.name} » de la bibliothèque ?`)) {
      return
    }

    try {
      await removePatternFromLibrary(pattern.id)
      setSavedPatterns(await readPatternLibrary())
      setMessage(`Motif « ${pattern.name} » supprimé de la bibliothèque.`)
    } catch (error) {
      console.error('Suppression impossible :', error)
      setMessage('Impossible de supprimer ce motif.')
    }
  }
'''

updated = updated.replace(
    markers["format"],
    markers["format"] + "\n" + library_code,
    1
)

# 3. Interface de sauvegarde et galerie
gallery = r'''
        <div className="mockup-pattern-library">
          <h3>Ma bibliothèque de motifs</h3>
          <p className="mockup-library-help">
            Enregistre tes motifs importés pour les réutiliser plus tard dans ce navigateur.
          </p>

          {customPatternImage && (
            <div className="mockup-library-save">
              <label htmlFor="mockup-pattern-name">Nom du motif à enregistrer</label>
              <input
                id="mockup-pattern-name"
                type="text"
                value={patternName}
                onChange={(event) => setPatternName(event.target.value)}
                placeholder="Ex. Motif floral beige"
                maxLength={80}
              />
              <button
                type="button"
                className="mockup-secondary-button"
                onClick={saveCurrentPattern}
              >
                Enregistrer dans ma bibliothèque
              </button>
            </div>
          )}

          {libraryLoading ? (
            <p>Chargement de la bibliothèque…</p>
          ) : savedPatterns.length === 0 ? (
            <p className="mockup-library-empty">
              Aucun motif enregistré pour le moment.
            </p>
          ) : (
            <div className="mockup-library-grid">
              {savedPatterns.map((pattern) => (
                <article className="mockup-library-card" key={pattern.id}>
                  <img src={pattern.dataUrl} alt={`Aperçu : ${pattern.name}`} />
                  <strong title={pattern.name}>{pattern.name}</strong>
                  <button
                    type="button"
                    className="mockup-secondary-button"
                    onClick={() => applySavedPattern(pattern)}
                  >
                    Utiliser ce motif
                  </button>
                  <div className="mockup-library-actions">
                    <button
                      type="button"
                      onClick={() => renameSavedPattern(pattern)}
                    >
                      Renommer
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedPattern(pattern)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

'''

updated = updated.replace(markers["message"], gallery + markers["message"], 1)

css_addition = r'''

/* Bibliothèque locale de motifs pour les mockups */
.mockup-pattern-library {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #d8ded5;
  border-radius: 12px;
  background: #fafbf9;
}

.mockup-pattern-library h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.mockup-library-help,
.mockup-library-empty {
  color: #626b62;
  font-size: 0.9rem;
}

.mockup-library-save {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}

.mockup-library-save input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #cbd2c8;
  border-radius: 8px;
  font: inherit;
}

.mockup-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.mockup-library-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e0e4dd;
  border-radius: 10px;
  background: #fff;
}

.mockup-library-card img {
  width: 100%;
  height: 100px;
  object-fit: contain;
  border-radius: 6px;
  background: #f1f3ef;
}

.mockup-library-card strong {
  overflow-wrap: anywhere;
  font-size: 0.9rem;
}

.mockup-library-card button {
  cursor: pointer;
  padding: 7px 9px;
  border: 1px solid #cbd2c8;
  border-radius: 7px;
  background: #fff;
  font: inherit;
  font-size: 0.82rem;
}

.mockup-library-card .mockup-secondary-button,
.mockup-library-save .mockup-secondary-button {
  background: #e8eee4;
}

.mockup-library-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mockup-library-actions button {
  flex: 1;
}
'''

# Vérifier les changements en mémoire avant de toucher aux fichiers
if updated == original:
    print("ERREUR : aucune modification JSX n’a été préparée.")
    sys.exit(1)

try:
    jsx.write_text(updated, encoding="utf-8")
    css.write_text(original_css + css_addition, encoding="utf-8")
except Exception as error:
    jsx.write_text(original, encoding="utf-8")
    css.write_text(original_css, encoding="utf-8")
    print(f"ERREUR d’écriture : {error}")
    print("Les fichiers originaux ont été restaurés.")
    sys.exit(1)

report = [
    "=== INSTALLATION BIBLIOTHEQUE DE MOTIFS ===",
    f"Sauvegarde : {backup}",
    "AdminMockups.jsx : modifié",
    "AdminMockups.css : styles ajoutés",
    "Import useEffect : ajouté",
    "Stockage IndexedDB : ajouté",
    "Actions : enregistrer, réutiliser, renommer, supprimer",
    "",
    "Aucune autre fonctionnalité n’a été volontairement supprimée.",
]

Path("installation_bibliotheque.txt").write_text(
    "\n".join(report) + "\n", encoding="utf-8"
)
print("\n".join(report))
