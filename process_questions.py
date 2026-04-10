import json
import os

# Read the questions file
with open(r"c:\Users\eliei\Quizz wiwi\questions\genetique.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Read all course files
course_dir = r"c:\Users\eliei\Quizz wiwi\temp_pdfs\cours"
courses = {}
course_files = {
    "cours_010.txt": "Auto-immunite et Maladies auto-immunes",
    "cours_011.txt": "Deficits immunitaires",
    "cours_012.txt": "Hypersensibilite immediate et allergie",
    "cours_013.txt": "Immunite anti-infectieuse",
    "cours_014.txt": "Hypersensibilites types II III IV",
    "cours_015.txt": "Vaccination",
    "cours_016.txt": "Lupus erythemateux systemique",
    "cours_017.txt": "Sclerodermie",
    "cours_018.txt": "Polymyosite et dermatomyosite",
    "cours_019.txt": "Syndrome de Gougerot-Sjogren",
    "cours_020.txt": "Syndrome des antiphospholipides",
}

for fname, title in course_files.items():
    filepath = os.path.join(course_dir, fname)
    with open(filepath, "r", encoding="utf-8") as f:
        courses[title] = f.read()

# Count total questions
total = 0
for exam in data["examens"]:
    total += len(exam["questions"])
print(f"Total questions: {total}")

# Print all unique question IDs for verification
for exam in data["examens"]:
    for q in exam["questions"]:
        print(q["id"])
