# CLAUDE.md — Skycrate

> Mémo de référence pour les sessions Claude Code sur ce projet. **À mettre à jour à la fin de chaque jalon.**

## 1. C'est quoi

**Skycrate** — jeu 3D personnel et **non commercial**, jouable en local dans le navigateur :
on **construit** un avion à partir de pièces, on **vole**, on **livre du cargo** entre aéroports.
Mécaniques inspirées de **Aviassembly** (Jelle Booij). On reproduit librement les
**mécaniques/physique/économie** (non protégeables), mais **assets, nom et code sont les nôtres** —
ne jamais importer d'asset, nom, logo ou texte de l'original.

**Spécification de référence** : [`aviassembly-dossier-recreation.md`](./aviassembly-dossier-recreation.md) — à consulter en permanence.
Valeurs chiffrées clés : section 14 du dossier. Données à relever en jeu : section 16.

**Référence catalogue (Jalon recherche/extension)** : [`docs/catalogue-pieces.md`](./docs/catalogue-pieces.md) — pièces
génériques par catégorie, calibrées sur de vrais avions répartis en **tiers T0-T7** (silhouettes maison, **aucun nom
de marque** en jeu). À utiliser quand on étendra le catalogue (chaque pièce portera un `tier`).

## 2. Stack (versions épinglées, compat vérifiée)

| Domaine | Paquet | Version |
|---|---|---|
| Build | vite | 8.0.16 |
| | @vitejs/plugin-react | 6.0.2 |
| UI | react / react-dom | 19.2.7 |
| 3D | three | 0.184.0 |
| | @react-three/fiber | 9.6.1 |
| | @react-three/drei | 10.7.7 |
| Physique | @react-three/rapier | 2.2.0 (Rapier, WASM) |
| Rendu | @react-three/postprocessing | 3.0.4 |
| | postprocessing | 6.39.1 |
| État | zustand | 5.0.14 |
| Réglage live | leva | 0.10.1 |
| Bruit (terrain) | simplex-noise | 4.0.3 |
| Lang | typescript | 6.0.3 (pinné < 6.1 pour typescript-eslint) |
| Lint/format | eslint 10.5.0 (flat config) + typescript-eslint 8.61.1 + prettier 3.8.4 |

**Contrainte de compat à respecter** : R3F 9.x exige React `>=19 <19.3` → ne pas monter React ≥ 19.3.
drei/rapier/postprocessing exigent R3F ^9 + React ^19 + three ≥ 0.156. typescript-eslint 8.x exige TS `< 6.1`.

## 3. Toolchain (IMPORTANT — machine sans Node système)

- **Pas de Node système.** Node **22.23.0 LTS portable** est dans **`tools/node/`** (gitignored).
- **Ne pas utiliser winget** (il crashe PowerShell sur cette machine).
- Lancer npm/vite via le binaire portable depuis le **Bash tool** :
  ```bash
  export PATH="/c/Users/arnom/Desktop/Missionary/tools/node:$PATH"
  node tools/node/node_modules/npm/bin/npm-cli.js install      # install
  node tools/node/node_modules/npm/bin/npm-cli.js run build     # tsc --noEmit + vite build
  node tools/node/node_modules/npm/bin/npm-cli.js run dev       # serveur de dev
  ```
- **Preview** : `.claude/launch.json` (config `skycrate`) lance Vite via le node portable sur le port 5173.
  Utiliser l'outil `preview_start` (PAS `npm run dev` en Bash) pour piloter le panneau de preview.
- ⚠️ Vite 8 (rolldown) et ESLint 10 exigent Node `^20.19 || ^22.13 || >=24` — d'où le Node 22 portable.
  Si on réinstalle sous un Node trop vieux, le binding natif `@rolldown/binding-win32-x64-msvc` est sauté → build KO.

## 4. Conventions de code

