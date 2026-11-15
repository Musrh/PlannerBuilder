from pathlib import Path
from datetime import datetime
import shutil

file = Path("src/App.jsx")
source = file.read_text(encoding="utf-8")

# Sauvegarde sans écraser une sauvegarde existante
backup = Path(
    f"SAUVEGARDE_PLANNERBUILDER/App_AVANT_QUOTA_{datetime.now():%Y%m%d_%H%M%S}.jsx"
)
backup.parent.mkdir(exist_ok=True)
shutil.copy2(file, backup)

replacements = [
    (
        "import AuthGate from './AuthGate.jsx'",
        "import AuthGate from './AuthGate.jsx'\nimport { usePlannerBuilderAuth } from './AuthGate.jsx'"
    ),
    (
        "function App() {\n  const [showMockups, setShowMockups] = useState(false)",
        "function App() {\n  const { plan, isAdmin } = usePlannerBuilderAuth()\n  const isUnlimited = plan === 'pro' || isAdmin\n\n  const [showMockups, setShowMockups] = useState(false)"
    ),
    (
        "if (freeExports >= 3) {",
        "if (!isUnlimited && freeExports >= 3) {"
    ),
    (
        """      const nextExports = freeExports + 1
      localStorage.setItem(
        'plannerbuilder_free_exports',
        String(nextExports)
      )
      setFreeExports(nextExports)

      setNotice(
        `PDF créé : ${pages + 1} page(s), couverture comprise. ${3 - nextExports} export(s) gratuit(s) restant(s).`
      )""",
        """      if (isUnlimited) {
        setNotice(
          `PDF créé : ${pages + 1} page(s), couverture comprise.`
        )
      } else {
        const nextExports = freeExports + 1

        localStorage.setItem(
          'plannerbuilder_free_exports',
          String(nextExports)
        )
        setFreeExports(nextExports)

        setNotice(
          `PDF créé : ${pages + 1} page(s), couverture comprise. ${3 - nextExports} export(s) gratuit(s) restant(s).`
        )
      }"""
    )
]

for old, new in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"ARRÊT : bloc introuvable ou ambigu ({count} occurrence(s)) :\n{old[:100]}"
        )
    source = source.replace(old, new, 1)

file.write_text(source, encoding="utf-8")

print("Modification du quota effectuée.")
print(f"Sauvegarde créée : {backup}")
