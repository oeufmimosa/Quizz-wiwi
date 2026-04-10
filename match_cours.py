import json, os, re, unicodedata, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

COURS_DIR = "C:/Users/eliei/Quizz wiwi/temp_pdfs/cours"
Q_DIR = "C:/Users/eliei/Quizz wiwi/questions"

def norm(text):
    if not text: return ''
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.lower()

def tokenize(text):
    return set(re.findall(r'[a-z]{3,}', norm(text)))

# ── Load all courses ──
cours_index = json.load(open(os.path.join(COURS_DIR, "index.json"), encoding='utf-8'))

# Build course data: id -> {name, paragraphs, tokens}
courses = {}
for c in cours_index:
    txt_path = os.path.join(COURS_DIR, c['txt'])
    text = open(txt_path, encoding='utf-8').read()

    # Extract course name from file name
    fname = c['file']
    name = re.sub(r'\.(pdf|pptx|docx)$', '', fname, flags=re.I)
    name = re.sub(r'^\d+\s*[-_]?\s*', '', name)
    name = re.sub(r'\b(UPM|2025|2026|2025-2026|4eme annee|4 annee|Pr \w+|anatomie pathologique|cours complet|cours|SP|compressed)\b', '', name, flags=re.I)
    name = name.strip(' -_')

    # Split into paragraphs (chunks of ~200-500 chars)
    raw_paragraphs = re.split(r'\n\s*\n|\n(?=[A-Z0-9])', text)
    paragraphs = []
    current = ""
    for p in raw_paragraphs:
        p = p.strip()
        if not p or len(p) < 30:
            current += " " + p
            continue
        if len(current) > 100:
            paragraphs.append(current.strip())
        current = p
    if len(current) > 100:
        paragraphs.append(current.strip())

    # Also create sentence-level chunks for finer matching
    sentences = re.split(r'[.!?]\s+', text)
    chunks = []
    for i in range(0, len(sentences), 3):
        chunk = '. '.join(sentences[i:i+3]).strip()
        if len(chunk) > 50:
            chunks.append(chunk)

    courses[c['id']] = {
        'name': name,
        'path': c['path'],
        'paragraphs': paragraphs,
        'chunks': chunks,
        'tokens': tokenize(text),
        'full_text_norm': norm(text)
    }

print(f"Loaded {len(courses)} courses")

# ── Course mapping by subject ──
# Map question cours tags to course IDs
cours_mapping = {
    # Anapath (IDs shifted +3 due to new recap PDFs at top)
    "Tumeurs de la prostate": [4],
    "Tumeurs du testicule": [5],
    "Pathologie oesophage et estomac": [6],
    "Pathologie ganglionnaire et lymphomes": [7, 12],
    "Cancer du sein et mastopathies": [8, 9],
    "Tumeurs de l'ovaire": [10],
    "Tumeurs hepatiques": [11],
    "Lymphome de Hodgkin": [12, 7],
    "Cancer colorectal et polypes": [6],
    "Cancer du poumon": [8],
    "Tumeurs de la vessie": [4, 5],
    "Tumeurs renales": [4],
    "Techniques anatomo-pathologiques": [7],
    "Anatomie Pathologique (general)": [],

    # Immuno
    "Deficits immunitaires": [14, 13],
    "Hypersensibilites et allergie": [15, 17],
    "Immunite anti-infectieuse et anti-tumorale": [16],
    "Vaccins et prevention": [18],
    "Immuno-intervention therapeutique": [18, 13],
    "Auto-immunite et tolerance": [13],
    "Auto-immunite specifique d'organe": [13],
    "Diagnostic immunologique": [14, 15, 13],
    "Immunopathologie (autre)": [14, 15, 16, 17, 13],

    # Maladies systemiques
    "Lupus erythemateux systemique": [19],
    "Sclerodermie systemique": [20],
    "Dermatomyosite et polymyosite": [21],
    "Syndrome de Gougerot-Sjogren": [22],
    "Syndrome des antiphospholipides": [23],
    "Vascularites systemiques": [19, 13],
    "Maladie de Behcet": [19],
    "Maladies systemiques (autre)": [19, 20, 21, 22, 23],

    # Genetique
    "Cytogenetique et caryotype": [],
    "Genetique mendelienne": [],

    # Traumato
    "Fractures du membre superieur": [47, 49, 50, 53, 55, 56, 57, 58],
    "Fractures du membre inferieur": [60, 61, 62],
    "Traumatisme du genou": [60],
    "Tendinopathies et lesions musculaires": [48, 53, 36],
    "Infection des tissus mous": [59],
    "Traumatologie generale": [54, 60],
    "Traumato-Orthopedie (autre)": [53, 60, 61],
    "Fractures de fatigue": [],

    # Rhumato
    "Polyarthrite rhumatoide": [32, 45],
    "Spondylarthrite": [34],
    "Arthrose": [31],
    "Goutte et chondrocalcinose": [37],
    "Infections osteo-articulaires": [40, 46],
    "Osteoporose et maladies metaboliques osseuses": [41, 42, 38],
    "Syndrome du canal carpien": [33, 32],
    "Epaule douloureuse": [36, 53],
    "Lombalgies et radiculalgies": [33],
    "Algodystrophie": [35],
    "Rhumatologie (autre)": [39, 40],

    # MPR
    "Troubles de la marche et aides techniques": [29],
    "MPR et affections neurologiques": [30],
    "Protheses et ortheses": [26],
    "Reeducation et readaptation": [25, 27],
    "Evaluation du handicap": [24],
    "Activite physique et sedentarite": [28],
    "Medecine Physique et Readaptation": [24, 25, 26, 27],
}