- **TypeScript strict** (`strict`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`).
- Prettier : pas de `;`, single quotes, trailing commas `all`, largeur 100.
- ESLint flat config (`eslint.config.js`).
- **Architecture modulaire** (dossier §15), déjà en place dans `src/` :
  ```
  src/core/{physics,parts,assembly,flight,economy,missions,cargo,world,save}
  src/{modes,ui,scenes,store,assets}
  ```
- **Données des pièces = JSON/TS typé** dans `core/parts/`, JAMAIS en dur dans la logique
  (`lift, drag, weight, fuel, fuelUsage, strength, cargo, cost, researchCost`).
  **Échelles : `fuel ×100`, `strength ×100`.**
- Toute valeur absente du dossier → l'**exposer dans leva** (ne pas la deviner en dur) et le signaler à l'utilisateur.

## 5. Règles de fidélité NON négociables (cœur — section 5 du brief)

1. **Référence directionnelle = le MOTEUR**, pas le cockpit (caméra + sens des commandes suivent le moteur principal). Config propulsive ⇒ commandes inversées.
2. **Moteurs** : états plein / arrêt / inverse, + limite de poussée max réglable par moteur. Conso = `Σ fuelUsage` des moteurs actifs × dt.
3. **PAS DE FREINS** : au sol, seuls friction + inverse de poussée ralentissent.
4. **Aéro forfaitaire** : portance et traînée = valeurs fixes par pièce (pas de Cl/Cd, pas de surface alaire). Plus de poids ⇒ plus de portance requise + accélération plus lente.
5. **Rupture structurelle** : aile casse si `vitesse > strength × 100` (m/s) ; alerte visuelle à **80 %** du seuil.
6. **Carburant** : avion de base = `fuel 1` (=100 unités) et `0,05 electric charge`. Réservoirs (et certaines ailes) ajoutent du fuel ×100.
7. **Économie 2 monnaies** : coins = budget de construction **remboursé** au retrait d'une pièce (plafond, pas une conso) ; scrap = monnaie de recherche.
8. **Éditeur** : pièces préfabriquées ; seul le **fuselage est déformable** ; rotation snap 90°/45°/libre ; `Del` supprime ; `Ctrl+Z` annule (1 pas).
9. **Cargo** : volume requis ≠ poids ; périssables (timer, reset au chargement) ; fragiles (cassent à l'impact dur). Cargo gratuit.
10. **Hors-limites** : approche d'une zone interdite ⇒ avertissement puis timer ; à zéro, l'avion est désassemblé.

**Convention monde** : temps + soleil **figés** ; le **soleil = NORD** (seul repère de cap). Lumière directionnelle fixe.

## 6. Commandes

```bash
npm run dev        # serveur de dev (Vite)
npm run build      # tsc --noEmit + build prod
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run format     # prettier --write
```
(à lancer via le node portable, cf. §3)

## 7. État d'avancement des jalons

- **Jalon 1 — « ça vole »** *(en cours)*
  - [x] **Étape 0** — init projet : scaffold Vite+React+TS strict, deps 3D/physique/post-process/leva/zustand,
        ESLint+Prettier, arborescence §15, toolchain Node 22 portable, scène 3D de boot (caisse + sol + soleil),
        build/typecheck/lint/dev OK.
  - [x] **Étape 1** — base de rendu §3 : tone mapping ACES + exposition (leva), ciel dégradé (dôme ShaderMaterial) + fog assorti horizon, **ombres douces VSM** (PCSS/drei `<SoftShadows>` cassé sur three 0.184), post-process N8AO + bloom + vignette + MSAA, soleil fixe = **nord** formalisé (`core/world/orientation.ts`). Décor low-poly placeholder (piste + arbres instanciés + collines). typecheck/lint/build OK, rendu validé en preview.
  - [x] **Étape 2** — données pièces typées (`core/parts`) : union discriminée par catégorie (fuselage/aile/stab/moteur/train), échelles `fuel ×100` / `strength ×100` + helpers (`fuelUnits`, `snapSpeedMs`, `structuralWarningSpeedMs`), catalogue de démarrage J1 + index (`PARTS`, `getPart`, `getPartsByCategory`). Valeurs ✅ du dossier (wood `fuelUsage 2`, base `fuel 1`/`elec 0,05`, aile `strength 2,25`) vs 🟡 provisoires (masses/coûts/lift/drag/thrust) flaggées dans le catalogue.
  - [x] **Étape 3** — assemblage en dur de l'avion. `core/assembly` : `PlaneAssembly`/`PlacedPart` (repère local nez=-Z), `J1_PLANE` (fuselage+aile+stab+moteur+train), `aggregateStats()` (masse, fuel, lift/drag, poussée, moteurs, `snapSpeedMs`/`warningSpeedMs` = min strength ×100) — base de l'étape 4. Rendu low-poly procédural par catégorie (`scenes/Plane.tsx`), avion posé sur la piste, nez au nord. Caméra par défaut rapprochée. (Rapier/physique = étape 4, donc encore `frameloop="demand"`.)
  - [x] **Étape 4** — physique de vol Rapier. `<Physics>` + sol collider + `PlaneRig` (RigidBody, collider composé, masse = Σ poids). Forces/frame **au centre de masse** (`core/physics/aero.ts`) : gravité×masse (Rapier), portance/traînée forfaitaires ×f(v), poussée plein/off/inverse + limite max. Friction de **roulement** faible (pas de freins, règle 3). Input clavier W/↑ plein, S/↓ inverse (`core/flight/input.ts`). Panneau leva « Vol » (≈ étape 7 anticipée). `frameloop="always"`. Vérifié : repos → roulage/accél → décollage ~30 m/s → montée bornée → moteur coupé → plané/descente, sans NaN.
  - [x] **Étape 5** — avion pilotable + caméra référencée moteur (règle 1). Rotations déverrouillées + **couples de contrôle** (repère local : X tangage, Y lacet, Z roulis) via `core/flight/input.ts` (W/S tangage, A/D roulis, Q/E lacet, Shift plein, C inverse). **Caméra 3ᵉ personne** accrochée à l'orientation du moteur (`engineReferenceForward` dans `core/assembly/reference.ts` → -Z pour le J1 ; une config propulsive retournera caméra+ressenti des commandes). **CCD activé** sur l'avion + sol collider épaissi (anti-tunneling à grande vitesse). Vérifié : décollage, tangage/roulis/lacet réactifs, caméra qui suit, pas de tunneling.
  - [x] **Étape 5b** — REFONTE physique réaliste **par surfaces** (remplace les couples directs). `core/physics/aerodynamics.ts` : chaque surface (`core/assembly/surfaces.ts` : 2 demi-ailes, stab, dérive) calcule portance/traînée selon son **incidence locale** (vitesse du point = v + ω×r) et applique sa force **à son point** ⇒ stabilité, contrôle et amortissement émergents. **Gouvernes** (élévateur/ailerons/gouvernail) défléchies par l'input, **animées** (`controlsContext` + `ControlFlap`) et synchronisées. **Collider composé par pièce** (masse = poids ⇒ centre de masse/inertie réalistes). Conséquences validées : trim auto (AoA ↓ quand v ↑), **vitesse bornée par la traînée**, plus d'explosion de portance.
  - [x] **Étape 5c** — traînée géométrique + visualisation. `DragPanelDef`/`computePanelDrag` (`aerodynamics.ts`) : faces du corps (`J1_DRAG_PANELS` : fuselage + disque moteur) traînant selon l'**aire projetée face au vent** (`max(0, n·v̂)`) ⇒ traînée dépendante de la géométrie/orientation (frontal vs travers). Bouton leva « zones exposées » → `AirflowPanels` colore un quad par panneau **vert** (parallèle/aéro) → **rouge** (⟂ flux). Calibré : décollage ~49 m/s, vitesse bornée par la traînée (~50-60), poussée finie. ✅ Jalon 1 « ça vole » atteint.
  - [x] **Étape 5d** — feel & jouabilité. (A) **enveloppe élargie** (décollage ~30 m/s, vitesses bien plus hautes). (B) aéro/poussée/assistance en **pas fixe** (`useBeforePhysicsStep`) ⇒ boucle de contrôle stable. (E) **assistance auto-steer** (`core/flight/assist.ts`, ON par défaut) : amortissement des taux + **maintien d'attitude** (cible capturée au lâché ⇒ l'avion **garde sa direction**, NE se remet PAS à plat — contre la stabilité aéro naturelle) + **bornes** (`maxPitch`/`maxBank`, `limitGain`) + **anti-décrochage** (bride l'AoA, gaté par la vitesse air). (C) **ailes en bandes** d'envergure (`halfWingStrips`, 4/demi-aile) ⇒ roulis lisse, ailerons progressifs. (D) **chute Cl post-décrochage** nette + **marge statique réglable** (`cgShift` leva). `levelReturn`/`altHold` = options à 0. ⚠️ Bug réglé : l'anti-décrochage prenait l'AoA aberrante du spawn (vent avant ≈ 0) ⇒ backflip ; gaté par la vitesse.
  - [x] **Étape 6** — carburant + rupture structurelle + HUD. **Carburant** : `fuel ×100` (J1 = 100 u), conso = Σ `fuelUsage` × |throttle| × dt ; à sec ⇒ moteur coupé (`PANNE SÈCHE`). **Rupture** : si `vitesse > snapSpeedMs` (= min strength ×100 = 225 m/s pour le J1) ⇒ l'aile ne porte plus + se **détache** (corps physique `DetachedWing` lâché avec la vitesse capturée), alerte `AILE CASSÉE`. Alerte **survitesse** à 80 % (`warningSpeedMs`). **HUD** (`ui/Hud.tsx`, overlay DOM ← store zustand `store/hud.ts`) : vitesse, altitude, jauge carburant, alertes. **Reset (R)**. ⚠️ Pour le J1 la traînée plafonne la vitesse ~140 m/s ⇒ rupture (225) inatteignable sans meilleurs moteurs (réaliste) ; testée en baissant `strength` temporairement.
  - [x] Étape 7 — panneau leva (de fait livré au fil des étapes 4/5/5d : panneau « Vol » = gravité, densité/traînées, poussée, friction, assistance, gouvernes, marge statique ; `masse`/`conso` = catalogue de pièces).
  - [x] Étape 8 — critères J1 validés (rouler/décoller/voler, aile casse > strength×100, moteur coupé = plané, tout réglable leva).
- **Jalon 1 « ça vole » ✅ terminé.**

- **Jalon 2 — éditeur (construire→voler→ajuster)** *(en cours)*
  - [x] **2-A — pont éditeur→physique générique.** Le vol ne lit plus de hardcodé : tout est **compilé depuis un graphe de pièces**.
    - **Graphe** (`core/build/graph.ts`) : `Aircraft` = arbre de `PartNode` (racine=fuselage, transform RELATIVE au parent, `settings` d'instance : `engineReversed`/`thrustLimit`/`controlAxis`). Sérialisable (save/load).
    - **Blueprints** (`core/parts/blueprints.ts`) : chaque pièce déclare en repère LOCAL ses `colliders`, `surfaces` portantes (subdivisées en bandes par le compilateur), `dragPanels`, `engine` (dir/point), `mounts` (pour le snapping 2-C).
    - **`compileAircraft`** (`core/build/compile.ts`) : aplatit l'arbre (compose les transforms) → `CompiledAircraft` { placed (visuel), surfaces (repère avion, bandes + `controlKey` dérivé : aile x<0→aileronL, x>0→aileronR, stab→élévateur, vertical→gouvernail), dragPanels, colliders (compound, masse/CG/inertie), engines (poussée par moteur à son point), referenceForward (moteur principal), stats }.
    - **`PlaneRig` générique** : prop `aircraft: CompiledAircraft` ; poussée appliquée **par moteur** à son point. Plus aucun `J1_*` en dur (fichiers `surfaces.ts`/`plane.ts`/`reference.ts` supprimés).
    - **Validation** : le J1 exprimé en graphe (`core/build/j1.ts`) recompilé **vole à l'identique** (décollage ~30, AoA auto-trim, roulis/ailerons OK, snap 225, fuel/HUD, pas de backflip).
  - [x] **2-B — hangar (mode + scène + UI).** Store `store/build.ts` (zustand) : graphe `aircraft` + `mode` ('hangar'/'flight') + `selectedPartId`. App **bascule** : `HangarScene` (studio + grille drei `<Grid>` + caméra orbitale `<OrbitControls>` + build affiché depuis `compiled.placed` via `Plane`, pas de physique) ou `FlightScene` (monde + Rapier + `PlaneRig`). UI : `PartsPalette` (onglets catégorie ← `core/parts`, coût), `StatsPanel` (poids/fuel/cargo/poussée/rupture/coût, `totalCargo` ajouté à `aggregateStats`), `ModeToggle` (« Vol d'essai » ↔ « Retour hangar »). Vérifié : hangar rendu, bascule bidirectionnelle, le vol pilote bien l'avion compilé.
  - [x] **2-C — snapping / pose interactive.** L'éditeur devient vraiment manipulable.
    - **Mounts** (`core/parts/blueprints.ts`) : points d'accroche en repère LOCAL (`position`+`normal`). Fuselage (6 : nez/aile/queue/ventre/dessus av/ar), aile (3 : 2 bouts + dessus). `compileAircraft` les exporte en repère avion (`CompiledMount` : `hostNodeId` + `localPosition`/`localNormal` + `position`/`normal` avion) ; les colliders portent désormais leur `nodeId` (sélection).
    - **`HangarEditor`** (`scenes/HangarEditor.tsx`, dans `HangarScene`) : pièce de palette sélectionnée ⇒ **marqueurs de mounts** (sphères vertes, jaune au survol) + **fantôme** (`GhostPlane` : vrai modèle translucide vert, compilé depuis un graphe temporaire ⇒ WYSIWYG exact) ; **clic = pose** (enfant du host à `localPosition`). Sinon ⇒ **boîtes de sélection** par collider (clic = `selectNode`) + **surlignage** du sous-arbre sélectionné (arêtes drei `<Edges>`, jaune = pièce, bleu = enfants).
    - **Rotation snap** : `R` = +90° / `Maj+R` = +45° **autour de la normale du mount** (`rotationForMount` → Euler relatif). `Suppr`/`Backspace` = `removeNode` (pièce + sous-arbre), `Ctrl/⌘+Z` = `undo` (un seul pas), `Échap` = désélection. Connectivité garantie par l'arbre.
    - **Store** (`store/build.ts`) : `addPart(parent, partId, position, rotation?)`, `removeNode` (jamais la racine), `undo` (snapshot `past` un pas), `selectNode`/`selectPart`. `EditorHint` (bas-centre) = aide contextuelle.
    - **Validation** (preview) : marqueurs + hint ✅, fantôme correctement snappé ✅, pose (stats poids/coût ↑, auto-sélection) ✅, `R` → rotation `[π/2,0,0]` autour de la normale ✅, sélection + surlignage ✅, `Suppr`/`Ctrl+Z` ✅. Télémétrie DEV `window.__hangar` (store + `project()`), comme `window.__plane`.
  - [x] **2-D — budget coins (plafond remboursable, règle 7).** Les coins = **plafond** de construction, PAS une conso : chaque pièce immobilise son `cost`, le retrait **rembourse** intégralement (automatique : `available = budget − Σ cost`).
    - **Domaine** `core/economy` (`coins.ts`) : `DEFAULT_COINS_BUDGET` (🟡 hors dossier, « petit budget » non chiffré → leva), `coinsAvailable`, `canAfford`. `aggregateStats` expose désormais `totalCost` (Σ `cost`).
    - **Leva** `useEconomyTunables` (« Économie › budget (coins) », défaut 500) ; App calcule `available = coinsAvailable(budget, stats.totalCost)` et le diffuse (HangarScene→`HangarEditor`, `PartsPalette`, `StatsPanel`).
    - **UI/garde** : `StatsPanel` chip **COINS** = `dispo / budget` (rouge si ≤ 0), + chip COÛT (= `totalCost`). `PartsPalette` **grise + désactive** toute pièce dont `cost > available`. `HangarEditor.placeAt` refuse la pose si `!canAfford` (garde-fou). Pas de monnaie « scrap » ni de recherche ici (Jalon recherche plus tard).
    - **Validation** (preview) : J1 = COÛT 310 / COINS 190/500 ✅ ; dépense → grisage (aile 80 désactivée à dispo 30, train 30 OK à 30) ✅ ; surbudget → chip rouge « -50/500 » ✅ ; retrait → remboursement (−50 → +30) ✅.
  - [x] **2-E — réglages moteur par pièce.** Inspecteur de la pièce sélectionnée (`ui/PartInspector.tsx`, haut-droite) écrivant dans `node.settings`. Recompilé à la volée ⇒ effet immédiat. **Moteur** (règles 1-2) : sens **Normal/Inversé** (`engineReversed`) ⇒ `compile` retourne la poussée ET `referenceForward` (caméra + commandes suivent le moteur) ; **Poussée max** 0-100 % (`thrustLimit`) ⇒ `engine.limit`. `updateSettings(nodeId, patch)` = réglage « live » (ne touche pas `past`). Bouton « Retirer la pièce » (masqué pour la racine). Validé preview : inverse → `dir`/`referenceForward` `-Z`→`+Z` ✅, `thrustLimit 0.5` → `limit 0.5` ✅. *(L'« axe de gouverne » `controlAxis` initialement ajouté a été retiré à la demande de l'utilisateur ; champ laissé inerte dans `PartSettings`.)*
  - [x] **2-G-bis — gizmo transform + miroir (manipulation façon Aviassembly).** La pièce sélectionnée se manipule au **gizmo** ; la physique suit (recompile).
    - **Gizmo** (`scenes/TransformGizmo.tsx`, drei `<TransformControls>`) : **Déplacer** (flèches XYZ, repère monde) / **Tourner** (sphère d'axes 3 anneaux, repère local). Manipule un proxy au transform MONDE de la pièce ; `commit` reconvertit en LOCAL (sous le parent) → `updateNode` → recompile (surfaces/colliders/CG suivent). OrbitControls coupé pendant le drag ; `pushHistory` au début du drag (1 undo / drag). **Snap** d'angle 90°/45°/Libre (règle 8).
    - **Compile** : `CompiledAircraft.transforms` (Map nodeId→{pos,quat} repère avion) + `worldTransforms` exporté (gizmo + miroir).
    - **Miroir** (`core/build/mirror.ts`, `computeTwin`) : symétrie plan **X=0**. Pose (`addPart`) + déplacement (`updateNode`) génèrent/maj un **jumeau** (`mirrorId`) — position.x négée, quaternion `(x,−y,−z,w)`, parenté au miroir du parent. Retrait supprime la paire. Sur l'axe (|x|<`MIRROR_EPS`) ⇒ pas de jumeau.
    - **UI** : `ui/EditorTools.tsx` (bas-gauche) = Déplacer/Tourner + Snap + **Miroir ON/OFF**. Store : `transformMode`/`rotateSnapDeg`/`mirror` + `updateNode`/`pushHistory`.
    - **Validé preview** : translate/rotate affichés ✅ ; rotation aile 0.5 rad → normale surface `[0,0.878,0.479]` + collider tournés (physique suit) ✅ ; miroir pose moteur `[3.5,0,0]`→jumeau `[-3.5,0,0]` ✅ ; déplacement `[3,1,0.5]`→jumeau `[-3,1,0.5]`, roll `[0,0,0.4]`→jumeau `[0,0,-0.4]` ✅.
    - 🟡 Reste à faire : **snap de translation** (faire « s'emboiter » une pièce déplacée sur un mount voisin, avec re-parentage) ; polish chevauchement chip COINS ↔ widget leva (2-G).
  - [x] **2-H — pièces à un côté + miroir réflexif + élevons (refonte demandée).** Plus de pièces « 2 côtés » : on pose une demi-pièce, le **Miroir** crée l'autre.
    - **Catalogue** : `wing.mk1` = **demi-aile** (une par côté) ; empennage **scindé** en `stabilizer.mk1` (demi-stab horizontal, profondeur) + `fin.mk1` (dérive verticale, lacet). Stats halvées (la paire ≈ ancien combiné).
    - **Miroir réflexif** : une demi-pièce est **`handed`** (blueprint) ⇒ le jumeau est la **géométrie reflétée** (plan X local), pas une simple rotation. Nœud `mirrored:true` ⇒ `compile` négocie la composante x de TOUTE la géométrie (colliders/surfaces/mounts/dragPanels/moteur) avant la transform monde ; visuel rendu `scale.x=-1`. Les `handed` se mirrorent **même sur l'axe** (les ailes du J1 sont à la racine x=0). Clé de gouverne L/R **résolue au repère avion** (`p.x<0`→aileronL).
    - **Élevons** : les gouvernes d'aile font tangage + roulis (`PlaneRig` : `aileronL/R += roulis ± élevon`), gain leva `wingElevon` (0.6).
    - **J1 reconstruit** : 2 demi-ailes (paire miroir) + 2 demi-stabs (paire) + 1 dérive + moteur + train.
    - **Validé preview** : J1 rendu identique (paires) et **vole** (décolle, monte ; `bank 0` = pas d'asymétrie de roulis) ✅ ; aile miroir gauche `normal.y=+1` (portance vers le haut, non inversée) + `aileronL` ✅ ; pose 1 aile en Miroir ON → **paire** (4+4 bandes, normales +Y) ✅.
    - 🟡 Trim un peu cabré avec la nouvelle géométrie (borné par `maxPitch`) — à recalibrer au feeling.
  - [x] **2-I — snap par SURFACE (pose « partout au contact »).** Fini les points d'accroche discrets : on pose une pièce **n'importe où sur une autre** (raycast sur les boîtes de pièces, qui portent leur `nodeId`). `HangarEditor` : `onPointerMove` sur une boîte ⇒ `SurfaceHit` {nodeId, point monde, normale monde (`face.normal`→`transformDirection`)} ; `placementOnSurface` oriente la pièce **+Y le long de la normale**, la décale de `attachOffset` (= distance origine→face inférieure des colliders) pour la poser DESSUS, applique le pivot `R` autour de la normale ; fantôme WYSIWYG (compile temp) ; clic ⇒ `addPart(host, …)` (enfant de la pièce touchée, miroir géré). Marqueurs de mounts supprimés.
    - **Validé preview** : helper DEV `__hangar.placeOnSurface(part,node,point,normale)` → moteur posé sur le dessus du fuselage (`pos [0,0.97,-1]` = surface y=0.475 + demi-hauteur, poussée `-Z` conservée) ✅ ; raycast brut au point survolé → boîte fuselage (`onPointerMove`), `point` sur la surface + `normale [0,1,0]` ✅ (les events synthétiques R3F ne déclenchent pas le hover ⇒ vérif par helper + raycast brut, le chemin souris réel est standard).
  - [x] **2-F — save / load.** `core/save` (`storage.ts`) : `serializeAircraft` (`{version,aircraft}` JSON) + `parseAircraft` → **validation** (racine présente, `getPart` sur chaque pièce, parents existants) avant injection ⇒ un graphe corrompu n'entre jamais dans l'éditeur. Slots **localStorage** (`skycrate.save.<nom>` : `saveToSlot`/`loadFromSlot`/`listSaves`/`deleteSlot`) + **export/import** fichier `.json` (`downloadAircraft` / `FileReader`). UI `ui/SaveLoadPanel.tsx` (bas-droite, repliable) : nom + Sauver, liste des slots (Charger/Supprimer), Exporter/Importer. Chargement via `setAircraft` (budget réévalué tout seul dans le bandeau). Validé preview : sauver → slot localStorage (v1, 8 nœuds) ✅ ; modifier (9) puis Charger → restauré (8) ✅ ; slot corrompu (pièce inconnue) → graphe **inchangé** (rejet) ✅.
  - [ ] 2-G transition polish (chevauchement chip COINS ↔ leva ; recalibrage trim ; ressenti vol).

- **Jalon 3 — catalogue par tiers** *(en cours)* — réf. [`docs/catalogue-pieces.md`](./docs/catalogue-pieces.md). Pièces génériques calibrées sur de vrais avions (silhouettes maison, **aucun nom de marque**).
  - [x] **3-A — modèle & échelle.** `Tier` (`T0`..`T7`) requis sur `BasePart` ; `EngineKind` élargi (turboprop/turbofan/afterburner). 6 pièces de départ taguées `T0`. `PartsPalette` : badge de tier + tri par palier.
  - [x] **3-B — ailes (planformes).** Champ `WingPlanform` (`straight/tapered/laminar/swept/delta/biplane`). 4 nouvelles demi-ailes : `wing.tapered` (T1), `wing.laminar` (T3), `wing.swept` (T4), `wing.delta` (T5) — caractère (portance basse vitesse, traînée, snap) porté par les **surfaces du blueprint** (area/liftSlope/stallAngle/zeroLiftDrag) + stats. **Silhouettes procédurales** (`scenes/Plane.tsx` : `useWingGeometry` extrude le contour de la planforme ; `straight` garde le caisson + élevon animé du J1). Validé preview : 5 ailes dans la palette (badges T0/T1/T3/T4/T5), delta posée = silhouette triangulaire, bandes/normales (+Y) OK.
  - [x] **3-C — moteurs (par type).** 5 nouveaux moteurs : `engine.piston` (T1), `engine.turboprop` (T2), `engine.turbofan` (T4), `engine.afterburner` (T5), `engine.rocket` (T7, empilable). Caractère via couple poussée/conso (réf. catalogue). **Postcombustion** : `afterburner: {thrustMult, fuelMult}` sur la pièce → `EngineInstance` ; input **Espace** (`boost`) → `PlaneRig` multiplie poussée (×2.2) ET conso (×6) sur les moteurs équipés, seulement gaz vers l'avant. **Silhouettes** par `kind` (`scenes/Plane.tsx` : hélice 2/4 pales pour piston/turboprop ; nacelle + tuyère + lueur d'échappement pour jets/fusée). Validé preview : 6 moteurs (badges T0-T7), afterburner compilé (`thrust 130`, mult ×2.2/×6), nacelle jet rendue.
  - [x] **3-G — hangar juice & polish designs.** **Centre de gravité** : `compile.centerOfMass` (barycentre des colliders pondéré = ce que Rapier calcule) → marqueur boule jaune toujours visible dans le hangar (`HangarEditor`). **Hélices animées** : `store/throttle` (régime 0..1 + boost partagés) ; `ui/ThrottleGauge` (hangar, jauge + bouton PC) ; `PlaneRig` publie le régime/boost réel en vol ; `SpinningProp` tourne ∝ régime. **Postcombustion animée** : `JetExhaust` (lueur ∝ régime + flamme cône qui s'allonge/scintille ; `flame='pc'` PC, `'always'` fusée). **Designs différenciés** par `kind` (radial/piston/turboprop/turbofan/afterburner/fusée, chacun sa silhouette). Validé preview : CG `[0,-0.04,-0.13]` + marqueur ; jauge+PC ; flamme orientée arrière ; moteurs distincts.
  - [x] **3-G-bis — refonte graphique ailes + correctifs jets (retours utilisateur).**
    - **Ailes** : vrai **profil cambré loft** (`AIRFOIL` extrudé puis sculpté sur 14 stations : `chordAt` effilement+arrondi de saumon, dièdre, flèche) ⇒ **extrados visible** (fix winding inversé par le swap corde↔envergure). **Identité par planforme** calée sur de vrais avions : droite=toile WWI (nervures chordwise, saumon arrondi), effilée=Cessna (dièdre, saumon arrondi), laminaire=P-51 (fine, métal poli), flèche=737 (**winglet**), delta=chasse (bout pointu). **Feux de nav** au saumon (vert tribord / rouge bâbord miroir). Aileron affleurant qui suit dièdre/flèche.
    - **Jets** : lèvre d'entrée = vrai anneau (torus remis droit) ; turbofan = **conduit ouvert** (soufflante visible) **sans lueur** de combustion ; turboréacteur PC = anneaux de chambre + **tuyère convergente à facettes**. `JetExhaust` : lueur seulement à régime > 0.
  - [x] **3-D — fuselages & cabines.** Nouvelle catégorie **`cabin`** (source de cargo, plusieurs autorisées) : `cabin.cockpit` (T1, verrière), `cabin.cargo` (T2, soute), `cabin.passenger` (T4, tube à hublots) — `CabinPart {kind, cargo}` ; `aggregateStats` ajoute leur cargo. **Fuselages par taille** (`FuselageSize` small/medium/large) : `fuselage.medium` (T1), `fuselage.large` (T2, gros porteur + rampe cargo) — plus de fuel/cargo mais plus lourds. Visuels détaillés (`scenes/Plane.tsx`) : cockpit = coaming + verrière bombée + arceaux ; soute = caisson + porte + nervures ; passagers = tube clair + 2 rangées de hublots + porte ; gros fuselage = corps large + cône de queue + quille + rampe. Onglet **Cabine** dans la palette. Validé preview : CARGO 28 (cabines), FUEL/POIDS suivent les fuselages, silhouettes distinctes. 🟡 Limite : la racine reste `fuselage.mk1` (pas de swap de racine) ⇒ les gros fuselages se posent en module ; swap de racine à voir plus tard. **🔁 À RETRAVAILLER** (designs cabines/fuselages pas validés par l'utilisateur — repasse graphique + swap de racine).
  - [x] **3-E — train rétractable.** `LandingGearPart.retractable` ; `landingGear.retract` (T3, plus lourd, **pas de dragPanel** = traînée quasi nulle) vs `landingGear.mk1` (fixe, dragPanel des roues exposées). **Rétraction animée** (`scenes/Plane.tsx` `LandingGearModel`) : lit l'altitude HUD (`useHud`), remonte les roues dans le ventre + bascule, laisse les **trappes** ; `PlaneRig` remet l'altitude à 0 au retour hangar (train ressorti). Validé preview : à alt 14 le rétractable se rentre (trappes visibles), le fixe reste sorti. 🟡 **Empennages conv./T/V** reportés (un V-tail demande un mixage ruddervator profondeur+lacet ; faisable au gizmo en attendant).
  - [ ] 3-F calibration leva des ratios inter-tiers.

- **Jalon 3+ — monde ouvert à relief & biomes continus** *(en cours)* — divergence assumée vs Aviassembly :
  **continent continu** (biomes fondus, façon Minecraft) bordé d'océan, pas un archipel. Procédural **seedé**
  (un seed = un monde) + curation par-dessus (aérodromes, landmarks). Un « monde minimal v1 » à îles plates a
  servi de checkpoint (commit `76108a6`) avant remplacement.
  - [x] **3+A — terrain à relief (chunké, seedé, leva).** `core/rng.ts` (mulberry32 déplacé depuis scenes),
    `core/world/noise.ts` (fBm simplex seedé), `core/world/terrain.ts` (`makeTerrain(params).heightAt(x,z)` :
    collines fBm ±hillHeight + massifs = masque basse fréquence **remappé smoothstep** × crêtes `1-|fBm|`
    + fondu côtier radial wobblé + **pad du spawn aplani** à TOP_Y rayon 150/fondu 110 — curation temporaire
    jusqu'au flatten 3+D). Rendu `scenes/Terrain.tsx` : **chunks 256 m** streamés autour de la caméra
    (budget 3 géométries/frame, décharge + dispose), **LOD 2 niveaux** (64 quads < 650 m, 32 au-delà),
    couleurs de sommets altitude/pente (sable→herbe→roche sur pente→neige > snowLine — placeholder lisible,
    vrais biomes = 3+C), matériau partagé flatShading. `World.tsx` = océan + chunks + piste ; `world.ts`
    réduit (aéroport de départ seul, les autres reviennent en 3+D). Leva « Monde » : seed + tous les params.
    **Colliders 3+A = pad spawn + océan seulement** (heightfields = 3+E ⇒ se poser hors pad traverse, assumé).
    Vérifié (seed 20260707) : spawn plat 0.00, sommet max 118 m à (840,−1120), 81 % terre, 10 % montagne,
    12.8 % > ligne de neige ; côte + plage + massifs rocheux rendus en vol ; 0 erreur console ; build prod OK.
  - [x] **3+B — eau (océan + lacs).** L'essentiel existait par construction (nappe d'eau globale à SEA_Y :
    tout creux sous −3 se remplit) mais un check data a montré **0,01 %** d'eau intérieure (les « lacs » vus
    étaient des baies côtières). Ajouts minimaux : (1) **champ de bassins** (`terrain.ts` : fBm seed+404,
    masque smoothstep 0.6-0.78 × `lakeDepth` soustrait au relief — en plaine ça passe sous la mer = lac, en
    altitude ça ne fait qu'une vallée) + leva « lacs » (λ 700 / creusement 12) ; (2) **teinte de profondeur** :
    océan semi-transparent (opacity 0.82) + fond immergé teinté sable→vase (`rampColor`) + plan de fond marin
    opaque sous le large (sinon le ciel transparaîtrait). Vérifié (seed 20260707) : **1,02 %** d'eau
    intérieure, **15 zones lacustres**, lac le plus profond −12,9 m à (−150,−825) ; spawn 0.00 et sommet 118 m
    intacts ; capture en vol = lac aux berges sableuses, eau claire hauts-fonds / sombre au large ; 0 erreur.
  - [x] **3+C — biomes continus (climat température × humidité, végétation instanciée).**
    - **Climat** (`terrain.ts` : `climateAt(x,z,h?)`) : température = fBm (seed+505) **remappé biaisé chaud**
      (smoothstep −0.9..0.55 — le grand froid est rare au sol) **− lapse × altitude** (0.0045/m ⇒ seuls les
      sommets atteignent les températures de neige : pics blancs garantis sans moitié de monde enneigée) ;
      humidité = fBm indépendant (seed+606, remap symétrique). ⚠️ Deux pièges résolus par la data : fBm brut
      ⇒ désert quasi inexistant (extrêmes jamais atteints → remap) ; lapse fort + remap symétrique ⇒ 40 % de
      neige (plaines froides ≈ sommets → biais chaud).
    - **Sol** (`Terrain.tsx` `rampColor`) : blend **bilinéaire** 4 pôles (steppe froide-sèche / désert
      chaud-sec / boréal froid-humide / luxuriant chaud-humide, palette) — continu par construction, zéro
      frontière. Axe humidité de la couleur pondéré (smoothstep 0.15..0.6 : l'herbe reste verte jusqu'au
      vrai sec, sinon le spawn chaud virait savane). Neige **thermique** (`snowTemp` 0.08 leva, remplace
      snowLine) ; roche/plage/fond immergé inchangés.
    - **Végétation** (`scenes/Vegetation.tsx`) : instanciée streamée par chunk (256 m, rayon leva 900),
      placement déterministe (mulberry32(seed ⊕ cx ⊕ cz)), densités continues par climat — conifères (froid)
      / feuillus (chaud) en forêt (humide), cactus au désert, rochers pentes/désert/froid, poudrage neigeux
      des arbres par `setColorAt`. **6 draw calls** (InstancedMesh par archétype, cactus fusionné
      mergeGeometries). Rejets : eau/plage, pente > 0.45, zone spawn 300 m (décor Scenery dédié).
    - **Répartition (seed 20260707, data)** : prairie 36.8 % / forêt 38 % / désert 11.8 % / neige 13.3 % ;
      spawn T 0.68 / U 0.50 (prairie chaude ✓) ; T sommet 118 m = 0.07 (neige ✓). Cœurs : forêt (−300,−1260),
      désert (−240,−1740), plaine neigeuse (300,−1740). Vérifié preview : transitions fondues
      prairie→steppe, pics neigeux, côte/hauts-fonds, arbres ; 0 erreur console ; fps = baseline (13).
  - [x] **3+D — aérodromes parsemés (Poisson-disk + filtrage + flatten + pistes variées).**
    `core/world/airports.ts` : génération déterministe (seed+707) par **jets à distance minimale** (Poisson
    par rejet, spawn compris), **filtrage de site** (`probeSite` : 21 échantillons sur l'emprise ; rejet si
    immergé/plage, > `airportMaxAlt`, ou dénivelé > `airportFlatness` **× L/170** — tolérance proportionnelle
    sinon aucune 260 m n'existe) ; par site : **4 caps essayés** puis **repli vers une classe plus courte**
    (sinon rendement ~30 %). Classes 120/12, 170/14, 260/18. **Biome hérité** (`classifyBiome` = seuils de la
    végétation) + nom depuis une banque par biome (génériques). **`flattenForAirports`** enveloppe le terrain :
    rectangle orienté au cap (distance rounded-rect) fondu sur 60 m vers `padHeight` (= moyenne de l'emprise).
    **`buildWorld(params)`** mémoïsé par JSON-clé ⇒ World (rendu) et FlightScene (colliders) partagent
    l'instance. Rendu : `Runway` généralisé (y du pad) + **manche à air** ; végétation exclue des emprises
    (`inPad`) ; **colliders** : 1 cuboïde orienté par pad (on peut se poser sur chaque aérodrome, le relief
    hors pads reste sans collision → 3+E). Leva « aérodromes » : nombre 10 / espacement 700 / alt max 55 /
    tolérance 7. **Vérifié (seed 20260707, data)** : 8 aérodromes (2×120, 4×170, 2×260 ; forêt 6, désert 1,
    prairie 1), espacement min réel 702 m, **déviation piste/terrain 0.000** sur toutes les pistes, gen 137 ms ;
    manche à air visible au spawn ; 0 erreur console ; build OK. 🟡 Pas encore vérifié en jeu : atterrissage
    sur un pad généré (collider cohérent par construction) ; ~13 meshes de marquage par piste (merger si la
    passe perf le demande).
  - [x] **3+E — collisions terrain, découverte, carte, marqueur, hors-limites, landmark.**
    - **Heightfields Rapier par chunk** (`scenes/TerrainColliders.tsx`) : streamés autour de l'avion
      (rayon leva `physicsRadius` 500, budget 1/frame, décharge au-delà), matrice (64+1)² **column-major**
      (colonnes = X, lignes = Z), même résolution que le LOD visuel proche ⇒ surfaces identiques. Toggle leva
      `colliders (debug)` (⚠️ le rendu debug de ~13 heightfields tombe à ~3 fps sur HD 630 — outil de vérif,
      pas un mode de jeu). **Vérifié** : wireframe aligné au terrain ; roulage hors pad ⇒ avion porté par le
      relief (posé incliné alt 3, pitch −8°/bank −5°), aucune traversée ; fps = baseline (13).
    - **Découverte** (`store/world.ts` + `scenes/DiscoveryTracker.tsx`) : cellules survolées (128 m, voisinage
      3×3, ~2 Hz) + aérodromes découverts à < 350 m ; **persisté localStorage PAR SEED** (`skycrate.world.<seed>`),
      `ap.start` connu d'office. Vérifié : traînées des vols précédents visibles sur la carte, Bois-Noir II
      découvert par un vol antérieur.
    - **Carte (touche M)** (`ui/MapOverlay.tsx`) : fond peint avec `rampColor` (déplacée dans
      `scenes/terrainRamp.ts`, partagée terrain/carte) + profondeur d'eau, généré 230² à l'ouverture (~150 ms,
      mémoïsé par params) ; **brouillard de découverte** (cellules non visitées assombries), aérodromes
      découverts (point + axe de piste + nom), cercle rouge = bord du monde, flèche avion (position + cap,
      nord = haut = soleil), redraw 400 ms. **Clic = marqueur** (monde ← pixels, vérifié : centre → (−2,−2)) ;
      matérialisé en jeu par un **faisceau orange** vertical (`MarkerBeam`, World.tsx). Échap/M ferme.
    - **Hors-limites** (`ui/OutOfBounds.tsx`, règle 10) : au-delà de `worldRadius + 250` ⇒ alerte HUD rouge +
      compte à rebours 10 s (réarmé au demi-tour) ; à zéro ⇒ **désassemblage** = retour hangar. HUD store
      étendu (x/z/heading/oobSeconds — heading aussi utilisé par la flèche carte).
    - **Landmark** : **phare** rayé blanc/rouge (lanterne émissive) sur le cap côtier le plus avancé
      (`findCape`, déterministe par seed ; seed 20260707 → (2195, 289), promontoire 40 m plein EST) — les
      autres repères sont organiques (pic 118 m, grands lacs, côtes). 🟡 OOB non testé en vol (logique
      triviale relue) ; phare non vu en jeu (position vérifiée par data).
- **Jalon perf/optimisation ✅** — sélecteur « Rendu › qualité » (performance/équilibré/qualité, défaut
  performance) + ombres VSM par qualité (1024²/8 vs 2048²/20, `key={quality}` pour réallouer la map) +
  marquages de piste fusionnés. **Résultat : vol 13 → 58 fps, hangar 60 (cap vsync) sur HD 630.**
  Détails/coûts : voir §8 « Perf ». 🟡 Reste : redéploiement Vercel (les joueurs sont encore sur l'ancien build).
- **Lot S1-S6 (fonctionnalités & correctifs)** *(en cours — cadence : un chantier à la fois, feu vert utilisateur entre chaque)* :
  ordre validé S1 collisions sol → S2 throttle progressif/par moteur → S3 portance-trim → S4 refonte éditeur
  (page blanche/cockpits/fuselage adaptatif) → S5 aérodromes (ravitaillement + décor biome) → S6 menu paramètres.
  - [x] **S1 — collisions sol (« coups » fantômes) ✅.** Diagnostic par **sonde de contacts** (`scenes/contactProbe.ts`,
    DEV only, branchée `onContactForce` dans `PlaneRig` → `window.__contacts.summary()`) : roulage régulé 18 m/s
    scripté ⇒ 523 pics/3891 échantillons (13 %), bords de chunks surreprésentés ×9, pire coup **245× la médiane à
    direction horizontale pure** (mur invisible) = **arêtes internes** des triangles du heightfield + coutures entre
    chunks + coins de la boîte plate du train. Correctifs : (1) `TerrainColliders` recréé en **impératif**
    (`world.createCollider`, le composant r3/rapier ne transmet pas les flags) avec **`HeightFieldFlags.FIX_INTERNAL_EDGES`** ;
    (2) **roues = sphères** (`BpCollider.ball`, 3 balls alignées sur le visuel + boîte de structure ; masse de la pièce
    **répartie** entre colliders dans `compile` — sinon poids ×4) ; (3) **`contactSkin`** leva (« Vol › sol », 0.02) sur
    les colliders de l'avion. **Re-mesure (même protocole)** : pics 13 %→5,5 %, bords ×9→×1 (8/220), **classe « mur
    horizontal » disparue** (pire = 29× médiane, direction verticale = vraie bosse), 1,3 km de roulage continu sans
    accroc ; crash-test −20 m/s ⇒ rebond physique, avion intact, repos stable. Auto-collision : impossible par
    construction (un seul RigidBody). typecheck/lint/build OK.
  - [x] **S2 — throttle progressif, par moteur, PC crantée ✅.** Fini le on/off : la consigne est un **régime
    continu 0..1**. **Store** `store/throttle.ts` refondu : consigne (`master`/`linked`/`perEngine[nodeId]`/`reverse`)
    + réels d'animation (`actual[nodeId]` publié par `PlaneRig`, repli global `level`/`boost` pour le hangar).
    **Clavier** (`core/flight/input.ts`) : **Maj monte / Ctrl descend** (rampe au pas fixe dans `PlaneRig`,
    leva `rampe gaz` 0.55/s), **C maintenu = inverse de poussée** au régime courant ; Espace/boost supprimé.
    ⚠️ Ctrl+W = fermer l'onglet (irrécupérable côté web) ; les autres combos (Ctrl+S…) sont `preventDefault`.
    **PC crantée** : moteurs équipés → plage sèche normalisée sous le **cran** (leva `cran PC` 0.85, `dry=lvl/detent`),
    au-delà = PC (poussée ×2.2, conso ×6, gaz avant seulement). **Par moteur** : `EngineInstance.nodeId/partId`
    (compile), poussée/conso calculées par moteur ; `PlacedPart.nodeId` ⇒ hélices/flammes suivent CHAQUE moteur
    (`engineActual` dans `Plane.tsx`). **UI** `ui/ThrottlePanel.tsx` (vol, bas-gauche) : jauges verticales glissables —
    1 moteur = une jauge ; sinon maître « TOUS » + M1..Mn ; **cran/zone PC** dessinés, jauge orange quand PC ;
    glisser une individuelle **délie**, glisser la maître **re-lie** (+ bouton LIÉS/DÉLIÉS) ; badge INV. POUSSÉE ;
    clavier = rampe TOUS les moteurs (écarts conservés si délié). Reset R / retour hangar ⇒ `resetCommand()`.
    Jauge hangar (`ThrottleGauge`) inchangée (aperçu). **Validé preview** : rampe linéaire 0.55/s clamp 0..1 ✅,
    Ctrl −0.55/s ✅, C → `reverse` ✅, cran : 0.8 → M2 `dry 0.94` sans PC, 1.0 → **PC sur le seul moteur équipé** ✅,
    délié M2 0.35 / M1 1.0 ✅, panneau TOUS/M1/M2 + LIÉS rendu ✅, panne sèche par conso PC ×6 ✅. Build OK.
  - [x] **S3 — portance qui « ballonne » en accélérant ✅.** Diagnostic (trace de vol plein gaz, commandes
    neutres, assist ON) : la portance ∝ v² à incidence fixe ⇒ **phugoïde** non amortie (vy oscillait ±15 à ±30 m/s,
    montée en yo-yo). Deux leviers, tous deux en leva :
    - **`altHold` (assistance) passé de 0 → 12 par défaut** (renommé « maintien palier ») : couple d'amortissement
      `-altHold·vy·(1−|input.pitch|)` (déjà dans `core/flight/assist.ts`, était une option à 0). Gaté par l'input
      tangage ⇒ le joueur qui tient W/S le débraye. **Assist ON** : accélérer garde ~**+2 m/s** de montée douce au
      lieu de ballonner (vérifié : vy stabilisé ~1.6–3.5, plus d'oscillation).
    - **`elevatorTrim` (gouvernes, °, défaut 0)** : déflexion PERMANENTE ajoutée à l'élévateur dans `PlaneRig`
      (`c.elevator += trim + …`) ⇒ **trim par position de gouverne** (pas d'incidence figée). **Assist OFF** : vraie
      **stabilité en vitesse** (la position de gouverne fixe une vitesse d'équilibre ; hors trim l'avion grimpe encore
      mais à vitesse bornée par la traînée, il ne « balloone » plus en yo-yo). La marge statique `cgShift` (déjà là)
      reste le réglage de fermeté du trim. Validé preview : assist ON → montée résiduelle ~+2 m/s ✅ ; assist OFF →
      vitesse plafonnée par la traînée (~42–60 m/s), pas de divergence ✅. typecheck/lint/build OK.
  - **S4 — refonte éditeur** *(en cours ; sous-découpage validé : A page blanche/racine → B cockpits → C fuselage
    déformable → D trains → E branchement)*. Décisions utilisateur : **cabines supprimées** (sans intérêt) ;
    **rupture de train = light** ; **anim. de rétraction à retravailler** (roues cachées une fois rentrées, en S4-D).
    - [x] **S4-A — page blanche + racine amovible + 6 catégories ✅.** L'éditeur démarre **VIDE**
      (`EMPTY_AIRCRAFT` : `rootId:''`, 0 nœud ; remplace `J1_AIRCRAFT` comme défaut du store — J1 gardé comme
      préréglage pour S4-E). **1re pièce = un cockpit ⇒ racine** (`store.addPart` : si graphe vide, pose sans parent
      + `rootId` = son id ; refuse tout non-cockpit). **Racine retirable** (`removeNode` sur la racine ⇒ retour page
      blanche). Aucune pièce verrouillée ; `undo` couvre pose racine et retrait. **Cockpit** = nouvelle catégorie
      (`CockpitPart` {model, fuel, electricCharge, cargo}) ; il porte le **carburant de base** (règle 6 : fuel 1 +
      0,05 elec — vérifié FUEL 1.0). 1 modèle de départ `cockpit.ga` (nez + verrière) ; les 6 modèles = S4-B.
      **Cabines supprimées** (`cabin.*` : catalogue + blueprints + `CabinModel`/Cargo/Passenger + `case 'cabin'`
      stats/rendu). **Palette** = 6 onglets dans l'ordre imposé **Cockpit · Fuselage · Moteurs · Trains · Ailes ·
      Empennages** ; page blanche ⇒ seul Cockpit actif + bandeau d'aide. **Pose racine** : sol invisible cliquable +
      fantôme à l'origine (pas de surface à survoler). **« Vol d'essai » grisé** si l'avion est vide. Save/load
      accepte l'avion vide. **Validé preview** : démarrage vide (0 collider) ✅, tabs 6 + fly désactivé ✅, pose
      cockpit → racine ✅, non-cockpit refusé / cockpit accepté / undo → vide ✅, avion cockpit-racine **vole**
      (roule, FUEL 1.0, 0 crash) ✅, retrait racine → page blanche ✅, 0 erreur console, typecheck/lint/build OK.
      🟡 Le carburant se cumule si cockpit + fuselage (les 2 portent du fuel) — calibrage éco plus tard.
      🟡 Anciennes sauvegardes à base de `cabin.*` désormais rejetées (pièces retirées) — attendu.
    - [x] **S4-B — 6 modèles de cockpit reconnaissables + profil de section ✅.** `CockpitModel` (ga/glider/
      warbird/airliner/wide/fighter) + `SectionProfile` {halfWidth, halfHeight, round} (superellipse) sur
      `CockpitPart` = **face de raccord arrière** que le fuselage épousera (S4-C). 6 pièces (`cockpit.ga` T0 →
      `cockpit.fighter` T5), chacune porte le carburant de base (règle 6). **Blueprints** : colliders/mounts
      (arrière +Z fuselage, nez -Z moteur, ventre -Y train)/dragPanels alignés sur la silhouette. **Rendus détaillés**
      (`scenes/Plane.tsx`, couleurs dédiées dans `palette.ts`) : GA = cabine crème + pare-brise enveloppant + fenêtres
      + capot rond + liserés bleu/rouge (type Cessna) ; planeur = coque fine brillante + longue verrière basse ;
      warbird = long capot olive + échappements + verrière goutte + ventre duck-egg (type Spitfire) ; ligne =
      tube blanc + radôme sombre + baies vitrées + cheatline (type A320) ; gros porteur = nez bulbeux + bosse de
      poste vitrée (type Beluga/747) ; chasse = nez facetté furtif gris + **bulle teintée OR** + perche de nez
      (type F-35). Dispatcher `CockpitShape`. **Validé preview** : 6 pièces en palette (badges T0-T5), les 6
      silhouettes rendues et reconnaissables, FUEL 1.0 partout (gros porteur 1.5), 0 erreur, typecheck/lint/build OK.
    - [x] **S4-B-bis — refonte graphique cockpits par LOFT (retour utilisateur « formes collées »).** Les 6 cockpits
      étaient des primitives empilées (arêtes dures). Refaits par **loft** : `loftGeometry(stations)` empile des
      **sections superellipse** (`{z,hw,hh,round,yc}`) reliées en **une surface continue à normales lisses** ⇒ lignes
      fluides. Verrières = **volumes de verre PLEINS** posés sur le corps (plus d'intérieur creux qui apparaissait
      noir), teintées sombres pour se lire comme des vitres. GA (Cessna) = corps crème + toit peint + pare-brise
      redressé + custode omni-vision + narines de capot ; planeur = pod fin + longue verrière basse ; warbird =
      capot inline elliptique haut + goutte + échappements ; ligne = tube blanc + radôme (loft séparé) + baies +
      cheatline ; gros porteur = corps bulbeux + bosse de poste ; chasse = corps **facetté** (loft 12 seg +
      `flatShading`) + **bulle OR** + pitot. ⚠️ **Bug corrigé** : l'enroulement des triangles du loft donnait des
      **normales inversées** ⇒ fuselage « transparent » (culling des faces extérieures) ; sens d'indices remis pour
      des normales vers l'extérieur (+ caps). `loftGeometry` resservira au **fuselage déformable S4-C** (sections
      variables = déformation). Télémétrie DEV : `window.__hangar.camera` (cadrage des captures). **Validé preview** :
      les 6 opaques et fluides (profils + belly), 0 erreur, typecheck/lint/build OK.
    - [x] **S4-B-ter — caps opaques + design poussé (planeur/warbird/A320/cargo).** ⚠️ **Bug caps** : après le fix
      normales S4-B-bis, j'avais aussi retourné les **capes** avant/arrière ⇒ elles devenaient transparentes ;
      enroulement des caps remis OPPOSÉ aux côtés (avant face −Z, arrière face +Z). Design **beaucoup plus détaillé**
      (retour utilisateur), F-35 gardé tel quel (validé) : **planeur** = fuselage teardrop très élancé qui s'affine
      en poutre + longue verrière frameless + coaming d'instruments + crochet de largage ; **warbird** = capot Merlin
      elliptique + prise carbu sous le nez + ventre duck-egg + 6 échappements/côté + verrière à cadre (pare-brise
      plat + bulle) + arête dorsale ; **A320** = radôme BOMBÉ (fini le cône pointu) + **visière noire** anti-
      éblouissement + 2 vitres frontales en V + 2 latérales + sondes pitot + cheatline ; **cargo** = nez bulbeux +
      **bosse d'upper-deck 747** proéminente, poste vitré au front de la bosse + cheatline. **Validé preview** : les 4
      revus, caps opaques, 0 erreur, typecheck/lint/build OK.
    - [x] **S4-B (A320 v3) — nez blanc intégré + verrière refaite.** Retour utilisateur : nez/pare-brise noirs, mauvaise
      forme. Refonte : **une seule coque BLANCHE continue** (plus de radôme gris séparé ; pointe légèrement tombante
      intégrée), **joint de radôme** (fin liseré gris). Poste : **2 pare-brise frontaux en V** (grands) + **1 latéral
      par côté**, verre **teinté sombre** (contraste avec le nez blanc ⇒ se lit), **montants blancs** (post central +
      A-posts), **visière anti-éblouissement discrète**, sondes pitot, cheatline. Validé preview (front + 3/4) : nez
      blanc, poste lisible, 0 erreur, typecheck/lint/build OK. *(+ fix suivant : pare-brise A320/cargo raked vers
      l'ARRIÈRE — signe de rotation.x inversé.)*
    - [x] **S4-C1 — fuselage adaptatif & déformable (cœur) ✅.** UN segment déformable remplace les 3 fuselages fixes
      (`fuselage.mk1` « Segment de fuselage » ; medium/large supprimés).
      - **Modèle** : `FuselagePart` {section défaut, baseLength} ; réglages d'instance dans `node.settings`
        (`fusLength` 0.6-4 m, `fusEndScale` 0.25-1.5, `fusOffsetY` ±0.6 — bornes `FUS_LIMITS` exportées par compile).
        Repère pièce : **entrée en z=0, corps vers +Z**, sortie décalée de `offsetY`.
      - **Héritage de section (S4 4.4)** : `compileAircraft` résout la section d'ENTRÉE depuis le parent
        (`rearSectionOf` récursif : cockpit → son `section` ; fuselage → sa sortie ⇒ **chaînage**) ; sortie = entrée
        × `fusEndScale`. Forme résolue publiée dans `PlacedPart.fuselage` (`FuselageShape`) + `statScale` =
        volume déformé / volume défaut ⇒ **poids/fuel/cargo ∝ volume** (stats.ts) et masse des colliders idem.
      - **Compile par instance** : 2 boîtes (approx. du fût effilé) + 5 panneaux de traînée ∝ dims déformées —
        le blueprint statique n'est qu'un repli.
      - **Pose face-à-face** : `attachAxis` (HangarEditor) — un fuselage s'accroche **corps le long de la normale**
        (entrée plaquée au contact, offset 0), le reste se pose dessus (+Y) comme avant.
      - **Rendu** : `FuselageModel` lofté (7 stations smoothstep entrée→sortie, `loftGeometry` S4-B) ⇒ raccord
        parfaitement continu avec le cockpit ; dispose() propre.
      - **Inspecteur** : 3 curseurs (longueur / rayon de sortie / pointage haut-bas) ⇒ recompile live.
      - **Validé preview** : pose sur l'arrière du cockpit GA → `start` = section du cockpit (0.42/0.42/0.55, pas le
        défaut) ✅ ; déformation live (end 0.189 à 45 %, statScale suit) ✅ ; **chaînage** : 2e segment hérite de la
        sortie du 1er ✅ ; liner → section héritée 0.55/0.56 round 1 ✅ ; avion complet (liner+fus+ailes+piston+train)
        **vole** (73 m/s, AoA 0.6, intact) ✅ ; 0 erreur console, typecheck/lint/build OK.
      - 🟡 Anciennes sauvegardes avec `fuselage.medium/large` rejetées (pièces retirées) — même politique que les
        cabines. 🟡 S4-C2 (poignées de déformation à la souris dans le viewport) reste à faire — réglage via
        inspecteur en attendant.
    - [x] **S4-C1-bis — fuselage blanc + auto-snap aligné + transition fluide (retour utilisateur).**
      - **Blanc** : segment de fuselage et **corps du F-35** passés en blanc (`palette.fuselageWhite` #edf0f3 ;
        la verrière du F-35 reste dorée) ⇒ se fond avec les cockpits clairs.
      - **Auto-snap aligné** : sélectionner un fuselage l'aligne AUTOMATIQUEMENT sur la **face arrière libre la plus
        reculée** (mount `localNormal.z≈+1`, host sans segment) — centré sur l'axe, plus besoin de viser. `compile`
        expose un **mount de sortie** par segment (chaînage) ; `HangarEditor.fuselagePlacement` cible le rearmost libre,
        rentre le nez de 4 cm (**tuck**) pour masquer le joint ; sol cliquable pour poser ; hint dédié.
      - **Transition fluide** : chaque `section` de cockpit **recalée sur sa vraie station arrière de loft**
        (GA 0.42/0.40/0.55, planeur 0.11 (poutre), warbird 0.33/0.39/0.8, A320 0.56/0.57/1, gros 0.72/0.68/0.88,
        chasse 0.42/0.42/0.4) + mount arrière du GA centré à yc −0.02 ⇒ l'anneau d'entrée du fuselage = anneau de
        sortie du cockpit (même taille, même centre) ⇒ raccord sans marche.
      - **Validé preview** : fuselage `start` = section exacte du cockpit (GA 0.42/0.40/0.55) ✅ ; pos centrée + tuck
        [0,−0.02,0.91] ✅ ; auto-snap ghost aligné sans viser ✅ ; F-35 blanc + verrière dorée ✅ ; blanc/crème
        raccord fluide ✅ ; typecheck/lint/build OK.
    - [x] **S4-D — trains d'atterrissage (variantes + rétraction manuelle + rupture light) ✅.**
      - **Variantes** (catalogue + blueprints + rendus) : `landingGear.single` T1 « Roue simple » (1 jambe + 1 roue,
        élément MODULAIRE — en poser 3), `landingGear.skid` T1 « Patin de planeur » (lame à fleur de ventre, ultra
        léger, fragile str 0.7), `landingGear.bogie` T4 « Bogie tandem » (2 roues tandem + trappe, rétractable,
        str 2.5) — en plus du tricycle fixe T0 / rétractable T3.
      - **Rétraction MANUELLE (G)** remplace l'auto-altitude de 3-E : store `store/gear.ts` (down/broken, global
        light) ; l'anim remonte+bascule puis **cache réellement les roues** (`visible=false` à t>0.97, demande
        utilisateur), trappes restent ; chip HUD « TRAIN RENTRÉ ». **Physique cohérente** : roues rentrées ⇒ leurs
        colliders-sphères RETIRÉS du corps (`activeColliders` filtré dans PlaneRig) ⇒ le ventre frotte — les boîtes
        de structure des blueprints remontées EN SOUTE (bottom ≈ ventre) pour éviter tout support fantôme.
      - **Rupture light (règle utilisateur)** : au contact (`onContactForce`, désormais branché aussi en prod),
        si la vitesse verticale PRÉ-impact (`prevVy` capturé au début du pas fixe — onContactForce arrive après
        résolution) < −(min strength des trains × `gearBreakFactor` leva « Vol › sol », défaut 7) ⇒ roues perdues
        (masquées + colliders retirés), alerte « TRAIN CASSÉ — R pour réparer », l'avion glisse sur le ventre.
        Roues RENTRÉES = protégées (pas de rupture ventre). R / retour hangar répare (reset store).
      - **Validé preview (data + captures)** : 5 trains au catalogue ✅ ; J1+retract : 12 colliders/3 roues ✅ ;
        décollage roues sorties (contacts roulage vy≈0 ⇒ pas de rupture) ✅ ; G en vol → down=false, chip RENTRÉ,
        roues invisibles à l'écran ✅ ; piqué vy −29.7 → impact → `broken` + alerte + glisse sur le ventre ✅ ;
        R → réparé/ressorti ✅ ; pose des 3 variantes au snap de surface (7 roues compilées) ✅. Piège protocole :
        voler plein nord > ~40 s à plein gaz franchit le HORS-LIMITES (retour hangar auto) — tester en boucle courte.
  - [x] **S-phys — physique prédictible & réaliste (régression maniabilité post-S4) ✅.** Symptômes : maniabilité
    excessive + « trim auto » trop fort. Diagnostic par diff S3→S4 : AUCUN changement des forces/leva — la refonte
    S4-C avait réaffecté `fuselage.mk1` (caisson 4 m poids 3 → segment 1.6 m poids 2) ⇒ CG reculé ~+0.24 m (marge
    statique ÷7 ⇒ tangage nerveux + trim surpuissant) + inertie −14 %. Trois corrections SANS artifice (demande
    utilisateur : physique prédictible et réaliste) :
    - **Masses réalistes** (catalogue ×~1.5, moteurs/structures AVANT relativement plus lourds) ⇒ CG J1 mesuré
      z −0.019 (redevant l'aile), masse 9.65 (+34 % d'inertie) — lourd = placide / léger = vif, émergent.
    - **T/W bornés** : turbofan 110→85, PC 130→90 (mult ×2.2→×1.6), fusée 300→150 ⇒ échelle d'accélération
      0.53 / 0.82 / 1.27 / 1.52 / 1.68→2.69(PC) / 3.34 g (fusée = seul extrême assumé) — un gros moteur
      n'« écrase » plus une petite cellule vers des vitesses ingérables.
    - **Portance tempérée** (`aerodynamics.ts`) : la vraie loi EST ½ρv²SCL ; un vrai avion ne ballonne pas grâce
      au trim continu du pilote + enveloppe de vitesse étroite — deux choses que le jeu n'a pas (trim auto refusé).
      Donc : sous `liftRefSpeed` (30 m/s) loi réelle exacte (décollage inchangé), au-delà **L ∝ v^n**
      (`liftSpeedExponent` 1.5, leva, 2 = loi réelle) ; la TRAÎNÉE reste en v² (vitesse terminale conservée).
      Les gouvernes étant des surfaces, leur autorité suit v^n ⇒ la maniabilité ne diverge plus à haute vitesse.
    - **Validé preview (data)** : J1 bois décollage ~37 m/s, montée bornée, AoA auto-trim ~2°, v max 56+ sans
      ballonnement ; turbofan v max 99 bornée par la traînée, pas de rupture, trim rapide prévisible ; **assist
      OFF : phugoïde amortie toute seule** (pics vy +7→−7.3→+5.3→+1.9→−0.9), v bornée 64 — la physique tient sans
      l'assistance (qui redevient un simple confort, à retirer à terme). Astuce vérif : le store leva de l'app
      s'atteint par l'URL exacte du dep (`performance.getEntriesByType('resource')` → `.vite/deps/leva.js?v=…`),
      un `import('/@id/leva')` crée une 2ᵉ instance vide.
    - **Suite** : trim auto (`altHold`) passé à **0 par défaut** (demande utilisateur — la portance tempérée
      amorti la phugoïde seule ⇒ l'artifice n'est plus nécessaire ; réglage laissé en leva pour dépannage).
  - [x] **S5 — aérodromes : ravitaillement + décor biome + pistes longues/variées + revêtements + spawn ✅.**
    - **Pistes 2× plus longues + longueurs variées** (demande utilisateur) : classes **240×18 / 340×22 / 520×30**
      (doublées ; la plus courte 240 m ≥ l'ancienne longueur de départ) ; départ **340×22**. Marges de pad 30/30
      (le décor vit sur le flanc plat du pad). ⚠️ Emprise plus grande = filtre de site plus dur ⇒ **`airportFlatness`
      7 → 10** (sinon trop peu de sites). ⚠️ La **piste de départ 340 m dépasse l'ancien pad plat 150 m** ⇒
      `SPAWN_PAD_RADIUS` 150 → **220** (terrain.ts) + collider spawn/couloir Scenery agrandis en conséquence.
    - **Revêtements** (S5) : `RunwaySurface` = `asphalt | grass | dirt` (`world.ts`). Grands terrains (≥500 m)
      bitumés ; petits penchent herbe (prairie/forêt) ou terre (désert/neige) — `pickSurface` déterministe.
      `Runway` (World.tsx) colore selon le revêtement (`palette.runwayGrass/Dirt`) et ne **peint les marquages
      que sur le bitume**. `Airport.surface?` optionnel (défaut bitume).
    - **Spawn pas collé au bout** : l'avion démarre à **0,33·L** du centre (axe piste, nez au nord) ⇒ ~0,83·L de
      piste devant, ~0,17·L derrière (mesuré : 282 m devant / 58 m derrière pour L=340). R re-spawn au même point
      (`FlightScene` calcule le spawn, `PlaneRig` le consomme).
    - **Ravitaillement** (`PlaneRig`) : posé sur l'**emprise d'un aérodrome** (rectangle du pad en repère local
      piste, départ compris) + v < `refuelMaxSpeed` (**25 m/s**, demande utilisateur) ⇒ le plein se refait à
      `refuelRate` (**40 u/s**) — leva « Vol › ravitaillement » 🟡 hors dossier, gratuit (comme le cargo).
      HUD : `refueling`/`padName` + chip verte « ⛽ RAVITAILLEMENT — <NOM> ».
    - **Décor d'aérodrome par biome** : `core/world/airportDecor.ts` = DONNÉES déterministes (seed) partagées
      rendu/physique ; `scenes/AirportDecor.tsx` = rendu. Par aérodrome : hangar(s) à toit deux pans + porte, tour
      de contrôle + vigie + **gyrophare pulsant**, **citerne de carburant** (matérialise le ravitaillement), caisses
      de cargo (annonce des missions), dalle apron, **feux de bord de piste** émissifs — couleurs par biome (grange
      rouge prairie / vert sapin forêt / adobe désert / ardoise neige). Petit (240) sans tour ; grand (520) 2 hangars.
      **UN InstancedMesh par archétype pour TOUS les aérodromes** (~10 draw calls). **Manche à air animée**
      (oscillation, phase par position). **Bâtiments solides** (cuboïdes fixes dans FlightScene). Village côté est
      vers le bout de piste sud ⇒ visible au spawn ; couloir sans arbres de `Scenery` élargi en conséquence.
    - **Validé preview (data + captures)** : seed 20260707 → 9 aérodromes, longueurs **240/340/520**, revêtements
      **asphalt/grass/dirt** mixés, déviation piste/terrain **0.000**, espacement min 711 m ; piste de départ 340 m
      **entièrement plate** sur le pad 220 (dév. 0), spawn à 58 m du seuil aval ; **ravito bridé par la vitesse**
      (à 50 m/s sur le pad la conso baisse 50→37, PAS de plein ; à l'arrêt `refueling` + retour au plein) ;
      village rendu (hangars/tour/citerne/caisses/feux/manche) ; 0 erreur console ; typecheck/lint/build OK.
      🟡 Débit exact 40 u/s = défaut leva câblé (rampe fine non capturée — le renderer `always` gèle le rAF quand
      l'onglet preview passe `hidden`, throttlant les boucles JS ; comportement validé, valeur code-vérifiée).
  - [x] **S6 — menu paramètres joueur (+ accès leva) ✅.** Les réglages joueur vivaient dans leva (masqué en
    prod ⇒ inaccessibles). Nouveau store `store/settings.ts` (persisté localStorage `skycrate.settings` :
    `quality` + `assist` ; `showLeva`/`open` = session) + `ui/SettingsMenu.tsx` (engrenage haut-droite → modal) :
    **Qualité graphique** (performance/équilibré/qualité — `renderQuality.ts` lit désormais le store, plus leva),
    **Assistance de pilotage** ON/OFF (gate `PlaneRig`: `tunables.assistEnabled && settings.assist`),
    **Réglages avancés** = ouvre/masque le **panneau leva** (`<Leva hidden={!showLeva}>` piloté par le store ;
    défaut visible en dev, ouvrable en prod), **aide-mémoire commandes**. `ModeToggle` « Vol d'essai » décalé
    (right 64) pour l'engrenage. **Validé preview (DOM+store)** : menu ouvre, qualité change + persiste
    localStorage, assist toggle + persiste, leva apparaît/disparaît au toggle, persistance après reload ✅.
    (Captures KO sur cette machine — renderer `always` bloque le screenshot ; vérif par DOM/store.)
- **Chantier C — crash (terre & eau) + respawn** *(en cours — cadence : un sous-jalon à la fois, feu vert entre
  chaque)*. Découpage validé : C1 détection terre → C2 explosion soignée → C3 eau récupérable (≤50 % submersion) →
  C4 naufrage → C5 respawn aérodrome (marqueur perso retiré, spec §10 ; missions pas encore implémentées).
  Style arcade/stylisé, pas de gore ; sons = placeholders. Vertical = **Y**.
  - [x] **C1 — détection de crash sur terre ✅.** Store `store/crash.ts` ({crashed, cause 'impact'/'structure'/
    'water', position}) alimenté par `PlaneRig.onContactForce` CONTRE LES CORPS FIXES uniquement (terrain/pads/
    bâtiments — pas l'aile détachée). Deux déclencheurs, seuils leva « Vol › crash » 🟡 :
    (a) **vitesse d'approche pré-impact** projetée sur `maxForceDirection` > `crashImpactSpeed` (15) — touchdown
    trop dur, flanc, mur ; (b) **pièce NON-roue** au sol à vitesse TOTALE > `crashContactSpeed` (12) — ventre/
    cockpit/bout d'aile ; une glissade lente reste survivable. Roues identifiées par **handle de collider**
    (`colliderIsWheel`, refs sur Ball/CuboidCollider — le patin de planeur a une sphère de contact ⇒ « roue »).
    `prevVy` généralisé en **`prevVel` vecteur** (capturé au début du pas fixe : onContactForce arrive après
    résolution). Étagement : doux < rupture train (strength×7, S4-D) < fatal. Crash ⇒ **moteurs morts** (via
    `fuelOk && !crashed`), pas de ravitaillement, gaz coupés ; alerte HUD « 💥 CRASH — R pour réapparaître »
    (auto-respawn = C5). R + retour hangar résettent. Le snap d'aile n'est PAS le crash (c'est l'impact qui suit).
    **Validé preview** : roulage/décollage 62 m/s sur roues ⇒ pas de crash ✓ ; piqué au sol ⇒ `crashed:true`
    cause `structure`, thr 0, alerte DOM ✓ ; R ⇒ reset + respawn ✓ ; 0 erreur console, typecheck/lint/build OK.
    **Ajustement post-feu-vert** : `crashContactSpeed` 12 → **50** (demande utilisateur : une glissade sur le
    ventre reste survivable jusqu'à 50 m/s — vérifié : glissades 15-40 m/s sur terre ET sur l'eau sans crash,
    ventre à 51.8 m/s ⇒ crash `structure`).
  - [x] **C2 — explosion soignée (terre) ✅.** Au crash terre, l'avion est **remplacé par ses pièces** + effet
    multi-couches ; capturé au crash : `CrashPose` {position, quaternion, velocity} dans `store/crash.ts`.
    - **`scenes/CrashDebris.tsx`** : chaque `PlacedPart` du graphe compilé devient un **RigidBody indépendant**
      (ses colliders réexprimés en repère pièce, masse conservée, ccd), pose monde = pose crash ∘ transform pièce,
      **impulsion radiale** depuis le CG (biais vers le haut, héritage FAIBLE de la vitesse d'impact — sinon une
      chute verticale écrase la gerbe) + couple aléatoire ; rendu = `Plane` mono-pièce (mirrored/fuselage
      conservés) ; nettoyés après `debrisLifetime` (7 s).
    - **`scenes/CrashExplosion.tsx`** : FLASH additif bref → **BOULE DE FEU** (2 sphères, corps en blending
      NORMAL — l'additif se lave sur fond clair — cœur additif, jaune→orange→rouge sombre) → **FUMÉE** (10
      volutes icosaèdres sombres, montée/croissance/fondu ~3.6 s) → **BRAISES** (80 Points additifs, gravité,
      extinction au sol) → **ONDE** (anneau plat qui s'étend) → **pointLight** orange en pic (lit le décor même
      sans bloom). Matériaux/géométries disposés à l'unmount ; autodestruction après la fumée.
    - **PlaneRig** : `exploded` ⇒ RigidBody principal **DÉMONTÉ** (HUD figé, caméra figée sur le crash) ;
      **camera shake** amorti (offset aléatoire, actif corps démonté) ; hook **`playSfx('explosion')`**
      (`core/audio/sfx.ts`, placeholder — pas d'asset). R remonte l'avion au spawn (reset stores AVANT le
      test rb null — sinon R était muet après explosion). Leva « Vol › crash » : rayon 7 / durée 1.4 /
      éjection 18 / vie débris 7 / secousse 0.7.
    - **Harnais de test DEV** : `window.__planeApi.launch(x,y,z,vx,vy,vz)` (téléporte + vitesse imposée,
      try/catch anti-handle rapier périmé) — un piqué « au manche » est trop doux pour crasher de façon fiable
      (l'assist borne à 35°, l'arrondi de portance ramène sous les seuils — 3 glissades survivables observées,
      cohérent avec les seuils choisis).
    - **Validé preview (data + captures)** : chute verticale −40 ⇒ crash `impact`, corps démonté (HUD figé),
      **aile éjectée à ~15 m + dispersion + fumée sombre** à l'écran ✓ ; mur de hangar à 52 m/s ⇒ crash
      `structure` ✓ ; roulage 62 m/s roues ⇒ rien ✓ ; hook sfx loggé à chaque crash ✓ ; R ⇒ remontage spawn ✓ ;
      0 erreur console ; typecheck/lint/build OK. 🟡 Boule de feu non capturée en screenshot (fenêtre 1.4 s <
      latence capture + renderer wedgé par HMR — couches sœurs prouvées à l'écran) : à valider à l'œil en jeu.
      ⚠️ Piège dev : chaque HMR remonte PlaneRig ⇒ son cleanup « retour hangar » RESET le store crash en pleine
      session de test (pas un bug de prod).
  - [x] **C3 — eau récupérable (effleurement ≤ 50 %) ✅ (code + data ; dynamique à valider en jeu).**
    - **Océan → SENSOR** (`FlightScene`) : l'avion PÉNÈTRE l'eau ; le fond marin solide = heightfields. Les forces
      d'eau sont ANALYTIQUES depuis `SEA_Y` (aucun collider requis) ⇒ marchent aussi pour les **lacs** (même
      nappe globale). Effet de bord : plus de crash `structure` en glissant sur l'eau (les règles d'eau prennent
      le relais) ; un avion peut rouler au fond d'un lac peu profond (< 50 % submergé), assumé.
    - **Submersion** (`PlaneRig`, pas fixe) : AABB avion (repère avion, mémoïsée des colliders) → étendue
      VERTICALE monde par l'orientation (demi-hauteur = Σ |R1j|·hj — un piqué présente plus de hauteur) ;
      `subFrac = (SEA_Y − bas) / hauteur` clampé 0..1. Télémétrie `__plane.sub`.
    - **Zone récupérable (sub ≤ `waterSinkFraction` 0.5)** : **flottaison** = m·g·(sub/`waterBuoyancyEq` 0.42)
      (équilibre le poids à 42 % ⇒ un avion ARRÊTÉ flotte, seul un plongeon franc passe le seuil) + **traînée
      d'eau** ∝ sub × v² (`waterDrag` 0.6 — freine fort à l'effleurement) + viscosité verticale (anti-rebond,
      2.5) + amorti angulaire (1.5). Leva « Vol › eau » 🟡.
    - **sub > seuil ⇒ crash `water`** (pose capturée) : moteurs morts (gate existant), **flottaison COUPÉE** ⇒
      l'avion coule (traînée d'eau conservée = descente amortie) ; PAS d'explosion (`exploded` exclut 'water',
      le corps reste monté) ; alerte CRASH générique (UX naufrage = C4). R répare.
    - **Validé (data pure, harnais preview KO)** : AABB J1 hauteur 2.63 m ; sub 0 posé au sol ✓, 0.11 bas de
      l'avion affleurant ✓, 0.45 centre à la ligne d'eau ✓, 1 enfoncé ✓, piqué ⇒ étendue verticale ↑ ✓ ;
      typecheck/lint/build OK. 🟡 Comportement dynamique (freinage/flottaison/naufrage) à valider en jeu — le
      Browser pane de cette session est resté « stuck » (screenshots en timeout 30 s, page `hidden` en continu
      ⇒ rAF/R3F gelés, `fiber.advance()` pompé à la main ne suffit pas : le mount R3F attend un frame visible).
  - [x] **C-fix — crash terrestre inopérant sur le RELIEF (retour utilisateur : « l'animation ne se lance pas
    sur terre ») ✅.** **Cause racine** : les heightfields de terrain sont créés en impératif
    (`TerrainColliders`, `world.createCollider(desc)`) **SANS corps parent** ⇒ dans l'événement de contact,
    `e.other.rigidBody` vaut **null**, donc la garde `e.other.rigidBody?.isFixed()` était **toujours fausse**
    sur le vrai relief. Seuls le pad de spawn et les bâtiments (sur `<RigidBody type="fixed">`) passaient —
    d'où l'illusion que C2 marchait (mes tests tapaient le pad et un hangar). La rupture de train, elle, ne
    teste pas le corps adverse ⇒ elle fonctionnait, ce qui masquait encore le trou.
    **Correctif** : « monde » = corps adverse **absent (terrain) OU fixe (pad/bâtiment)** —
    `const isWorld = !other || other.isFixed()` — les corps **dynamiques** (débris, aile détachée) restent
    exclus (pas de crash auto-déclenché par ses propres débris).
    **Vérifié (monde Rapier headless, mêmes appels que le code réel — le Browser pane restait `hidden`,
    rAF gelé ⇒ vol impossible)** : (a) parenté des colliders — heightfield `parent = null` (ancien false /
    nouveau true), pad `fixed` (true/true), débris `dynamic` (false/false ⇒ bien exclu) ; (b) simulation avec
    vrais `drainContactForceEvents` sur heightfield : piqué vertical 40 m/s ⇒ approche 42.6 ⇒ **aucun crash
    avant / `impact` après** ; oblique 45 m/s ⇒ approche 32.8, total 47.2 ⇒ **aucun avant / `impact` après** ;
    glissade rasante 40 m/s ⇒ approche 1.2, total 40 ⇒ **aucun** (survivable, conforme au seuil 50 demandé).
    typecheck/lint/build OK. Le RENDU de l'animation était déjà prouvé en C2 (débris + fumée capturés sur les
    crashs pad/hangar) : seule la détection était en cause.
  - [x] **C4 — naufrage (eau) : splash, écume, bulles, enfoncement ✅ (code + data ; visuel à valider en jeu).**
    Contraste voulu avec C2 : le naufrage est **sombre et silencieux**, sans explosion ni débris.
    - **`scenes/WaterEffects.tsx`** : `WaterSplash` = **gerbe** (70 Points blancs éjectés en couronne, gravité,
      gouttes qui meurent à la surface) + **anneau d'écume** (ring plat à SEA_Y qui s'étend et s'efface), ~1.25 s,
      taille/opacité ∝ `strength` (= vitesse/45) ; `SinkingBubbles` = 46 bulles **recyclées** (émission depuis
      l'épave avec dispersion, montée 1.4-3.8 m/s + ondulation, éclatement à SEA_Y ⇒ remise en attente).
      Géométries/matériaux disposés à l'unmount.
    - **Déclenchement du splash** (`PlaneRig`, pas fixe) : au **FRANCHISSEMENT** de la surface (prevSub < 0.02 →
      sub ≥ 0.02) avec v > 4 ⇒ vaut aussi pour un **effleurement récupérable** (C3), pas seulement le naufrage ;
      `playSfx('splash')` (placeholder).
    - **Enfoncement** : `sinking` (cause 'water') ⇒ bulles + **assombrissement progressif** de l'épave (opacité
      → 15 %, couleur fondue vers `DEEP_WATER`) sur `sinkDuration` (leva, 4 s), puis **épave RETIRÉE**
      (`submerged` ⇒ RigidBody démonté, comme `exploded`). Les matériaux de `Plane` étant des instances PAR MESH
      (aucun partagé au niveau module — vérifié), la mutation est sûre : originaux mémorisés et **restaurés** au
      cleanup (R remonte un avion intact).
    - **Validé (data, headless — Browser pane `hidden` toute la session ⇒ rAF gelé, rendu impossible)** : module
      importé sans erreur d'API three ✓ ; règle de splash rejouée sur trajectoire scriptée avec la VRAIE
      submersion et la VRAIE AABB du J1 ⇒ **1 splash par entrée** (entrée + re-entrée = 2), **0 pendant la
      flottaison** qui oscille autour de la ligne d'eau (anti-spam par le gate v > 4), déclencheur **réarmé**
      après sortie ✓ ; typecheck/lint/build OK.
    - 🟡 **Non vérifié visuellement** (gerbe/écume/bulles/fondu à l'écran, cadence) — à valider en jeu.
  - [x] **C5 — respawn (dernier aérodrome, avion intact, marqueur retiré) ✅ (code + data ; visuel à valider).**
    - **Points de réapparition** (`FlightScene` → prop `respawnPoints`, type `RespawnPoint` exporté par
      `PlaneRig`) : un par aérodrome (départ + générés), placé comme le spawn — reculé à **0,33·L** sur l'axe de
      piste, au cap de la piste. Le prop `spawn` est remplacé par `respawnPoints` (`[0]` = départ).
    - **Choix de l'aérodrome** : le **dernier fréquenté** (`lastPad`, mémorisé quand l'avion est sur une emprise
      — même détection que le ravitaillement S5), sinon le **plus proche** du lieu du crash. `pickRespawn` est
      un `useCallback` stable qui ne lit que des refs (jamais périmé dans les timers).
    - **Réapparition automatique** : délai `respawnDelay` (leva, 3 s) sur terre — laisse voir l'explosion ; sur
      eau, `sinkDuration + 0.8` (attend la fin du naufrage). `doRespawn` remet fuel/rupture/gaz/train/crash à
      zéro, vide les éclaboussures, **retire le marqueur perso** (`useWorldUi.setMarker(null)`, spec §10) et
      **conserve** design/découverte/économie. ⚠️ Ordre imposé : stores D'ABORD, corps ENSUITE — après une
      explosion ou un naufrage le RigidBody est démonté, et c'est le reset qui le fait **remonter aux props**
      `position`/`rotation` du nouveau point (d'où le passage de `respawn` en state).
    - **Touche R** = même chemin (`doRespawn`), donc réapparition au dernier aérodrome, plus au spawn fixe.
    - **Fondu** : `crash.respawning` (store) → `ui/RespawnFade.tsx` (voile noir plein écran, transition CSS
      450 ms) allumé juste avant le repositionnement, éteint par `reset()`. Désactivable (leva `respawnFade`).
    - **HUD** : alerte devenue « 💥 CRASH — réapparition… » / « 🌊 NAUFRAGE — réapparition… » (plus « appuyez sur R »).
    - **Validé (data, headless — Browser pane `hidden` toute la session)** : modules (App/PlaneRig/FlightScene/
      RespawnFade) importés sans erreur ✓ ; **10 points** (départ + 9), tous **exactement sur l'axe** de leur
      piste, **dans la piste**, **déviation terrain 0.000** (sol plat), 199-432 m de piste devant selon la
      classe ✓ ; sélection du plus proche correcte (depuis le spawn → départ ; près de Bois-Noir → Bois-Noir) ✓ ;
      typecheck/lint/build OK.
    - 🟡 **Non vérifié visuellement** : enchaînement crash → fondu → réapparition à l'écran, et respawn effectif
      sur un aérodrome distant après un vol réel.
  - [x] **C-fix2 — « l'animation n'a pas le temps de se lancer, l'écran fige » (retour utilisateur) ✅ (code ;
    à valider à l'œil).** Trois causes CUMULÉES, toutes dans le chemin « corps démonté » :
    1. **La caméra mourait avec l'avion** (cause principale) : `useFrame` faisait `if (!rb) return` pour le
       bloc caméra ⇒ dès l'explosion (RigidBody démonté) plus AUCUNE mise à jour de caméra ⇒ **image
       littéralement figée** pendant toute l'animation ; en prime la secousse **s'accumulait** en marche
       aléatoire (plus rien ne réécrivait `camera.position`). Correctif : branche `else if (crashPose)` qui
       **cadre le lieu du crash** (recul + hauteur dérivés de la pose de crash, `offset.y` planchonné à 3 m
       pour ne pas passer sous le sol quand l'avion piquait) avec un **léger travelling orbital** ⇒ la scène
       reste vivante et l'explosion est forcément dans le champ. Vaut aussi pour l'épave engloutie (C4).
    2. **Frame de crash trop lourde** : chaque pièce devenait un corps Rapier **CCD** lâché en
       interpénétration avec le terrain (l'avion vient de le percuter) + reconstruction du modèle procédural
       (lofts aile/fuselage) de CHAQUE morceau. Sur un build de 30 pièces = 30 corps CCD + 30 lofts dans la
       même frame. Correctifs : **CCD retiré** des débris, **relèvement de 0.35 m** au spawn (évite la
       résolution d'interpénétration profonde, très coûteuse), et **plafond `debrisMaxPieces`** (leva, 12) qui
       garde les pièces les plus LOURDES ⇒ coût borné quel que soit l'avion.
    3. **Fenêtre trop courte** : `explosionDuration` 1.4 → **2.2 s**, rayon 7 → 8, `respawnDelay` 3 → **4.5 s**
       ⇒ l'explosion a le temps de se jouer avant le fondu.
    🟡 Non reproduit/validé à l'écran : le Browser pane est resté inutilisable (page `hidden` ⇒ R3F ne monte
    même pas la scène, screenshots en timeout 30 s) — diagnostic par lecture de code, correctifs typés/lintés/
    buildés. À confirmer en jeu.
- **Chantier C terminé (C1→C5)** — reste à valider À L'ŒIL en jeu : boule de feu (C2), gerbe/bulles/fondu de
  l'épave (C4), enchaînement du respawn (C5), et le C-fix2 ci-dessus. Le Browser pane de ces sessions est resté
  inutilisable (page `hidden` ⇒ rAF gelé, screenshots en timeout) : tout a été vérifié en data/simulation
  headless. ⚠️ **Leçon** : tout chemin qui DÉMONTE le RigidBody de l'avion doit prévoir une caméra de repli —
  sinon l'écran paraît planté même si la simulation tourne.
- **Détails du monde — passe 1 : nuages + écume de rivage ✅ (code + data ; visuel à valider).**
  - **Nuages** (`scenes/Clouds.tsx`) — le ciel n'était qu'un **dégradé**, sans aucun nuage : en vol, rien ne
    donnait l'échelle ni la sensation d'altitude/vitesse. Amas de « bouffées » (icosaèdres aplatis,
    `flatShading`) **instanciés en UN SEUL draw call**, placement déterministe par seed sur cellules de 700 m,
    streamé autour de la caméra (même patron que la végétation : régénération au changement de cellule).
    Silhouette de cumulus (bouffées alignées sur un axe, plus grosses au centre ⇒ bombé) ; teinte blanc au
    sommet → ventre bleuté (volume). **Statiques par PARTI PRIS** : la convention du monde est temps + soleil
    FIGÉS (le soleil = nord est le seul repère de cap) ⇒ des nuages qui dérivent la contrediraient. Pas
    d'ombres portées (coût + incohérence avec le soleil fixe). Leva « Monde › nuages » : altitude 300 /
    dispersion 90 / densité 1 / rayon 2000. Plafond `MAX_PUFFS` 900.
  - **Écume de rivage** (`terrainRamp.ts`) : liseré clair (`palette.oceanFoam`) pile à la ligne d'eau, fondu
    des deux côtés. **0 draw call** (couleur de sommet), et comme la rampe est PARTAGÉE avec `MapOverlay`, les
    côtes se lisent nettement mieux sur la carte aussi.
  - **Vérifié (data)** : nuages seed 20260707 → 14 amas / **128 bouffées** (rayon 2000, densité 1), altitudes
    **223-390 m** (au-dessus du sommet à 118 m ⇒ on vole dessous/dedans/dessus), **déterminisme confirmé**
    (2 générations identiques), densité 2 → 273, autre seed → 100 (monde différent), toujours sous le plafond ✓.
    Écume échantillonnée sur la VRAIE rampe : sable `#d4bc84` à −4.2 → **écume `#cbd4c8` à la ligne d'eau** →
    sable `#d6be84` à −2 → herbe à 0 ✓. typecheck/lint/build OK.
    ⚠️ Piège reconfirmé : sans cache-buster, `import('/src/…')` sert la version d'AVANT l'édition (le premier
    échantillonnage montrait du sable pur — c'était le cache Vite, pas un bug de rampe).
  - 🟡 **Non vérifié visuellement** (aspect des nuages en vol, densité perçue, liseré d'écume à l'écran) :
    Browser pane toujours inutilisable. Coût attendu négligeable (1 draw call, ~10k tris ; écume gratuite).
- Jalons suivants (ordre dossier §15) : carburant/snap → cargo/mission → recherche → carte → modes → polish.
- **Extension catalogue (plus tard)** : passer des 6 pièces de départ à un catalogue par **tiers T0-T7** calibré sur de vrais avions — voir [`docs/catalogue-pieces.md`](./docs/catalogue-pieces.md). Première étape quand on s'y mettra : ajouter un champ `tier` aux pièces (`core/parts/types`) + stats exposées en leva ; silhouettes procédurales par planforme/type ; noms génériques (jamais de marque).

## 8. Décisions & valeurs calibrées (à compléter au fil de l'eau)

- **Unité de vitesse interne = m/s** (cohérent avec `strength 2,25 → 225 m/s` du dossier ; l'unité d'affichage HUD « knots » reste à trancher).
- **Modèle de portance vs vitesse** : le dossier dit « valeur fixe par pièce » mais écrit aussi `lift = lift_value × f(v)`.
  Choix : `f(v) = v²` (aéro standard) pour que le poids impose une vitesse de décollage. **Coefficient + exposant exposés dans leva** — à calibrer, valeur non issue du dossier.
- StrictMode React activé ; à surveiller au branchement de Rapier (double-mount en dev) — désactiver si la physique double-initialise.
- **Ombres** : `<Canvas shadows="variance">` (VSM) + `shadow-radius`/`shadow-blurSamples` sur le soleil. Ne PAS utiliser drei `<SoftShadows>` (PCSS) → son injection shader ne matche plus le chunk d'ombre de three 0.184 (`unpackRGBAToDepth` introuvable, boucle `for` cassée) ⇒ tous les `MeshStandardMaterial` échouent à compiler.
- **Vite + R3F** : `resolve.dedupe: ['react','react-dom','@react-three/fiber','three']` obligatoire, sinon le pré-bundling crée une 2ᵉ instance de React et leva plante en « Invalid hook call ».
- **frameloop** : `"demand"` pour l'instant (scène statique, perfs + screenshots fiables). **Repasser en `"always"` à l'étape 4** (vol = frames continues). `enableDamping` d'OrbitControls désactivé tant qu'on est en demand.
- **Palette / couleurs sensibles** exposées dans le panneau leva « Rendu » (exposition, soleil, ambiance, ciel haut/horizon, fog, bloom, SSAO) — pour calibrer la D.A. à chaud.
- **StrictMode désactivé** (main.tsx) : son double-mount dev double-initialise le monde Rapier.
- **Physique vol (étape 4)** : forces au **centre de masse** + **rotations verrouillées** (`enabledRotations=[false,false,false]`) ⇒ pas de tumbling, modèle de forces testable. Conséquence : **pas de vol à plat ni de vrai plané contrôlé sans tangage** → ça vient à l'**étape 5** (déverrouiller + couples de contrôle + caméra moteur).
- **Anti-divergence portance** : `f(v)` de la PORTANCE saturée au-delà de `maxAeroSpeed` (leva), traînée non bornée (garde une vitesse terminale). Sans ça, portance ∝ v² verticale non bornée ⇒ montée explosive → NaN. Calibrer `maxAeroSpeed` pour que portance max ≈ poids.
- **Friction sol = roulement** (≈0,08), PAS du glissement (0,6 = freins déguisés, interdit). Au sol on ralentit par friction + traînée + inverse de poussée.
- **Défauts physiques calibrés (leva « Vol », tous hors dossier)** : gravity 9.81, liftCoef 0.06, liftExponent 2, maxAeroSpeed 30, dragCoef 0.02, thrustCoef 2, groundFriction 0.08. **Étape 5** : angularDamping 2.4, pitch/roll/yaw authority 5/6/3, caméra distance 11/hauteur 3.5. À affiner au feeling.
- **Contrôles (étape 5)** : forces aéro/poussée au centre de masse + **couples** de contrôle séparés. `frameloop="always"`. **CCD** obligatoire sur l'avion (sinon tunneling à travers le sol > ~90 m/s) + sol collider épais (demi-hauteur 5). Caméra = R3F default camera pilotée dans `PlaneRig` (lerp/slerp), **OrbitControls retiré** (rajouter un toggle debug plus tard si besoin).
- **Vérif en `always`** : screenshots OK quand la scène se stabilise ; sinon lire l'état via une télémétrie `window.__plane` temporaire + dispatcher des `KeyboardEvent` synthétiques. ⚠️ `location.reload()` depuis l'eval ne fait PAS un hard reload (HMR persiste les globals) → pour un état propre, **redémarrer le serveur de preview** (`preview_stop`/`preview_start`).
- **Pas fixe (étape 5d-B)** : aéro + poussée + assistance dans `useBeforePhysicsStep` (pas la frame de rendu). Une boucle d'asservissement (assistance) à gain élevé sur un dt variable **oscille/diverge** ; le pas fixe (`FIXED_DT = 1/60`) la stabilise. Caméra + télémétrie restent au rendu (`useFrame`).
- **Assistance (étape 5d-E)** : couple correctif **par-dessus** la physique (`core/flight/assist.ts`). Défaut = amortissement des taux + **bornes d'attitude** + **maintien actif de l'inclinaison** (`holdGain`) vers le bank **capturé au lâché du roulis** (clampé à la borne). Nécessaire car la **stabilité aéro naturelle (dièdre) remet les ailes à plat** toute seule ; le maintien la contre ⇒ l'avion **garde son virage** au lâché (demande utilisateur : NE PAS se remettre à plat). Le tangage tient le climb par simple amortissement. `levelReturn` (ailes à plat) / `altHold` (anti-perte d'alt en virage) = options à 0. ⚠️ télémétrie `window.__plane` désormais **gardée mais `import.meta.env.DEV` only** (sera remplacée par le HUD étape 6).
- **Calibrage 5d (leva « Vol », hors dossier)** : airDensity 0.055, inducedDrag 0.05, flatPlateDrag 1, bodyDrag 0.12, thrustCoef 2.5, CD0 ailes 0.012 / empennages 0.01, calage aile 2°. Assistance : pitch/roll/yawDamp 30/70/40, limitGain 150, maxPitch 35° / maxBank 55°, déflexion gouvernes 15°. **Limite connue** : virages inclinés perdent de l'altitude (pas de maintien d'alt par défaut) → tirer pour compenser, ou monter `altHold`.
- **Portance tempérée (S-phys)** : `computeSurfaceForce` sépare `qLift` de `q` — sous `liftRefSpeed` (30, leva) loi réelle ½ρv², au-delà **L ∝ v^liftSpeedExponent** (1.5, leva ; 2 = réel), traînée toujours en v². Raison : sans trim continu du pilote, la loi réelle fait ballonner tout excès de vitesse (au trim, CL est fixé par la gouverne ⇒ L ∝ v² > poids). S'applique aussi à l'autorité des gouvernes (surfaces). Masses catalogue ×~1.5 (avant lourd = CG devant l'aile) + T/W ≤ ~1.7 g soutenu (fusée 3.3 g assumée). L'ancien couple `liftExponent/maxAeroSpeed` (étape 4) était l'ancêtre direct — perdu dans la refonte 5b, réintroduit proprement ici.
- **Terrain 3+A/B/C (leva « Monde », hors dossier)** : **seed 20260707**, worldRadius 2200, baseElevation 6, λ collines 420 / ampl. 14, octaves 5 / gain 0.5 / lacunarité 2, montagnes λ 1500 / hauteur 110 / contraste 2.2, fondu côtier 0.3 / irrégularité 0.35, lacs λ 700 / creusement 12, climat λ temp 1600 / λ humid 1100 / lapse 0.0045 / neige 0.08, végétation densité 1 / rayon 900, aérodromes 10 / 700 m / alt 55 / tolérance 10 (7 avant l'élargissement des pads S5), viewRadius 1500 / nearRadius 650 / physicsRadius 500. ⚠️ Le masque de montagnosité doit être **remappé par smoothstep** (`0.58 ± 0.5/sharpness`) : un fBm normalisé ne sature jamais ±1, un simple `pow` plafonnait les sommets à ~40 % de `mountainHeight`. Vérif data par eval : `import('/src/core/world/terrain.ts?v='+Date.now())` (cache-buster obligatoire après HMR) + échantillonnage grille.
- **Échelle monde (3+A)** : fog par défaut passé à 220/1500 (voir les massifs de loin), caméra `far` 2000→4000, **dôme de ciel suit la caméra** (rayon 3400 ; un dôme fixe à l'origine finirait derrière l'avion sur un monde de plusieurs km). Garder `viewRadius ≥ fogFar` sinon trous visibles au loin.
- **Collisions terrain (S1)** : tout heightfield Rapier DOIT être créé avec `HeightFieldFlags.FIX_INTERNAL_EDGES`
  (sinon arêtes internes = murs invisibles) → création **impérative** (`world.createCollider`), le composant
  `<HeightfieldCollider>` ne transmet pas les flags. Les colliders qui touchent le sol (roues) = **sphères**, jamais
  de boîtes (coins qui accrochent). `contactSkin` leva (0.02) en amortisseur. Diagnostic reproductible :
  `window.__contacts.summary()` (sonde DEV `scenes/contactProbe.ts`) — médiane vs pics, direction du pire contact
  (horizontal = arête, vertical = vraie bosse). Multi-colliders par pièce : masse répartie (`part.weight / n`).
- **Perf (jalon optimisation)** : coûts MESURÉS sur HD 630 (hangar 903×778, contexte frais, baseline 19 fps) :
  **N8AO ≈ 22 ms (!)** même halfRes, MSAA 4× ≈ 6 ms, bloom ≈ 3,5 ms, composer ≈ 3 ms ; scène brute = 60 fps
  (cap vsync) ; **DPR 1 vs 1.25 = neutre** (pas fill-rate bound) ; terrain/végétation/heightfields = coût nul
  mesurable. ⇒ sélecteur leva « Rendu › qualité » (`renderQuality.ts`) : **performance** (défaut, AUCUN
  post-process — ACES + ombres VSM restent) / **équilibré** (bloom+vignette, MSAA 0, ~45) / **qualité**
  (pipeline complet, ~20). Leva masqué en prod ⇒ les joueurs ont « performance ». Marquages de piste fusionnés
  (2 draws/piste au lieu de ~13). **EN VOL** (2ᵉ goulot) : la **VSM 2048²/20 samples coûtait ~9 ms** → ombres
  par qualité (1024²/8 en performance/équilibré ≈ 1 ms, quasi même rendu) ; végétation castShadow = gratuit
  (gardé) ; le reliquat ~2 ms = scène de vol (draw calls + physique), assumé. **Vol : 13 → 58 fps.**
  ⚠️ Mesure fps par eval rAF : la page preview passe `visibilityState:hidden` quand le panneau n'est pas
  affiché ⇒ rAF gelé, mesure impossible — afficher le panneau d'abord.
- **Déploiement Vercel** : prêt (`vercel.json` + `engines.node 22.x` + leva `hidden` en prod). Lockfile v3 contient les bindings rolldown Linux ; WASM Rapier inliné dans le bundle (pas de fichier à servir). Déploiement = compte Vercel de l'utilisateur (GitHub import ou `npx vercel`).
