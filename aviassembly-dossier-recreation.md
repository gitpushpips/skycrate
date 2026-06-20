# Aviassembly — Dossier de recherche pour recréation fidèle (Claude Code)

> Objectif : rassembler le maximum de données vérifiables sur *Aviassembly* (mécaniques, physique, économie, monde, UI) afin de servir de spécification de référence pour un clone non commercial développé avec Claude Code.
>
> **Statut des données** : chaque section indique si l'info est ✅ confirmée (page officielle / guides joueurs détaillés / succès Steam), 🟡 partielle/à confirmer, ou ⚠️ non fiable.
>
> Dernière compilation : juin 2026.

---

## 0. Avertissement sources & propriété intellectuelle

### Qualité des sources
- ✅ **Fiables** : page Steam officielle, presskit de l'auteur (`jellebooij.com/aviassembly/press.html`), guides joueurs Steam détaillés (« what i wish i knew », guides 100 % succès), liste des succès Steam (Exophase / SteamHunters / GameFAQs), test technique approfondi de Skyward Flight Media (rédigé par un ingénieur aéronautique sur la démo).
- ⚠️ **À NE PAS utiliser** : `shapes.inc/fandom/aviassembly` et pages dérivées. Contenu **généré par IA et inventé** (île « Oakhaven », « Thermopulse Scanner », « Aethelgard Air Race », 50 000 designs Workshop, serveurs multijoueurs, skins « Raccoon Rat », date de sortie 11 avril ✅ mais noyée dans des faits faux). Le vrai jeu est **solo**, sans Steam Workshop (prévu seulement), petit jeu indé. Ne recrée rien à partir de cette source.
- ⚠️ Sites de « téléchargement gratuit » / APK (filecr, apkpure, gizmodo download, aviassemblygame.com, miniplay) : descriptions marketing réécrites, parfois trompeuses (le jeu n'est pas un jeu navigateur gratuit officiel ; pas de version Android officielle confirmée — le package `com.jellebooij.aviassembly` suggère un build mobile mais non distribué). Utiles pour le concept général uniquement.

### Note IP (important pour « aller le plus loin possible »)
Les **mécaniques, règles, systèmes et le modèle physique ne sont pas protégeables** par le droit d'auteur — tu peux les reproduire à l'identique en toute légalité. Ce qui **est** protégé, c'est l'**expression** :
- les assets (modèles 3D, textures, sons, musique, UI graphique exacte),
- la géométrie précise de la carte,
- le **nom « Aviassembly » et le logo** (marque),
- le code source verbatim.

Donc : recrée librement la boucle de jeu, la physique, l'économie, l'éditeur, les types de mission ; mais **produis tes propres assets**, **ne redistribue pas les fichiers originaux**, et choisis un **autre nom de projet** (même en non commercial, ça t'évite tout souci de marque). C'est exactement l'approche d'un « clone » légitime à la Besiege/SimplePlanes-like.

---

## 1. Fiche technique

| Champ | Valeur | Source |
|---|---|---|
| Titre | Aviassembly | ✅ Steam |
| Développeur / éditeur | Jelle Booij (solo, Pays-Bas) | ✅ presskit |
| Jeu précédent du dev | *Taste Maker* (gestion de restaurant) | ✅ Skyward |
| Début du développement | Mai 2023 (idée venue d'un documentaire sur les frères Wright) | ✅ presskit |
| Page Steam créée | 6 février 2024 | ✅ VG Insights |
| Première démo publique | 16 septembre 2024 | ✅ Skyward |
| Sortie Early Access | 11 avril 2025 | ✅ Steam |
| Prix | 9,99 USD | ✅ Steam |
| Steam App ID | 2660460 | ✅ |
| Genre | Simulation / Sandbox / Building / Flight / Early Access | ✅ |
| Mode | Solo uniquement | ✅ |
| Langue | Anglais (interface only ; localisation prévue) | ✅ |
| Plateforme | Windows (DirectX 11) | ✅ |
| Succès Steam | 11 | ✅ |
| Réception | « Overwhelmingly Positive » (~96 %, 8 000+ avis) | ✅ |
| Sortie 1.0 prévue | fin 2025 / début 2026 (estimation dev) | ✅ Steam EA |

**Config minimale (officielle)** : Windows 10 64-bit · Intel Core i5-4460 3,20 GHz · 4 Go RAM · NVIDIA GTX 970 · DirectX 11 · **300 Mo** d'espace disque.
> Le poids minuscule (300 Mo) + DX11 + build mobile potentiel ⇒ **moteur probablement Unity** (non confirmé officiellement, mais cohérent). À traiter comme hypothèse.

---

## 2. Concept & boucle de gameplay (« core loop »)

Boucle **build → test → tweak**, guidée par des missions de transport :

1. **Construire** un avion dans le hangar à partir de pièces (fuselage, ailes, moteurs, réservoirs, cockpits, trains…), sous double contrainte : **budget (coins)** + **pièces débloquées (recherche)**.
2. **Voler** depuis un aéroport, physique « à ressentir » : un mauvais centrage, des ailes asymétriques ou un moteur surdimensionné se sentent immédiatement.
3. **Livrer du cargo** d'un aéroport A à un aéroport B selon les exigences de la mission (volume, poids, fragilité, péremption).
4. **Gagner** coins (argent) + scrap (points de recherche).
5. **Rechercher / améliorer** de nouvelles pièces pour aller plus loin, plus vite, plus lourd ⇒ débloquer de nouvelles zones.
6. **Explorer** le monde ouvert (nouveaux aéroports, îles, biomes, scrap caché).

Le **coût est le moteur de difficulté** : impossible de simplement « tout empiler ». Chaque mission est un problème de conception (volume cargo vs portance vs traînée vs poids vs carburant vs **coût**), ce qui reproduit la vraie démarche de conception aéronautique. C'est le point qui distingue le jeu de SimplePlanes/Flyout.

Comparables cités par les joueurs : **Kerbal Space Program** (campagne, recherche, pièces préfabriquées), **Besiege**, **SimplePlanes**.

---

## 3. L'éditeur de construction (le hangar)

### Système d'attache ✅
- Pièces **préfabriquées** (approche KSP), **PAS** de redimensionnement libre des ailes (contrairement à SimplePlanes/Flyout). Toutes les pièces ont des **tailles fixes**, **sauf le fuselage**.
- On **colle les pièces ensemble** ; cliquer une pièce surligne les pièces attachées (permet de déplacer des sections entières).
- À l'origine (démo) : attache **orthogonale à la surface**, angles par pas de 90° uniquement ⇒ **dièdre forcé** sur les ailes hautes (impossible d'avoir de l'anhédral proprement). La version sortie a **assoupli** ça (voir outils ci-dessous).

### Outils par pièce (version sortie) ✅
- **Rotation** sur les 3 axes : snap **90°**, snap **45°**, ou **rotation libre**.
- **Déplacement** le long des axes affichés (utile pour positionner finement, ou cacher des pièces dans le fuselage).
- **Suppression** (bouton + raccourci `Del`).
- **Fuselage uniquement** :
  - Étirer/raccourcir une face dans la direction des flèches (allonger le fuselage).
  - Agrandir une face en hauteur, largeur ou les deux (bloc central).
  - « Dé-arrondir » : rendre le fuselage anguleux à nouveau (un coin à la fois, ou une arête entière en glissant).
- **Pièces contrôlables (moteurs…)** : assigner des **boutons de contrôle séparés** (ex. post-combustion), **inverser** le moteur (pour config propulsive arrière), **limiter la poussée max**.
- **Undo** : `Ctrl+Z` (⚠️ **un seul pas** d'annulation ; `Ctrl+Y` ≠ redo — comportement non standard).

### Cockpits ✅
- **Optionnels**, mais **fortement recommandés** : très bon ratio cargo/poids.
- On peut en mettre **plusieurs**.
- Les plus gros (rangée du haut dans la recherche) ont un **rayon plus grand** → un gros fuselage paraît moins disproportionné.
- Un cockpit « nez » donnait **4 unités de cargo** à lui seul (démo).

### ⚠️ Référence directionnelle = le MOTEUR, pas le cockpit
Le jeu utilise **l'orientation du moteur** comme référence de l'avion (caméra + sens des commandes). Une config **propulsive (pusher)** ⇒ caméra retournée + **commandes inversées** (il faut « voler en marche arrière »). À reproduire fidèlement : c'est une contrainte de design majeure qui pousse les joueurs vers des configs tractrices, asymétriques ou moteur-sur-dérive (type Britten-Norman Trislander).

---

## 4. Modèle physique de vol (simplifié)

> Philosophie : « assez de physique réaliste pour rester crédible, mais jouable ». Pas un simulateur hardcore.

### Aérodynamique ✅
- **Extrêmement simplifiée** : **pas de Cl/Cd**, **pas de surface de référence**, on ne choisit pas la surface alaire.
- Chaque **aile** a des **valeurs fixes de portance et de traînée** ⇒ on en déduit un **ratio L/D** par pièce.
- Chaque palier d'aile recherché ⇒ **gros gain de L/D** mais **gros surcoût**.
- **Poids** : augmente avec tout (pièces, cargo, carburant). Plus de poids ⇒ accélération plus lente + **plus de portance requise** ⇒ vitesse de décollage plus élevée ⇒ plus de conso.

### Résistance structurelle (« strength ») ✅
- Stat **strength** des ailes / tail wings = **vitesse de rupture**. Échelle **×100** : `strength 2,25` ⇒ l'aile casse à **225 m/s**.
- **Avertissement** affiché au-delà de **80 %** de cette vitesse.
- Au-dessus ⇒ l'aile se détache (« snap »).

### Contrôle / assistances ✅
- Option **`auto-steer`** (activée par défaut) : simplifie les virages au sol et en l'air, **mais empêche le tonneau contrôlé et les loopings**. La désactiver = pilotage manuel complet.
- Décollage/atterrissage « physics based ».

### Atterrissage (valeurs joueurs) 🟡
- Arriver **bas et lent**, garder **un peu de poussée**.
- Vitesse conseillée ~**35–60**, altitude ~**10–30** (max ~**50–55**) pour un poser en douceur.
- Cargo **fragile** (verre, glace) casse si l'impact est trop dur.

### Vitesse & altitude (bornes connues via succès) ✅
- Le HUD affiche une vitesse (les joueurs parlent parfois de « knots » ; les seuils internes des succès sont **500 / 1000 / 3000**).
- Plafond atteignable : **> 10 000** d'altitude (succès « Edge of space »).
- Avion sans ailes **peut quand même décoller** (succès « Wingless ») via poussée pure / ballons.

---

## 5. Propulsion (moteurs)

### Modèle de poussée ✅
- À l'origine (démo) : **3 états seulement — pleine poussée / arrêt / pleine inverse** (pas de modulation). La version sortie ajoute la **limite de poussée max** réglable par moteur ⇒ modulation possible en plafonnant.
- **Conso élevée** ⇒ technique du **« pulse »** : coup de gaz puis **plané**. (Le testeur suggérait de réduire conso contre poussée pour permettre la croisière continue — à ajuster côté équilibrage si tu veux un feel plus agréable.)
- **PAS DE FREINS** : au sol, seuls **la friction** et **l'inverse de poussée** arrêtent l'avion. Atterrissage moteur coupé = distance d'arrêt très dégradée.

### Stat moteur ✅
- **fuel usage** = unités de carburant **par seconde à pleine poussée**.
- Exemple : **« wood engine » conso = 2/s**.

### Types de moteurs (roster connu) 🟡
Confirmés ou cités par les joueurs : **wood engine** (moteur bois, bas de gamme — succès « finir la campagne au wood engine seulement »), **moteurs à hélice / propeller** (plusieurs paliers ; ne s'empilent plus en stack après un patch), **turbojets** (gourmands, courte portée), **turbofans** (efficaces, longue portée), **rocket engines** (fusée, empilables — 3 en stack pour atteindre vitesse 3000), **electric motor** 🟡 (faible poussée, lié à la charge électrique). Détail des valeurs exactes par palier : **à relever soi-même en jeu** (voir §16).

### Autres pièces de poussée/portance passive
- **Ballons (balloons)** : génèrent de l'altitude sans ailes ; empilés sur un fuselage ⇒ montée jusqu'à 10 000 (succès « Edge of space »). Aussi utilisés pour « Airship » et « Wingless ».

---

## 6. Carburant

- ✅ Avion par défaut : **1 fuel** et **0,05 electric charge**.
- ✅ Stat **fuel** des réservoirs (et de **certaines ailes**) : nombre d'unités ajoutées, échelle **×100** (`fuel 1` = **100 unités**).
- ✅ Calcul de référence : `fuel 1` (100 u) ÷ conso 2/s = **50 s** de pleine poussée pour le wood engine.
- ✅ (Démo) **réservoirs externes = seul moyen d'augmenter la capacité carburant** ; la version sortie ajoute aussi du fuel sur certaines ailes.
- Implication design : la portée se gère par réservoirs + ailes efficaces + technique de pulse, pas par modulation fine.

---

## 7. Économie & progression

### Deux monnaies distinctes ✅
| Monnaie | Rôle | Obtention | Particularité |
|---|---|---|---|
| **Coins** (argent) | **Budget de construction** | Récompense de mission | **Intégralement remboursé** quand on retire une pièce. Ce n'est PAS une consommation : c'est un **plafond** sur la taille/complexité de l'avion. |
| **Scrap** | **Recherche / déblocage de pièces** | Trouvé au hasard dans le monde (on vole **au-dessus** pour le ramasser) + bonus de missions complétées à 100 % | Permanent. |

> 🟡 Mention d'une **2e ressource de recherche** ressemblant à une « résistance électrique » (utilisée avec le scrap pour débloquer certaines pièces) — non élucidée par les joueurs. À vérifier en jeu.

### Recherche ✅
- Style **campagne KSP** : on commence avec **peu de pièces** + **petit budget**.
- On débloque des paliers (ailes, cockpits, moteurs, réservoirs…). **Tous les paliers ne sont pas des améliorations pures** : il y a des **compromis** entre stats.
- À la fin de la campagne (2 grosses livraisons finales à l'hôpital), le jeu **débloque toutes les pièces + assez de crédits** ⇒ bascule en mode quasi-sandbox.

---

## 8. Missions & cargo

### Structure des missions ✅
- Un **aéroport** propose une mission composée de **plusieurs requêtes** (sous-tâches). Ex. : « livrer 5 petites batteries + 2 grosses batteries », ou « 15 bois + 12 pommes ».
- **Bonus** (souvent du scrap) quand la mission est complétée **intégralement**.
- ✅ (Version sortie) une requête peut se faire en **plusieurs trajets** — pas besoin de tout transporter d'un coup. (⚠️ La **démo** l'interdisait : changement notable entre démo et version sortie.)
- En atterrissant à un aéroport, on **voit sa mission** et les aéroports qui possèdent les items demandés se **révèlent** sur la carte.
- Certains aéroports **offrent des missions mais aucun item** → à visiter quand même.
- Existence de **missions « bateau » (boat missions)** 🟡 et de véhicules terrestres (voir succès « Cargo truck », construction de voitures).

### Cargo ✅
- **Volume requis ≠ poids** : certaines marchandises sont **plus denses** que d'autres ⇒ surveiller le poids même si ça « rentre ».
- Le cargo est **gratuit** (on ne paie pas) ⇒ on peut en perdre / en jeter en vol sans pénalité financière.
- **Périssable** : certains items pourrissent après un **délai** (mesuré en secondes pour les plus extrêmes). Charger un nouvel item périssable **réinitialise le timer**.
- **Fragile** : casse à l'atterrissage si l'impact est trop dur. Astuce joueur : **charger plus que requis** pour que seul l'excédent casse.
- **Sources géolocalisées** : un type de marchandise n'existe que dans certaines zones.

### Types de cargo identifiés 🟡 (liste non exhaustive)
medicine (médicaments), wood (bois, NO de la carte), apples (pommes, ferme au NE, **périssable rapide** = mini time-trial), glass (verre, désert, **fragile**), ice (glace, **fragile**), small batteries / large batteries. → Relever la liste complète + densités + délais en jeu.

---

## 9. Monde ouvert & carte

- **Monde ouvert** : îles séparées par de l'**océan**, multiples **aéroports**, **scrap** dispersé à collecter.
- **Biomes** ✅ : zone de départ (verte/tempérée), **désert** (loin, derrière l'océan), **neige (snow)**. Marqueurs « snow » et « desert » visibles tôt mais **pertinents seulement plus tard** dans la progression. Chaque biome a ses cargo et défis propres.
- **Navigation** ✅ : **le temps est figé et le soleil aussi**. Le soleil est **plein nord** ⇒ c'est le **seul repère de cap** (pas de boussole HUD au moment des guides). On peut poser un **marqueur sur la carte** ou suivre la mission d'un aéroport cliqué.
  - Suivre une mission affiche d'abord l'aéroport de **chargement** (tant qu'on peut charger plus), puis la **destination**.
  - **Crasher retire le marqueur perso**, mais la mission sélectionnée reste active.
- **Hors-limites** ✅ : approcher une zone non implémentée ⇒ **avertissement** (« faites demi-tour »), puis un **timer** ; à zéro, **l'avion est désassemblé**. (Dans la démo, l'aérodrome du désert était déjà modélisé mais inaccessible.)
- Reset de l'avion à un aéroport ⇒ la carte se recentre sur l'aéroport de départ à la 1re ouverture.

---

## 10. Modes de jeu

- **Campagne** ✅ : la progression principale (recherche + missions + exploration), avec fin (2 livraisons finales à l'hôpital au sud).
- **Mode Créatif** ✅ : ressources **infinies**, construire tout ce qu'on veut.
- **Relaxed Mode** ✅ : mode détendu ; **tous les succès** sont faisables en Relaxed. (Suggère un mode « normal » avec contraintes plus strictes — dégâts/réparations ? à confirmer.)
- 🟡 Mention de **dégâts/réparations** après crash sur des sites secondaires (à vérifier en jeu, source marketing).

---

## 11. Contrôles & HUD

- ✅ Commandes de vol « physics based » ; **moteurs** sur boutons assignables (poussée pleine/limitée, inverse, boutons custom type post-combustion).
- ✅ **Auto-steer** ON par défaut (toggle dans les options).
- ✅ **`Del`** supprime une pièce ; **`Ctrl+Z`** annule (1 pas).
- ✅ Options **limitées** au moment des guides : **son** (le bruit moteur ne se règle **que via le mixeur Windows**), accessibles seulement depuis le menu.
- HUD : vitesse, altitude, **timer** de mission (péremption, hors-limites), jauge de carburant, avertissement de sur-vitesse structurelle (>80 % du snap). Pas de boussole (au moment des guides).
- **Caméra** : référencée sur le moteur (cf §3).

---

## 12. Succès Steam (11) — objectifs & valeurs numériques ✅

Très utiles : ils **bornent** le design (vitesses, altitudes, contraintes). 5 sont *missable*.

| Succès | Condition | Rareté (~) |
|---|---|---|
| **Speed 1** | Atteindre une vitesse de **500** | ~76 % |
| **Speed 2** | Atteindre une vitesse de **1000** | ~63 % |
| **Speed 3** | Atteindre une vitesse de **3000** (ex. 3 rocket engines empilés) | ~33–43 % |
| **Edge of space** | Atteindre **10 000** d'altitude (empiler des ballons + attendre) | ~57 % |
| **Cargo truck** *(missable)* | Faire une livraison **sans jamais quitter le sol** (véhicule terrestre) | ~55–66 % |
| **Campaign** | Finir la campagne | ~52–56 % |
| **Completionist** | Compléter **toutes** les missions de la campagne | ~30–35 % |
| **Two Birds, One Flight** *(missable)* | Compléter **2 missions** en **un seul décollage/atterrissage** | ~56 % |
| **Airship** *(missable)* | Compléter une mission **sans dépasser la vitesse 50** entre décollage et atterrissage | ~30 % |
| **Wingless** *(missable)* | Compléter une mission avec un avion **sans aucune aile** | ~25 % |
| **Wood engine** *(missable)* | Finir **toute la campagne** avec **uniquement des wood engines** | ~12–14 % (le plus rare) |

> Implications de design à reproduire : véhicules **roulants** possibles (cargo truck) ; vol **sans ailes** possible (poussée/ballons) ; vol **très lent** stable possible (airship/ballons) ; vitesses jusqu'à **3000+** et altitude **10 000+** atteignables avec des pièces extrêmes ; une run **« wood engine only »** doit rester faisable de bout en bout.

---

## 13. Roadmap officielle (features prévues post-EA) ✅

Annoncées par le dev sur la page Steam (utile pour anticiper l'architecture) :
- **Hélicoptères**
- **Mode pompier (firefighting)**
- **Décalcomanies (decals)**
- **Pièces custom dans le Steam Workshop**
- **Localisation** (autres langues)
- **Météo plus élaborée**
- **Vue à la première personne (cockpit FPV)**

Sortie de l'Early Access estimée fin 2025 / début 2026.

---

## 14. Synthèse des constantes/valeurs à implémenter (récap chiffré)

| Élément | Valeur | Confiance |
|---|---|---|
| Fuel de base de l'avion | 1 (= 100 unités) | ✅ |
| Electric charge de base | 0,05 | ✅ |
| Échelle fuel | ×100 (fuel 1 = 100 u) | ✅ |
| Échelle strength → snap | ×100 (2,25 → 225 m/s) | ✅ |
| Avertissement structurel | à 80 % de la vitesse de snap | ✅ |
| Conso wood engine | 2 u/s à pleine poussée | ✅ |
| Cargo cockpit « nez » | 4 unités | ✅ (démo) |
| Seuils succès vitesse | 500 / 1000 / 3000 | ✅ |
| Seuil succès altitude | 10 000 | ✅ |
| Plafond vitesse « Airship » | 50 | ✅ |
| Atterrissage doux | vitesse ~35–60, alt ~10–30 (max ~50–55) | 🟡 joueurs |
| Coins | budget remboursable (pas consommé) | ✅ |
| Snap rotation éditeur | 90° / 45° / libre | ✅ |
| Freins | **aucun** (friction + inverse seulement) | ✅ |
| États moteur | plein / off / inverse (+ limite max réglable) | ✅ |

---

## 15. Plan de recréation pour Claude Code

### Stack suggérée
- **Option A (fidélité 3D max)** : **Unity** (C#) — le plus proche de l'original probable, écosystème physique (Rigidbody) + outils d'édition de mesh pour le fuselage déformable. Recommandé si tu veux le rendu 3D et le « feel » identiques.
- **Option B (web, itération rapide)** : **Three.js + Rapier/cannon-es** (TypeScript) — déployable partout, idéal pour prototyper la physique et l'éditeur sans pipeline 3D lourd. Cohérent avec tes projets React précédents.
- **Option C (moteur de jeu open-source)** : **Godot 4** (GDScript/C#) — bon compromis 3D + gratuit + léger.

### Architecture modulaire conseillée
```
core/
  physics/        # intégrateur, portance/traînée par pièce, snap structurel, poids
  parts/          # ScriptableObjects/JSON : stats par pièce (lift, drag, weight,
                  #   fuel, fuelUsage, strength, cargo, cost, researchCost)
  assembly/       # graphe de pièces, attache, snapping 90/45/libre, déformation fuselage
  flight/         # contrôle moteur (plein/off/inverse + limite), auto-steer, caméra=moteur
  economy/        # coins (budget remboursable) + scrap (recherche) + arbre de recherche
  missions/       # requêtes multi-sous-tâches, multi-trajets, bonus 100 %
  cargo/          # volume vs densité/poids, périssable (timer), fragile (seuil d'impact)
  world/          # aéroports, biomes, scrap au sol, soleil=nord, hors-limites + timer
  save/           # sauvegarde (designs, progression, recherche)
modes/            # campagne, créatif, relaxed
ui/               # hangar (éditeur), HUD vol, carte, recherche
```

### Modèle physique minimal à coder (fidèle à l'esprit « simplifié »)
Pour chaque aile : `lift_force = lift_value × f(vitesse)` et `drag_force = drag_value × f(vitesse)` (pas de Cl/Cd/aire — **valeurs forfaitaires par pièce**). Somme vectorielle des poussées moteurs + portance + traînée + gravité×masse_totale. Rupture d'aile si `vitesse > strength×100`, alerte à 80 %. Pas de freins (uniquement friction sol + inverse). Conso = `Σ fuelUsage` des moteurs actifs × dt.

### Ordre d'implémentation recommandé (jalons)
1. **Éditeur** : grille d'attache, snapping, déformation fuselage, suppression/undo, budget coins.
2. **Vol de base** : un fuselage + une aile + un moteur (plein/off/inverse), gravité, portance/traînée forfaitaires, caméra sur moteur.
3. **Carburant + snap structurel + alerte sur-vitesse**.
4. **Monde minimal** : 2 aéroports, runway, friction, atterrissage.
5. **Cargo + 1 mission** (volume/poids), livraison A→B, récompense coins/scrap.
6. **Recherche** : arbre de pièces, déblocage par scrap.
7. **Carte** + soleil-nord + scrap au sol + biomes + hors-limites.
8. **Périssable/fragile**, multi-sous-tâches, multi-trajets, bonus 100 %.
9. **Modes** créatif/relaxed, **succès** (utiliser leurs valeurs comme tests d'intégration).
10. Polish : auto-steer, options, HUD complet, sons.

### Idée bonus (cohérente avec ton profil)
Tu pourrais réutiliser l'**API Anthropic dans un artifact** pour générer **procéduralement des missions** (descriptions, contraintes de cargo) ou un **assistant de design** qui suggère un avion à partir d'une mission — un plus que l'original n'a pas, sans copier d'asset.

---

## 16. Données qu'il reste à relever toi-même en jeu (pour la fidélité chiffrée)

Les valeurs exactes **par pièce** ne sont pas publiées ; il faut les extraire en jouant (idéalement en **mode créatif**, où tout est débloqué). À tabuler :

- **Par moteur** : poussée, conso (u/s), masse, coût (coins), coût recherche (scrap), empilable ou non, type (hélice/jet/fusée/électrique/bois).
- **Par aile / tail wing** : lift value, drag value, masse, strength (vitesse de snap), fuel éventuel, coût, coût recherche.
- **Par cockpit** : cargo, masse, rayon/taille, coût.
- **Par réservoir** : fuel (×100), masse, coût.
- **Par train** : robustesse (seuil de collapse), masse, coût.
- **Cargo** : pour chaque type → volume unitaire, densité/poids, périssable (délai en s), fragile (seuil d'impact).
- **Aéroports** : positions, longueurs de piste, items proposés, missions.
- **Constantes globales** : g, coefficient de friction sol, conversion unité de vitesse HUD (knots ?), seuil d'impact « casse fragile », timer hors-limites.

**Méthode** : créatif → poser 1 fuselage + 1 pièce à tester, lire la fiche de stats, noter ; pour la physique, mesurer vitesse de décrochage/croisière en variant une seule variable à la fois (comme dans tes TP). Une **capture systématique des fiches de pièces** (screenshots) + un tableur suffira à calibrer le clone.

---

## 17. Liens sources (vérifiés)

- Page Steam : `store.steampowered.com/app/2660460/Aviassembly/`
- Presskit officiel : `jellebooij.com/aviassembly/press.html`
- Guide joueur mécaniques (« what i wish i knew ») : Steam guide id `3487866425`
- Guides 100 % succès : Steam guide ids `3646388971`, `3692453117` (EN)
- Test technique (physique, démo) : Skyward Flight Media, « Aviassembly: The Pursuit of Payload »
- Liste succès : Exophase / SteamHunters / GameFAQs (app 2660460)
- Discord officiel mentionné par le dev (feedback/communauté)

---

*Fin du dossier. Sections marquées 🟡 = à confirmer en jeu ; ⚠️ = source non fiable écartée.*