def make_windows(text, window_size=400, step=150):
    """Create overlapping windows from text."""
    words = text.split()
    windows = []
    for i in range(0, max(1, len(words) - window_size // 5), step // 5):
        chunk = ' '.join(words[i:i + window_size // 5])
        if len(chunk) > 50:
            windows.append(chunk)
    return windows

def find_best_passage(question_text, course_ids, correct_options_text=""):
    """Find the most relevant passage from the courses for a question."""
    q_tokens = tokenize(question_text)
    answer_tokens = tokenize(correct_options_text)
    important_tokens = answer_tokens | q_tokens

    if len(important_tokens) < 2:
        return ""

    stopwords = {'est', 'une', 'les', 'des', 'par', 'dans', 'pour', 'plus', 'peut', 'sont',
                 'avec', 'qui', 'que', 'pas', 'sur', 'elle', 'son', 'ses', 'tous', 'cette',
                 'entre', 'chez', 'fait', 'type', 'cas', 'deux', 'lors', 'aussi', 'etre',
                 'avoir', 'faire', 'tout', 'mais', 'comme', 'votre', 'vous', 'diagnostic',
                 'suivants', 'suivantes', 'parmi', 'propositions', 'reponse', 'juste', 'faux',
                 'vrai', 'cochez', 'entourer', 'indiquez', 'quelle', 'quels', 'quel'}
    important_tokens -= stopwords
    answer_tokens -= stopwords

    best_score = 0
    best_passage = ""
    best_course_name = ""

    for cid in course_ids:
        if cid not in courses:
            continue
        c = courses[cid]

        all_chunks = c['chunks'] + c['paragraphs']

        for chunk in all_chunks:
            chunk_tokens = tokenize(chunk) - stopwords
            if not chunk_tokens:
                continue

            answer_overlap = len(answer_tokens & chunk_tokens)
            question_overlap = len(q_tokens & chunk_tokens - answer_tokens)
            score = (answer_overlap * 2.0 + question_overlap) / max(len(important_tokens), 1)

            if len(chunk) < 80:
                score *= 0.5

            if score > best_score:
                best_score = score
                best_passage = chunk.strip()
                best_course_name = c['name']

    if best_score > 0.1 and best_passage:
        best_passage = re.sub(r'\s+', ' ', best_passage)
        return f"[{best_course_name}] {best_passage}"
    return ""

# ── Process each subject ──
for subject_file in ['genetique.json', 'anapath.json', 'traumato.json']:
    filepath = os.path.join(Q_DIR, subject_file)
    data = json.load(open(filepath, encoding='utf-8'))

    matched = 0
    total = 0

    for ex in data['examens']:
        for q in ex['questions']:
            total += 1
            cours_tag = q.get('cours', '')

            # Get relevant course IDs
            cids = cours_mapping.get(cours_tag, [])

            if not cids:
                q['cours_extrait'] = ""
                continue

            # Build question context
            q_text = q['enonce']
            if q.get('contexte'):
                q_text = q['contexte'] + ' ' + q_text
            # Add options text
            q_text += ' ' + ' '.join(o['text'] for o in q['options'])
            # Add correct answers text
            correct_opts = [o['text'] for o in q['options'] if o['label'] in q.get('reponses', [])]
            q_text += ' ' + ' '.join(correct_opts)

            passage = find_best_passage(q_text, cids)
            q['cours_extrait'] = passage
            if passage:
                matched += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"{subject_file}: {matched}/{total} questions matched to course excerpts")

print("\nDONE")
