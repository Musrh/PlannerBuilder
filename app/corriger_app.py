from pathlib import Path

file = Path("src/App.jsx")
content = file.read_text(encoding="utf-8")

old = """            {plan === 'pro'
              ? 'Choisissez une durée pour prolonger votre accès à PlannerBuilder Pro.'
              : 'Débloquez les exports PDF illimités et profitez de PlannerBuil"""

new = """            {plan === 'pro'
              ? 'Choisissez une durée pour prolonger votre accès à PlannerBuilder Pro.'
              : 'Débloquez les exports PDF illimités et profitez de PlannerBuilder Pro.'}"""

if old not in content:
    print("ERREUR : bloc incomplet introuvable. Aucun changement effectué.")
else:
    backup = Path("src/App.jsx.backup")
    backup.write_text(content, encoding="utf-8")
    content = content.replace(old, new, 1)
    file.write_text(content, encoding="utf-8")
    print("Correction appliquée avec succès.")
    print("Sauvegarde créée : src/App.jsx.backup")
