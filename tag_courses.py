import json, re, unicodedata

def norm(text):
    if not text:
        return ''
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.lower()

def match(text, keywords):
    return any(kw in text for kw in keywords)

# ============================================================
# TRAUMATO
# ============================================================
with open('C:/Users/eliei/Quizz wiwi/questions/traumato.json', 'r', encoding='utf-8') as f:
    trau = json.load(f)

# Traumato Q1-20: subdivide by topic
trau_fracture_sup = ['humerus', 'coude', 'radius', 'avant-bras', 'avant bras', 'pouteau',
    'colles', 'scaphoide', 'poignet', 'lunaire', 'carpe', 'epaule', 'luxation de l',
    'luxation anterieure', 'luxation posterieure', 'ceinture scapulaire', 'palette humerale',
    'epicondyl', 'olecrane', 'supracondyl']
trau_fracture_inf = ['femur', 'tibia', 'jambe', 'cheville', 'malleole', 'bassin', 'cotyle',
    'patella', 'rotule', 'bimalleolaire', 'maisonneuve', 'diaphyse femorale', 'hoffa',
    'trochanter', 'col du femur', 'hanche']
trau_genou = ['genou', 'menisque', 'croise', 'ligament lateral', 'tiroir', 'lachman',
    'poplite', 'tta', 'tuberosit']
trau_muscle_tendon = ['tendinopathie', 'tendon', 'lesion musculaire', 'claquage', 'elongation',
    'dechirure', 'contracture', 'musculaire', 'loge', 'crush', 'aponev',
    'stener', 'entorse', 'metacarpo', 'technopathie']
trau_infection = ['fasciite', 'necrosante', 'infection des tissus', 'myonecrose',
    'necrose', 'porte d\'entree']
trau_fracture_fatigue = ['fracture de fatigue', 'fracture de stress']
trau_sport = ['sportif', 'sport', 'dopage']
trau_general = ['fracture ouverte', 'cauchoix', 'fixateur externe', 'osteosynthese',
    'cal vicieux', 'pseudarthrose', 'syndrome de loges', 'whiteside',
    'pression de la loge', 'complication', 'platre']

# Rhumato Q21-40: subdivide by topic
rhu_pr = ['polyarthrite rhumatoide', 'polyarthrite rhumato', 'pr debutante',
    'methotrexate', 'anti tnf', 'squeeze', 'facteur rhumatoide',
    'anti ccp', 'anti-ccp', 'raideur matinale', 'nodules rhumatoide',
    'solumedrol', 'methylprednisolone']
rhu_spa = ['spondylarthrite', 'spondyloarthrite', 'sacro-ili', 'hla b27', 'hla-b27',
    'enthes', 'talalgie', 'fessalgie', 'rachialgie', 'dactylite',
    'doigts en saucisse', 'orteils en saucisse', 'syndesmophyte',
    'psoriasique']
rhu_arthrose = ['arthrose', 'gonarthrose', 'coxarthrose', 'osteophyte',
    'heberden', 'bouchard', 'pincement', 'interligne']
rhu_goutte = ['goutte', 'uricemie', 'urate', 'colchicine', 'allopurinol',
    'tophus', 'metatarso-phalangienne', 'chondrocalcinose', 'pyrophosphate']
rhu_infection = ['arthrite septique', 'monoarthrite', 'staphylocoque', 'gonocoque',
    'tuberculose osteo', 'coxite', 'spondylodiscite', 'infection articulaire']
rhu_osteo = ['osteoporose', 'osteomalacie', 't score', 'bisphosphonate',
    'densitometrie', 'vitamine d', 'hypercalcemie', 'hyperparathyroidie',
    'looser milkmann', 'fracture pathologique', 'demineralisation']
rhu_canal = ['canal carpien', 'tinel', 'phallen', 'phalen', 'nerf median',
    'paresthesie', 'syndrome canalaire']
