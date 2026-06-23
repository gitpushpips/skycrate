# Catalogue de pièces — référence de conception (inspiré de vrais avions)

> Sert de **source de données** pour le Jalon 4 futur (extension du catalogue). Principe :
> **pièces génériques par catégorie**, dont les **stats et silhouettes sont calibrées sur de
> vrais avions** répartis sur une échelle de performance/époque. Le joueur construit son
> propre avion ; le réalisme vient de la calibration, pas de répliques nommées.
>
> ⚠️ **IP** : utiliser les specs/silhouettes réelles comme **référence** uniquement.
> **Aucun nom de marque, logo ou livrée** dans le jeu (pas « Cessna », « F-35 »…). Noms de
> pièces génériques/originaux, organisés par catégorie + tier.
>
> ⚠️ **Divergence assumée vs Aviassembly** (qui a des pièces abstraites) : choix créatif pour
> enrichir CE jeu, pas une exigence de fidélité.

---

## 1. L'échelle de référence (tiers de progression)

Chaque tier est ancré sur un avion réel servant de repère pour calibrer les stats. Les
chiffres réels sont des **points d'ancrage relatifs** — les valeurs de jeu seront calibrées
via leva, c'est le **rapport entre tiers** qui compte. Les pièces doivent être **arrondies**
si le design réel le demande (bord d'attaque, etc.).

| Tier | Catégorie / époque | Avion-repère | Caractère en jeu |
|---|---|---|---|
| **T0** | Pionnier (bois & toile) | Biplan WWI (type Sopwith) — ~8,5 m d'envergure, ~130 ch rotatif, ~185 km/h, structure fragile | Lent, fragile (snap bas), pas cher, **moteur bois** (= début d'Aviassembly). Cargo minime. |
| **T1** | Aviation générale (piston léger) | Cessna 172 — envergure 11,0 m, surface ~16,3 m², à vide ~744 kg, MTOW ~1157 kg, 160-180 ch, croisière ~230 km/h, Vne ~300 km/h, plafond ~4270 m, autonomie ~1185 km | Fiable, bon marché, stable, faible vitesse/altitude. La base. |
| **T2** | Brousse / utilitaire (turbopropulseur) | Caravan-like — ~675 shp, MTOW ~3970 kg, croisière ~340 km/h, décollage court, gros volume | **Gros cargo**, robuste, court-terrain. Cœur du transport. |
| **T3** | Warbird haute perf. (piston) | P-51D — envergure 11,28 m, surface 21,83 m², à vide ~3465 kg, en charge ~5490 kg, ~1490 ch (1720 WEP), max ~700 km/h, Cd₀ 0,0163, allongement 5,83 | Rapide, ailes solides (snap haut), gourmand. Peu de cargo. |
| **T4** | Jet de ligne (turbofan) | 737-like — envergure ~35,8 m, MTOW ~79 000 kg, 2× turbofan ~120 kN, croisière ~Mach 0,78 (~840 km/h), autonomie ~5400 km | **Très gros cargo + longue portée**, croisière élevée, exige **piste longue**. Lourd, peu agile. |
| **T5** | Chasseur 4ᵉ gén (postcombustion) | F-16 — envergure 9,45 m, MTOW ~19 200 kg, turbofan ~129 kN PC / ~17 000 lbf à sec, max ~Mach 2, T/W > 1, portée ~4200 km | **Très rapide et agile**, très gourmand en PC, cargo faible. |
| **T6** | Furtif 5ᵉ gén (top) | F-35A — envergure ~10,7 m, MTOW ~31 800 kg, turbofan ~191 kN PC / ~28 000 lbf à sec, max ~Mach 1,6, rayon ~1135 km | Poussée extrême, high-tech, **très cher** (coût + recherche). |
| **T7** | Expérimental / fusée | X-plane / fusée — poussée extrême, combustion courte | **Moteurs-fusée empilables** + ballons → vitesse 3000 / 10 000 d'altitude (= succès Aviassembly). Pour le délire. |

---

## 2. Taxonomie des pièces (catégories génériques)

Le joueur mélange librement ces catégories. Chaque catégorie existe en **plusieurs paliers**
répartis sur les tiers.

