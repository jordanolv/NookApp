# Changelog

Toutes les évolutions notables de NookApp sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet applique le [versionnage sémantique](https://semver.org/lang/fr/).
À partir de la `1.0.0`, les entrées sont générées automatiquement par
`release-please` à partir des Conventional Commits (voir
`.github/workflows/release-please.yml`).

## [1.0.0] - 2026-06-23

Première version viable (V1) de la plateforme : un utilisateur peut créer son
Nook, inviter des membres, discuter en temps réel et évoluer dans un monde 2D.

### Fonctionnalités

- **Authentification** — inscription email + mot de passe via Better Auth,
  vérification d'email, réinitialisation de mot de passe, nom d'utilisateur
  unique choisi à l'inscription, notification email en cas de doublon.
- **Nooks (serveurs) & membres** — CRUD des Nooks, système d'invitation par
  lien, rôles et permissions (bitfield), modération (kick / ban / débannissement).
- **Salons & catégories** — salons texte, catégories, icônes/bannières, thèmes
  et suivi de l'état de lecture.
- **Messagerie** — messages temps réel (Socket.IO), édition et suppression,
  messages privés (DM) avec recherche par handle.
- **Monde 2D (Phaser)** — personnages LimeZu multi-couches, déplacement,
  synchronisation multijoueur des positions, zones vocales (LiveKit), éditeur
  de map collaboratif (Y.js / Hocuspocus) : sols, pièces, décor.
- **RGPD** — contrôles de compte (export, suppression avec transfert de
  propriété des Nooks).
- **Plugins** — architecture de plugins par fonctionnalité, SDK client/serveur,
  installation par Nook, panneaux de sidebar.
- **Internationalisation** — interface FR / EN.

### Infrastructure & Ops

- **Intégration continue** — pipeline GitHub Actions (lint / typecheck / test /
  build) avec gate agrégé `ci-success`.
- **Déploiement continu** — build d'images Docker → GHCR → déploiement SSH sur
  VPS → healthcheck, avec migrations Drizzle automatiques au démarrage.
- **Sécurité** — rate limiting (`@nestjs/throttler` + Better Auth), Helmet,
  verrouillage CORS des sockets.
- **Exploitation** — sauvegardes PostgreSQL automatisées + restauration,
  routage via labels Traefik.

### Corrections

- Ordre de validation à l'inscription (email déjà utilisé vérifié avant
  l'unicité du nom d'utilisateur).
- `MAIL_DRIVER` configurable via l'environnement (Mailpit par défaut).
- PostgreSQL épinglé à `17-alpine` pour un layout de volume stable.
- Clé primaire composite sur `server_plugin`.

[1.0.0]: https://github.com/jordanolv/NookApp/releases/tag/v1.0.0
