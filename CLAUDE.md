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
- **Terrain 3+A/B/C (leva « Monde », hors dossier)** : **seed 20260707**, worldRadius 2200, baseElevation 6, λ collines 420 / ampl. 14, octaves 5 / gain 0.5 / lacunarité 2, montagnes λ 1500 / hauteur 110 / contraste 2.2, fondu côtier 0.3 / irrégularité 0.35, lacs λ 700 / creusement 12, climat λ temp 1600 / λ humid 1100 / lapse 0.0045 / neige 0.08, végétation densité 1 / rayon 900, aérodromes 10 / 700 m / alt 55 / tolérance 7, viewRadius 1500 / nearRadius 650 / physicsRadius 500. ⚠️ Le masque de montagnosité doit être **remappé par smoothstep** (`0.58 ± 0.5/sharpness`) : un fBm normalisé ne sature jamais ±1, un simple `pow` plafonnait les sommets à ~40 % de `mountainHeight`. Vérif data par eval : `import('/src/core/world/terrain.ts?v='+Date.now())` (cache-buster obligatoire après HMR) + échantillonnage grille.
- **Échelle monde (3+A)** : fog par défaut passé à 220/1500 (voir les massifs de loin), caméra `far` 2000→4000, **dôme de ciel suit la caméra** (rayon 3400 ; un dôme fixe à l'origine finirait derrière l'avion sur un monde de plusieurs km). Garder `viewRadius ≥ fogFar` sinon trous visibles au loin.
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