**Ailes (par planforme)**
- **Droite épaisse** (T0-T1) : forte portance basse vitesse, traînée élevée, snap bas → vol lent stable.
- **Droite/effilée métal** (T1-T3) : bon compromis L/D, snap moyen-haut.
- **Laminaire haute perf.** (T3) : L/D élevé, snap haut (réf. P-51, Cd₀ 0,0163).
- **En flèche** (T4-T5) : faible traînée à haute vitesse, **portance basse vitesse réduite** (décollage rapide), snap très haut.
- **Delta** (T5-T7) : très haute vitesse, manœuvrable, portance basse vitesse faible, snap extrême.
- **Biplan** (T0) : double surface → portance par paire, fragile, lent.

**Moteurs (par type — définit le caractère)**
- **Bois / piston ancien** (T0) : poussée faible, fragile, peu cher (= wood engine).
- **Piston à hélice** (T1-T3) : poussée modérée, **efficace** (faible conso), vitesse de pointe plafonnée.
- **Turbopropulseur** (T2) : plus de puissance, **bonne poussée basse vitesse**, conso raisonnable.
- **Turbofan** (T4) : forte poussée, **efficace à haute vitesse**, exige de la vitesse pour rendre.
- **Turboréacteur + postcombustion** (T5) : **énorme poussée**, **conso catastrophique** (pulse), bouton PC séparé.
- **Fusée** (T7) : poussée extrême, **durée très courte**, empilable.

**Fuselages** : du petit (T0-T1, léger, peu de cargo) au gros (T4, lourd, gros volume). Restent **déformables** comme au Jalon 2.

**Cockpits / cabines** : capacité de **cargo** croissante avec la taille ; plusieurs autorisés ; gros = rayon plus large.

**Trains** : **fixe** (T0-T2, léger, traînée, robuste court-terrain) vs **rétractable** (T3+, plus lourd, moins de traînée).

**Empennages** : conventionnel / en T / en V — pour le réglage de stabilité (marge statique).

---

## 3. Mapping « specs réelles → stats de jeu »

Stats de jeu : `weight, lift, drag, fuel, fuelUsage, strength (snap×100), cargo, thrust, cost, researchCost`.

| Stat de jeu | Dérivée de… | Heuristique |
|---|---|---|
| **weight** | masse à vide réelle | échelle commune calibrée via leva ; respecte le **rapport** entre tiers (biplan « léger » ≪ jet). |
| **lift** | surface alaire × efficacité du profil | monte avec le tier ; flèche/delta = **moins** de portance basse vitesse. |
| **drag** | Cd₀ + planforme | flèche/delta = **moins** de traînée à haute vitesse ; droite épaisse = plus. Ancre : P-51 Cd₀ 0,0163. |
| **strength** (snap) | époque structurelle | bois/toile **bas** (~150-200) → métal GA moyen → warbird haut → jet/composite **très haut**. Suit les Vne. |
| **thrust** | puissance (ch) ou poussée (lbf) réelle | piston faible → turboprop → turbofan fort → **postcombustion énorme** → fusée extrême. |
| **fuelUsage** | type moteur + puissance | piston/turboprop **efficaces** ; turbofan moyen ; **PC catastrophique** ; fusée brûle vite mais brièvement. |
| **fuel** | réservoirs (×100) | croît avec le tier ; certaines ailes en portent. |
| **cargo** | volume cabine/fuselage | petit (chasseur) ↔ énorme (turboprop utilitaire, jet de ligne). |
| **cost / researchCost** | tier | croissance forte par tier ; T6/T7 très chers (coins + scrap). |

**Compromis à préserver** (cœur de l'intérêt du build) : aucun tier n'est « meilleur en tout ».
Un chasseur est rapide mais ne porte rien et boit son carburant ; un turboprop porte tout mais
plafonne en vitesse ; un warbird est rapide mais fragile/peu de cargo. **Le bon avion dépend de
la mission.**

---

## 4. Consignes de génération (pour Claude Code)

- Générer les pièces comme **données typées** (`core/parts/`), **une entrée par palier**, avec **toutes les stats exposables/réglables via leva** pour calibration à chaud.
- Chaque pièce porte un **`tier`** (T0-T7) — servira au Jalon recherche pour l'arbre de déblocage.
- **Silhouettes reconnaissables** mais **géométrie maison** (aucun modèle importé) : une aile delta doit *se lire* comme une delta, un radial comme un radial — via primitives/géométrie procédurale stylisée, cohérente avec le rendu du jeu.
- Noms **génériques/originaux** par catégorie + tier (ex. « Aile droite — Brousse », « Turbofan — Ligne »), **jamais** de marque réelle.
