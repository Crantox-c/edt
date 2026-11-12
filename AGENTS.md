This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

AGENTS.md — App emploi du temps (BUT2 GEII, IUT Lille)

Lis ce fichier en entier avant toute modification. En cas de doute, demande ou consulte la doc officielle ; n'invente jamais une API.

1. Règle d'or : le flux ICS est la seule source de vérité
URL du flux (configurable dans les réglages, valeur par défaut ci-dessous) : https://www.iuta-geii.univ-lille.fr/calendar/ICS_ETU/GEII+GEII_BUT2+BUT2_ESE+BUT2_ESEA.ics
Le flux est régénéré toutes les 24 h. Aucune liste de matières, de groupes, de salles ou de profs en dur.
Aucune donnée inventée ni de mock dans l'UI finale. Titre inconnu → afficher le titre brut.
Le flux ne contient que : SUMMARY, LOCATION, DTSTART, DTEND (TZID Europe/Paris). Pas de prof, pas de description, pas de type fiable.
Les UID changent à chaque export : ne jamais s'en servir pour comparer deux synchros. Utiliser Course.key (début|fin|titre|salle).
LOCATION vide → afficher « salle non communiquée ».
Le flux mélange plusieurs promos/groupes (ESE, ESEA…). L'utilisateur doit pouvoir filtrer ou changer d'URL (ex. groupe ESEB).
2. Synchro (voir src/lib/sync.ts, déjà écrit et testé)
Sync à chaque ouverture et retour au premier plan : afficher le cache tout de suite, fetch en arrière-plan, mettre à jour à l'arrivée.
Cache > 24 h → bandeau « données anciennes ». Jamais d'écran vide sur erreur réseau : garder le dernier flux valide, afficher « dernière synchro : HH:mm ».
Jamais écraser le cache avec un flux vide ou invalide.
Parsing en Europe/Paris (heure d'été gérée), jamais en UTC naïf.
Après chaque synchro : (a) écrire les cours dans le stockage partagé (App Group) pour les widgets, (b) recharger les widgets, (c) annuler puis recréer les notifications locales (limite iOS : 64 en attente, ne programmer que les prochains jours), (d) signaler les changements (changes.added/removed) par un badge « modifié ».
Aperçu web : si le fetch est bloqué par CORS, utiliser un petit proxy (Cloudflare Worker), pas de contournement hasardeux. L'app native n'a pas ce problème.
3. Parsing des titres (voir src/lib/ics.ts)

Exemples réels : AN3_ESE, ENER3_ESE_AV, SAE3.ESE.02_DG_TUT_ESEA, INFO_SPE3_TP_ESEA, VE4_AM_DS, CEGELEC.

subject = lettres initiales (AN, ENER, SAE…). promo = segment ESE/ESEA/ESEB. kind = TUT|DS|TP|TD|CM seulement si présent dans le titre, sinon null (ne pas deviner). tags = segments restants, non interprétés.
Noms lisibles des matières : dictionnaire optionnel éditable (AN → Anglais, …). Code absent du dictionnaire → afficher le code.
Les listes de filtres sont construites depuis le flux à chaque synchro. Un filtre sauvegardé dont la valeur n'existe plus est ignoré (jamais « tout masquer »).
4. Fonctionnalités

Cœur : vues jour / semaine / liste, indicateur « maintenant », carte « prochain cours » avec compte à rebours, détail d'un cours, recherche, filtres combinables (matière, type, tag/sous-groupe, promo, salle, étage = 1er chiffre de la salle), masquer une matière. Plus : rappels avant cours (délai réglable), résumé du matin, heures par matière, mise en avant DS/SAE, notes perso par cours, export vers le calendrier iOS. Widgets : accueil petit (prochain cours) / moyen (journée) / grand (semaine) ; écran de verrouillage cercle, rectangle, ligne ; Live Activity pendant un cours. Chaque widget affiche « mis à jour à HH:mm ». Timeline = une entrée à chaque début/fin de cours, calculée depuis le cache (marche sans réseau). Le verre des widgets d'écran de verrouillage est dessiné par iOS : ne pas essayer de le reproduire, soigner contenu et lisibilité en rendu teinté.

5. Design
Mobile iPhone d'abord. Fond bleu nuit, accents bleu glacier et violet. Thèmes : nuit (défaut), clair, noir OLED, auto (système).
Couleurs en tokens : chaque teinte (glacier, violet, corail, menthe, ambre…) a une échelle de 7 nuances (50 → 900) avec un rôle par nuance (fond de carte, bordure, texte, pressé, variante sombre désaturée). Aucune couleur en dur dans les composants.
Couleur d'une matière = teinte dérivée d'un hash du subject (stable, fonctionne pour un code jamais vu) ; le kind varie la nuance.
Liquid glass : uniquement le liquid glass natif d'iOS 26. Interdit : toute bibliothèque tierce de verre (notamment Glass-HQ/liquid-glass), backdrop-filter, faux flou ou faux verre dessiné à la main.
Surfaces en verre : GlassView et GlassContainer du paquet expo-glass-effect (natif UIVisualEffectView, fonctionne dans Expo Go). Doc : https://docs.expo.dev/versions/latest/sdk/glass-effect/ — la lire avant de coder.
Barre d'onglets, en-têtes et contrôles : composants système natifs (ex. NativeTabs d'expo-router) pour que iOS applique le verre lui-même.
Avant tout GlassView, tester isLiquidGlassAvailable(). Sinon (iOS < 26, accessibilité « réduire la transparence », Android, aperçu web) : repli sur une surface opaque ou semi-opaque propre, jamais un verre imité.
Ne jamais mettre opacity: 0 sur un GlassView ou ses parents (le verre ne s'affiche plus) ; pour un fondu, utiliser animate/animationDuration dans glassEffectStyle.
Pas de verre sur du verre : regrouper les éléments proches dans un GlassContainer.
Accessibilité : contraste vérifié par nuance, Dynamic Type, option mouvement réduit.
6. Stack et méthode
Expo (SDK actuel du projet — vérifier package.json), TypeScript strict. Widgets : expo-widgets (stable depuis SDK 56) ; lire https://docs.expo.dev/versions/latest/sdk/widgets/ avant d'écrire du code widget. Les widgets ne marchent pas dans Expo Go : development build via EAS Build.
Travailler par petites étapes, une à la fois, dans cet ordre : 1) sync + parsing branchés à une liste brute, 2) vues jour/semaine, 3) filtres/recherche, 4) design system + thèmes, 5) liquid glass natif (expo-glass-effect), 6) notifications, 7) widgets, 8) Live Activity.
Après chaque étape : npx tsc --noEmit, npx expo-doctor, et un commit git. Ne jamais enchaîner plusieurs étapes sans validation.
Si une API (Expo, WidgetKit, liquid-glass) n'est pas dans la doc fournie, le dire plutôt que deviner.