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
- Jalons suivants (ordre dossier §15) : carburant/snap → monde minimal → cargo/mission → recherche → carte → modes → polish.
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