rhu_epaule = ['epaule douloureuse', 'coiffe des rotateurs', 'capsulite',
    'conflit sous acromial', 'neer', 'jobe', 'patte', 'yokum',
    'tendinopathie du sous', 'sus-epineux']
rhu_rachis = ['lombalgie', 'lombosciatique', 'radiculalgie', 'hernie discale',
    'cruralgie', 'cervico-brachiale', 'lassegue', 'l4', 'l5', 's1', 'l3']
rhu_algodystrophie = ['algodystrophie', 'sudeck', 'vaso-moteur', 'allodynie',
    'demineralisation mouchetee', 'phase chaude']
rhu_divers = ['fievre', 'still', 'arterite', 'hospitalisation en urgence']

# MPR Q41-50: subdivide
mpr_handicap = ['handicap', 'deficience', 'limitation d\'activite', 'restriction de participation',
    'classification', 'cif']
mpr_marche = ['marche', 'cerebelleuse', 'steppage', 'fauchage', 'boiterie',
    'deambulateur', 'canne', 'fauteuil roulant', 'cadre de marche']
mpr_reeducation = ['reeducation', 'kinesitherapeute', 'ergotherapeute', 'orthophoniste',
    'orthoprothesiste', 'podologue', 'objectifs de reeducation']
mpr_appareil = ['prothese', 'orthese', 'appareillage', 'emboiture', 'sur mesure']
mpr_neuro = ['paralysie cerebrale', 'polyhandicap', 'handicap moteur']
mpr_sport = ['sedentarite', 'activite physique', '150 minutes']

for ex in trau['examens']:
    for q in ex['questions']:
        m = re.search(r'q(\d+)$', q['id'])
        num = int(m.group(1)) if m else 0
        en = norm(q['enonce'])
        ctx = norm(q.get('contexte', ''))
        opts = ' '.join(norm(o['text']) for o in q['options'])
        combined = en + ' ' + ctx + ' ' + opts

        if num <= 20:
            # Traumato-Orthopedie
            if match(combined, trau_genou):
                q['cours'] = 'Traumatisme du genou'
            elif match(combined, trau_infection):
                q['cours'] = 'Infection des tissus mous'
            elif match(combined, trau_muscle_tendon):
                q['cours'] = 'Tendinopathies et lesions musculaires'
            elif match(combined, trau_fracture_sup):
                q['cours'] = 'Fractures du membre superieur'
            elif match(combined, trau_fracture_inf):
                q['cours'] = 'Fractures du membre inferieur'
            elif match(combined, trau_fracture_fatigue):
                q['cours'] = 'Fractures de fatigue'
            elif match(combined, trau_general):
                q['cours'] = 'Traumatologie generale'
            else:
                q['cours'] = 'Traumato-Orthopedie (autre)'
        elif num <= 40:
            # Rhumatologie
            if match(combined, rhu_pr):
                q['cours'] = 'Polyarthrite rhumatoide'
            elif match(combined, rhu_spa):
                q['cours'] = 'Spondylarthrite'
            elif match(combined, rhu_goutte):
                q['cours'] = 'Goutte et chondrocalcinose'
            elif match(combined, rhu_arthrose):
                q['cours'] = 'Arthrose'
            elif match(combined, rhu_infection):
                q['cours'] = 'Infections osteo-articulaires'
            elif match(combined, rhu_osteo):
                q['cours'] = 'Osteoporose et maladies metaboliques osseuses'
            elif match(combined, rhu_canal):
                q['cours'] = 'Syndrome du canal carpien'
            elif match(combined, rhu_epaule):
                q['cours'] = 'Epaule douloureuse'
            elif match(combined, rhu_rachis):
                q['cours'] = 'Lombalgies et radiculalgies'
            elif match(combined, rhu_algodystrophie):
                q['cours'] = 'Algodystrophie'
            else:
                q['cours'] = 'Rhumatologie (autre)'
        else:
            # MPR
            if match(combined, mpr_marche):
                q['cours'] = 'Troubles de la marche et aides techniques'
            elif match(combined, mpr_neuro):
                q['cours'] = 'MPR et affections neurologiques'
            elif match(combined, mpr_appareil):
                q['cours'] = 'Protheses et ortheses'
            elif match(combined, mpr_reeducation):
                q['cours'] = 'Reeducation et readaptation'
            elif match(combined, mpr_handicap):
                q['cours'] = 'Evaluation du handicap'
            elif match(combined, mpr_sport):
                q['cours'] = 'Activite physique et sedentarite'
            else:
                q['cours'] = 'Medecine Physique et Readaptation'

