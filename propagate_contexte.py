"""
Propagate clinical case contexts to all questions of the same case.
Uses [QCM X à Y] markers when present, otherwise uses sequential heuristic.
"""
import json, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

Q_DIR = "C:/Users/eliei/Quizz wiwi/questions"

def parse_qcm_range(ctx):
    """Find [QCM X à Y] or [QCM X-Y] in context. Returns (start, end) or None."""
    if not ctx: return None
    # Match patterns like "[QCM 1 à 5]", "[QCM 18 à 20]", "QCM 46 à 50"
    patterns = [
        r'\[QCM\s+(\d+)\s+(?:à|-|–)\s+(\d+)\]',
        r'QCM\s+(\d+)\s+(?:à|-|–)\s+(\d+)',
        r'\[(\d+)\s+(?:à|-|–)\s+(\d+)\]',
    ]
    for p in patterns:
        m = re.search(p, ctx, re.IGNORECASE)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None

def get_q_num(qid):
    m = re.search(r'q(\d+)$', qid)
    return int(m.group(1)) if m else 0

def get_case_id(ctx):
    """Get 'Cas N' identifier from context."""
    if not ctx: return None
    m = re.search(r'(?:Cas|cas)\s*(\d+)', ctx)
    return f"Cas {m.group(1)}" if m else None

for f in ['genetique.json', 'anapath.json', 'traumato.json']:
    filepath = f'{Q_DIR}/{f}'
    data = json.load(open(filepath, encoding='utf-8'))
    propagated = 0

    for ex in data['examens']:
        questions = ex['questions']

        # Step 1: Find explicit [QCM X à Y] ranges
        explicit_ranges = []  # list of (start, end, context, source_q_idx)
        for i, q in enumerate(questions):
            ctx = q.get('contexte') or ''
            r = parse_qcm_range(ctx)
            if r:
                explicit_ranges.append((r[0], r[1], ctx, i))

        # Apply explicit ranges first
        for start, end, ctx, src_idx in explicit_ranges:
            for i, q in enumerate(questions):
                qnum = get_q_num(q['id'])
                if start <= qnum <= end:
                    if not q.get('contexte'):
                        q['contexte'] = ctx
                        propagated += 1

        # Step 2: For "Cas N" without explicit range, propagate within same Cas N
        # Detect contexts with "Cas N" and group consecutive questions
        case_groups = {}  # cas_id -> list of (q_index, ctx)
        for i, q in enumerate(questions):
            ctx = q.get('contexte') or ''
            cid = get_case_id(ctx)
            if cid:
                if cid not in case_groups:
                    case_groups[cid] = []
                case_groups[cid].append((i, ctx))

        # For each case group, find the most complete context (longest, or last)
        # and propagate to questions BETWEEN the existing case questions that have no context
        for cid, group in case_groups.items():
            if len(group) < 2:
                continue
            indices = sorted([g[0] for g in group])
            min_i, max_i = indices[0], indices[-1]
            # Get the last (most updated) context for this case
            last_ctx = group[-1][1]
            # Use the longest context (typically has all info)
            longest_ctx = max([g[1] for g in group], key=len)
            # Fill gaps between min and max
            for i in range(min_i, max_i + 1):
                q = questions[i]
                if not q.get('contexte'):
                    # Find the most recent context BEFORE this question
                    relevant_ctx = None
                    for j in range(i, -1, -1):
                        if questions[j].get('contexte') and get_case_id(questions[j].get('contexte')) == cid:
                            relevant_ctx = questions[j]['contexte']
                            break
                    if relevant_ctx:
                        q['contexte'] = relevant_ctx
                        propagated += 1

        # Step 3: Heuristic - if question text references "le patient/la patiente/cette/ce/lui/elle/il",
        # propagate the most recent context.
        # Question starts with reference to patient/exam
        patient_refs = re.compile(
            r'^\s*(?:le\s+patient|la\s+patiente|ce\s+patient|cette\s+patiente|chez\s+(?:ce|cette|le|la)\s+patient|'
            r'la\s+palpation|l[\'’]?examen|l[\'’]?auscultation|l[\'’]?inspection|'
            r'au\s+scanner|au\s+scan|à\s+la\s+radio|sur\s+la\s+radio|à\s+l[\'’]?imagerie|à\s+l[\'’]?irm|'
            r'quel\s+est\s+votre\s+diagnostic|quelle\s+est\s+votre|que\s+(?:lui\s+)?prescrivez|'
            r'vous\s+(?:décidez|notez|concluez|prescrivez|évoquez|recommandez|orientez|réalisez|adressez|envisagez)|'
            r'lui\s+|elle\s+|il\s+|ce\s+jour|à\s+postérieri|a\s+posteriori|à\s+l[\'’]?examen)',
            re.IGNORECASE
        )
        # Or contains references like "ce diagnostic", "cette affection", "cette patiente", etc.
        contains_refs = re.compile(
            r'\b(?:ce\s+diagnostic|cette\s+affection|cette\s+pathologie|cette\s+patiente|ce\s+patient|'
            r'chez\s+(?:ce|cette|cet)\s+patient|chez\s+(?:lui|elle)|chez\s+(?:ce|cette)\s+(?:malade|patient|patiente)|'
            r'lors\s+de\s+cette|au\s+cours\s+de\s+cette\s+affection|de\s+cette\s+patiente|de\s+ce\s+patient|'
            r'sa\s+(?:hanche|genou|cheville|épaule|coude|poignet|main|jambe|cuisse|bras))\b',
            re.IGNORECASE
        )

        last_ctx = None
        last_ctx_q_idx = -1
        for i, q in enumerate(questions):
            ctx = q.get('contexte')
            if ctx:
                last_ctx = ctx
                last_ctx_q_idx = i
                continue
            # Check if this question references the previous case
            text = q.get('enonce', '') + ' ' + ' '.join(o.get('text', '') for o in q.get('options', []))
            if last_ctx and (i - last_ctx_q_idx) <= 5:
                if patient_refs.search(q.get('enonce', '') or '') or contains_refs.search(text):
                    q['contexte'] = last_ctx
                    propagated += 1

    with open(filepath, 'w', encoding='utf-8') as fout:
        json.dump(data, fout, ensure_ascii=False, indent=2)

    print(f"{f}: {propagated} contextes propages")

# Verify
print("\n=== VERIFICATION ===")
for f in ['genetique.json', 'anapath.json', 'traumato.json']:
    data = json.load(open(f'{Q_DIR}/{f}', encoding='utf-8'))
    for ex in data['examens']:
        with_ctx = sum(1 for q in ex['questions'] if q.get('contexte'))
        if with_ctx > 0:
            total = len(ex['questions'])
            print(f"  {ex['nom']}: {with_ctx}/{total}")
