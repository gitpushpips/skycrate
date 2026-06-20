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
  - [ ] Étape 4 — physique de vol Rapier (gravité, portance/traînée forfaitaires, poussée plein/off/inverse+limite, friction, pas de freins).
  - [ ] Étape 5 — caméra+contrôles référencés moteur (règle 1).
  - [ ] Étape 6 — carburant + rupture structurelle + HUD (vitesse/altitude/fuel/alerte 80 %).
  - [ ] Étape 7 — panneau leva (masse, coef portance+exposant, coef traînée, poussée, conso, gravité, friction sol).
  - [ ] Étape 8 — validation des critères d'acceptation J1.
- Jalons suivants (ordre dossier §15) : éditeur → carburant/snap → monde minimal → cargo/mission → recherche → carte → modes → polish.

## 8. Décisions & valeurs calibrées (à compléter au fil de l'eau)

- **Unité de vitesse interne = m/s** (cohérent avec `strength 2,25 → 225 m/s` du dossier ; l'unité d'affichage HUD « knots » reste à trancher).
- **Modèle de portance vs vitesse** : le dossier dit « valeur fixe par pièce » mais écrit aussi `lift = lift_value × f(v)`.
  Choix : `f(v) = v²` (aéro standard) pour que le poids impose une vitesse de décollage. **Coefficient + exposant exposés dans leva** — à calibrer, valeur non issue du dossier.
- StrictMode React activé ; à surveiller au branchement de Rapier (double-mount en dev) — désactiver si la physique double-initialise.
- **Ombres** : `<Canvas shadows="variance">` (VSM) + `shadow-radius`/`shadow-blurSamples` sur le soleil. Ne PAS utiliser drei `<SoftShadows>` (PCSS) → son injection shader ne matche plus le chunk d'ombre de three 0.184 (`unpackRGBAToDepth` introuvable, boucle `for` cassée) ⇒ tous les `MeshStandardMaterial` échouent à compiler.
- **Vite + R3F** : `resolve.dedupe: ['react','react-dom','@react-three/fiber','three']` obligatoire, sinon le pré-bundling crée une 2ᵉ instance de React et leva plante en « Invalid hook call ».
- **frameloop** : `"demand"` pour l'instant (scène statique, perfs + screenshots fiables). **Repasser en `"always"` à l'étape 4** (vol = frames continues). `enableDamping` d'OrbitControls désactivé tant qu'on est en demand.
- **Palette / couleurs sensibles** exposées dans le panneau leva « Rendu » (exposition, soleil, ambiance, ciel haut/horizon, fog, bloom, SSAO) — pour calibrer la D.A. à chaud.