with open('C:/Users/eliei/Quizz wiwi/questions/traumato.json', 'w', encoding='utf-8') as f:
    json.dump(trau, f, ensure_ascii=False, indent=2)

print("=== TRAUMATO ===")
tags = {}
for ex in trau['examens']:
    for q in ex['questions']:
        t = q.get('cours', '?')
        tags[t] = tags.get(t, 0) + 1
for t in sorted(tags, key=tags.get, reverse=True):
    print(f"  {t}: {tags[t]}")

# ============================================================
# GENETIQUE
# ============================================================
with open('C:/Users/eliei/Quizz wiwi/questions/genetique.json', 'r', encoding='utf-8') as f:
    gen = json.load(f)

# Immuno subtopics
imm_deficit = ['deficit immunitaire', 'bruton', 'di-george', 'scid', 'hyper-igm', 'hyper igm',
    'kostman', 'neutropenie cyclique', 'granulomatose septique', 'deficit en hla',
    'deficit en molecules', 'lad', 'deficit humoral', 'deficit cellulaire',
    'immunoglobuline polyvalente', 'phagocyte', 'burst test', 'explosion oxydative',
    'nfs', 'immunophenotypage', 'hypogammaglobulinemie']
imm_allergie = ['hypersensibilite', 'allergi', 'anaphyla', 'choc anaphylactique',
    'ige', 'prick', 'basophile', 'tryptase', 'desensibilisation',
    'asthme eosinophilique', 'rhinite allergique', 'urticaire',
    'dermatite atopique', 'hyper-ige', 'maladie serique', 'coombs',
    'type i', 'type ii', 'type iii', 'type iv',
    'toxidermie', 'dress', 'lyell', 'stevens-johnson', 'agep',
    'eosinophil', 'cryoglobulin', 'precipitine']
imm_infectieuse = ['anti-infecti', 'anti-bacterien', 'anti-tumoral', 'immunite innee',
    'immunite adaptative', 'interferon', 'nk ', 'cellules nk', 'ctl',
    'lymphocytes t cytotoxiques', 'shift', 'drift',
    'car-t', 'car ', 'chimeric', 'immunotherapie',
    'anti-checkpoints', 'anti-checkpoint']
imm_vaccin = ['vaccin', 'bcg', 'ror', 'rougeole', 'poliomyelite', 'vpo',
    'hpv', 'pathogenes inactives', 'vivant attenue', 'adjuvant',
    'recombinant', 'polysaccharidique', 'vectoriel']
imm_intervention = ['ciclosporine', 'calcineurine', 'immunosuppres', 'anti-mitotique',
    'anti-metabolite', 'anticorps monoclonaux', 'rituximab', 'adalimumab',
    'natalizumab', 'infliximab', 'cetuximab', 'certolizumab',
    'anti-tnf', 'thymoglobuline', 'serum anti-lymphocytaire',
    'mycophenolate', 'azathioprine', 'endoxan', 'cyclophosphamide',
    'methotrexate']
imm_autoimmunite = ['auto-immunite', 'tolerance', 'anergie', 'deletion clonale',
    'bcr editing', 'auto-anticorps', 'antigene nucleaire']
imm_diag = ['igra', 'test igra', 'igm+', 'igg+', 'avidite', 'serologi',
    'dater une infection', 'coeliaque', 'anti-transglutaminase',
    'anti-endomysium', 'anti-gliadine', 'super-antigene',
    'toxi-infection']

