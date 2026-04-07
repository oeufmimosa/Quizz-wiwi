# Quizz Wiwi - Application de Quiz Médical

## Description
Application web de quiz QCM pour réviser les annales d'examens médicaux (génétique, anapath, traumato).

## Stack
- HTML / CSS / JS vanilla (zéro dépendance)
- Questions stockées en JSON dans `questions/`
- Déployable sur n'importe quel serveur statique

## Structure
```
index.html          - Point d'entrée de l'app
style.css           - Styles
app.js              - Logique du quiz
questions/          - Fichiers JSON de questions par matière
data/               - Annales sources (PDFs, images) - NE PAS COMMITER
```

## Conventions
- Les questions suivent le format défini dans `questions/example.json`
- Chaque matière a son propre fichier JSON
- L'interface est en français
- Mobile-first design
