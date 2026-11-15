from pathlib import Path

source = Path("src/AdminMockups.jsx")
text = source.read_text(encoding="utf-8")

checks = {
    "Import React useState": "import { useState } from 'react'",
    "Etat customPatternImage": "const [customPatternImage, setCustomPatternImage] = useState('')",
    "Import motif": 'id="mockup-pattern-image"',
    "Zone après import motif": "{backgroundType === 'upload' && (",
    "Fin des contrôles": "className=\"mockup-primary-button\"\n          type=\"button\"\n          onClick={createCustomMockup}",
    "Fin du composant": "export default AdminMockups",
}

report = []
report.append("=== PREPARATION BIBLIOTHEQUE DE MOTIFS ===")
report.append(f"Fichier : {source}")
report.append("")

for label, marker in checks.items():
    count = text.count(marker)
    report.append(f"{label} : {count} occurrence(s)")

report.append("")
report.append("=== ETAT ===")
if all(text.count(marker) == 1 for marker in checks.values()):
    report.append("OK : les points d'insertion sont uniques.")
    report.append("Aucune modification du composant n'a été effectuée.")
else:
    report.append("ATTENTION : points d'insertion à examiner avant toute modification.")
    report.append("Aucune modification du composant n'a été effectuée.")

Path("preparation_bibliotheque.txt").write_text(
    "\n".join(report) + "\n",
    encoding="utf-8"
)
print("\n".join(report))