# Maladies systemiques subtopics
sys_lupus = ['lupus', 'anti-dna', 'anti-sm', 'anti-nucleosome',
    'antinucleaire', 'nephrite lupique', 'c3 et c4',
    'hypocomplementemie', 'anticoagulant lupique',
    'anticorps anti-nucleaire', 'lupique']
sys_sclerodermie = ['scleroderm', 'raynaud', 'anti-scl', 'anti-topoisomerase',
    'anti-centromere', 'sclerodactylie', 'capillaroscopie',
    'crise renale', 'pneumopathie infiltrante', 'megacapillaire',
    'anti-arn polymerase', 'iloprost', 'fibrose pulmonaire']
sys_vascularite = ['vascularite', 'anca', 'granulomatose', 'wegener',
    'polyangeite', 'gepa', 'periarterite noueuse',
    'arterite a cellules geantes', 'purpura',
    'c-anca', 'p-anca', 'mpo', 'pr3']
sys_sjogren = ['gougerot', 'sjogren', 'secheresse', 'sialadeni',
    'chisholm', 'parotid', 'anti-ssa', 'anti-ssb', 'xerostomie',
    'xerophtalmie', 'test de shirmer', 'lymphome']
sys_sapl = ['antiphospholipide', 'anticardiolipine', 'anti-beta2',
    'anti-b2gp1', 'thrombose veineuse', 'fausses couches',
    'avortement', 'livedo', 'sapl']
sys_myosite = ['dermatomyosite', 'polymyosite', 'myopathie inflammatoire',
    'enzymes musculaires', 'cpk', 'anti-jo1']
sys_behcet = ['behcet', 'apht', 'uveite', 'lesions genitales',
    'thrombophlebite cerebrale', 'patherg']
sys_thyroide = ['hashimoto', 'basedow', 'thyroidite', 'anti-tpo',
    'anti-rtsh', 'tsh', 'myasthenie', 'pemphig',
    'goodpasture']

# Genetique subtopics
gen_chromo = ['caryotype', 'chromosome', 'trisomie', 'monosomie',
    'translocation', 'robertsonien', 'fish', 'hybridation in situ',
    'klinefelter', 'turner', 'triploidie', 'tetraploidie',
    'anomalie de nombre', 'anomalie chromosomique',
    'gonosome', 'acrocentrique', 'indice centromerique',
    'bras long', 'bras court', 'x-fragile', 'sry',
    'bcr/abl', 'bcr-abl', 'philadelphie',
    'microdeletion', 'expansion de triplet',
    'mosaicisme germinal', 'euploidie']
gen_mendel = ['autosomique', 'recessif', 'dominant', 'penetrance',
    'expressivite', 'conductrice', 'heterozygote',
    'arbre genealogique', 'lié a l\'x', 'liee a l\'x',
    'lie a l\'y', 'neurofibromatose', 'myopathie',
    'mutation somatique', 'mutation germinale',
    'transmission', 'mendel', 'hereditaire',
    'allele morbide', 'allele mute']

