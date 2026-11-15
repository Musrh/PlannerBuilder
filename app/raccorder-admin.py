from pathlib import Path
import re

path = Path("src/App.jsx")
source = path.read_text()

if "from './Admin.jsx'" in source:
    raise SystemExit("Admin.jsx est déjà importé. Arrêt.")

source = source.replace(
    "import { useRef, useState } from 'react'",
    "import { useRef, useState } from 'react'\nimport { Link, Navigate, Route, Routes } from 'react-router-dom'"
)

source = source.replace(
    "import AdminLocalPanel from './AdminLocalPanel.jsx'",
    "import Admin from './Admin.jsx'"
)

source = source.replace(
    "  const [showAdminPanel, setShowAdminPanel] = useState(false)\n",
    ""
)

pattern = re.compile(
    r"      \{isAdmin && \(\s*<button.*?</button>\s*\)\}",
    re.DOTALL
)

source, count = pattern.subn(
    '      {isAdmin && (\n'
    '        <Link to="/admin" className="mockup-dev-toggle">\n'
    '          Administration\n'
    '        </Link>\n'
    '      )}',
    source,
    count=1
)

if count != 1:
    raise SystemExit("Bouton admin introuvable. Arrêt.")

source = source.replace(
    "      {isAdmin && showAdminPanel && <AdminLocalPanel />}\n",
    ""
)

if "showAdminPanel" in source or "AdminLocalPanel" in source:
    raise SystemExit("Ancien panneau encore présent. Arrêt.")

old = """function AppWithAuth() {
  return (
    <AuthGate>
      <App />
    </AuthGate>
  )
}

export default AppWithAuth
"""

new = """function AdminRoute() {
  const { isAdmin } = usePlannerBuilderAuth()
  return isAdmin ? <Admin /> : <Navigate to="/" replace />
}

function AppWithAuth() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}

export default AppWithAuth
"""

if old not in source:
    raise SystemExit("Fin du fichier non reconnue. Arrêt.")

source = source.replace(old, new)
path.write_text(source)
print("Raccordement de /admin effectué avec succès.")