for ex in gen['examens']:
    exam_id = ex['id']
    for q in ex['questions']:
        m = re.search(r'q(\d+)$', q['id'])
        num = int(m.group(1)) if m else 0
        en = norm(q['enonce'])
        ctx = norm(q.get('contexte', ''))
        opts = ' '.join(norm(o['text']) for o in q['options'])
        combined = en + ' ' + ctx + ' ' + opts

        # First try keyword matching
        assigned = False

        # Genetique
        if match(combined, gen_chromo):
            q['cours'] = 'Cytogenetique et caryotype'
            assigned = True
        elif match(combined, gen_mendel):
            q['cours'] = 'Genetique mendelienne'
            assigned = True
        # Maladies systemiques
        elif match(combined, sys_lupus):
            q['cours'] = 'Lupus erythemateux systemique'
            assigned = True
        elif match(combined, sys_sclerodermie):
            q['cours'] = 'Sclerodermie systemique'
            assigned = True
        elif match(combined, sys_vascularite):
            q['cours'] = 'Vascularites systemiques'
            assigned = True
        elif match(combined, sys_sjogren):
            q['cours'] = 'Syndrome de Gougerot-Sjogren'
            assigned = True
        elif match(combined, sys_sapl):
            q['cours'] = 'Syndrome des antiphospholipides'
            assigned = True
        elif match(combined, sys_myosite):
            q['cours'] = 'Dermatomyosite et polymyosite'
            assigned = True
        elif match(combined, sys_behcet):
            q['cours'] = 'Maladie de Behcet'
            assigned = True
        elif match(combined, sys_thyroide):
            q['cours'] = 'Auto-immunite specifique d\'organe'
            assigned = True
        # Immunopathologie
        elif match(combined, imm_deficit):
            q['cours'] = 'Deficits immunitaires'
            assigned = True
        elif match(combined, imm_allergie):
            q['cours'] = 'Hypersensibilites et allergie'
            assigned = True
        elif match(combined, imm_vaccin):
            q['cours'] = 'Vaccins et prevention'
            assigned = True
        elif match(combined, imm_intervention):
            q['cours'] = 'Immuno-intervention therapeutique'
            assigned = True
        elif match(combined, imm_infectieuse):
            q['cours'] = 'Immunite anti-infectieuse et anti-tumorale'
            assigned = True
        elif match(combined, imm_autoimmunite):
            q['cours'] = 'Auto-immunite et tolerance'
            assigned = True
        elif match(combined, imm_diag):
            q['cours'] = 'Diagnostic immunologique'
            assigned = True

        if not assigned:
            # Fallback by position
            if exam_id == 'gen-cc-2023':
                q['cours'] = 'Genetique mendelienne'
            elif exam_id == 'gen-cc-2025':
                q['cours'] = 'Maladies systemiques (autre)'
            elif exam_id in ['gen-norm-2022', 'gen-norm-2023']:
                if num <= 17:
                    q['cours'] = 'Immunopathologie (autre)'
                elif num <= 34:
                    q['cours'] = 'Maladies systemiques (autre)'
                else:
                    q['cours'] = 'Genetique mendelienne'
            elif exam_id == 'gen-norm-2024':
                if num <= 16:
                    q['cours'] = 'Maladies systemiques (autre)'
                elif num <= 33:
                    q['cours'] = 'Immunopathologie (autre)'
                else:
                    q['cours'] = 'Genetique mendelienne'
            elif exam_id == 'gen-ratt-2024':
                if num <= 12:
                    q['cours'] = 'Maladies systemiques (autre)'
                elif num <= 25:
                    q['cours'] = 'Immunopathologie (autre)'
                else:
                    q['cours'] = 'Genetique mendelienne'
            else:
                q['cours'] = 'Non classe'

with open('C:/Users/eliei/Quizz wiwi/questions/genetique.json', 'w', encoding='utf-8') as f:
    json.dump(gen, f, ensure_ascii=False, indent=2)

print("\n=== GENETIQUE / IMMUNO ===")
tags = {}
for ex in gen['examens']:
    for q in ex['questions']:
        t = q.get('cours', '?')
        tags[t] = tags.get(t, 0) + 1
for t in sorted(tags, key=tags.get, reverse=True):
    print(f"  {t}: {tags[t]}")

# ============================================================
# ANAPATH (keep as-is, already well subdivided)
# ============================================================
print("\n=== ANAPATH (unchanged) ===")
with open('C:/Users/eliei/Quizz wiwi/questions/anapath.json', 'r', encoding='utf-8') as f:
    ana = json.load(f)
tags = {}
for ex in ana['examens']:
    for q in ex['questions']:
        t = q.get('cours', '?')
        tags[t] = tags.get(t, 0) + 1
for t in sorted(tags, key=tags.get, reverse=True):
    print(f"  {t}: {tags[t]}")

print("\n=== DONE ===")
