# Changelog

Toutes les évolutions notables de NookApp sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet applique le [versionnage sémantique](https://semver.org/lang/fr/).
À partir de la `1.0.0`, les entrées sont générées automatiquement par
`release-please` à partir des Conventional Commits (voir
`.github/workflows/release-please.yml`).

## [1.1.0](https://github.com/jordanolv/NookApp/compare/v1.0.0...v1.1.0) (2026-07-21)


### Fonctionnalités

* **a11y:** add skip link, dynamic lang, dialog roles and visible focus ([a943c4c](https://github.com/jordanolv/NookApp/commit/a943c4cbcd5ff51f1a1fbfd52b0be130b50c99b4))
* **a11y:** trap dialog focus and announce dynamic updates ([f1dd3d2](https://github.com/jordanolv/NookApp/commit/f1dd3d2a1d9bbbce7c6ec43618dda5aef1faa7db))
* **api+web:** add per-server plugin install flow ([ddeb2d0](https://github.com/jordanolv/NookApp/commit/ddeb2d06408db81c2c7923e2598dc221dd4d5996))
* **api:** add plugin gateway websocket and registrations ([cfc2512](https://github.com/jordanolv/NookApp/commit/cfc25124329fadc8be2ed8c8823b9604100ad271))
* **api:** auth, mailer and realtime tweaks ([a94781b](https://github.com/jordanolv/NookApp/commit/a94781be94fee766774cff41ea87c8e324165848))
* **api:** category icon/banner endpoints and channel banner support ([e815eb8](https://github.com/jordanolv/NookApp/commit/e815eb8b7f1fcee01bed1e1abd62929b3ab746a7))
* **api:** dispatch events and commands through plugin gateway ([6388d7f](https://github.com/jordanolv/NookApp/commit/6388d7f91619c2ddc443a3b817d791fc0c4782cf))
* **api:** kick stale plugin socket on reconnect ([7703f7a](https://github.com/jordanolv/NookApp/commit/7703f7ad41e36faee5316a58db489eaa8bc170c5))
* **api:** scope storage uploads and align maps/collab services ([c01c503](https://github.com/jordanolv/NookApp/commit/c01c50321a28add9e2028b28fbfa3d3f90d3a780))
* **api:** scope uploads by entity with shared storage service ([b31cd64](https://github.com/jordanolv/NookApp/commit/b31cd6442fd36d75a719b6c5ada12d41deae8d23))
* **auth:** email existing users on duplicate sign-up attempt ([03398f1](https://github.com/jordanolv/NookApp/commit/03398f1ba40a2966abe0abcbf7b6e4b26b7553a7))
* **auth:** let users pick a unique username at sign-up ([f8221b7](https://github.com/jordanolv/NookApp/commit/f8221b746b13f3303340053ef4d2983afaf4ff2f))
* **auth:** wire better-auth, email verification, and web auth pages ([f3dd010](https://github.com/jordanolv/NookApp/commit/f3dd0109c925766f68c2dcbfb213fbc39d924801))
* **auth:** wire better-auth, email verification, and web auth pages ([0f8e96f](https://github.com/jordanolv/NookApp/commit/0f8e96fe4b5e0f10e27c3038a7c5ed456859c216))
* **categories:** add server-scoped channel category system ([f9e4bf0](https://github.com/jordanolv/NookApp/commit/f9e4bf0342d2ced36af327027ff5e1aac82047a9))
* channel themes, icons and read state tracking ([ee94c05](https://github.com/jordanolv/NookApp/commit/ee94c0517ae37d23f6ee4315528cc96a3921e295))
* **channel:** icon/banner upload and category editor ([84b194c](https://github.com/jordanolv/NookApp/commit/84b194cec0696d0bc12d509663acf3871f44ab26))
* **channels:** add icon picker and channel edit modal ([344e4a9](https://github.com/jordanolv/NookApp/commit/344e4a94d3d5ab221570fab1cbd69b187a764ad5))
* **channels:** forum, voice zones, rail expand, server switcher ([21583c9](https://github.com/jordanolv/NookApp/commit/21583c9b4909ea99a7a36e972e73d4e0a3a45b52))
* **chat:** Chrome-style tab bar with tear-off and dock-back ([38733e7](https://github.com/jordanolv/NookApp/commit/38733e719f0dbd6238f8e361e77bf8ce6127152b))
* **chat:** rich input with emoji, GIF, and markdown ([1c19929](https://github.com/jordanolv/NookApp/commit/1c19929fe58709632a572db539c8212eaf12e3eb))
* **chat:** tear-off floating tabs and resizable window ([e437153](https://github.com/jordanolv/NookApp/commit/e4371534b794edf349d7aca3d4b1100cc0b4ed7f))
* **classic:** add bbs-style lobby layout components ([5cf7ee6](https://github.com/jordanolv/NookApp/commit/5cf7ee68e49eece2ed7a10fa8f38efd66164f016))
* **classic:** home page with server banner and widget cards ([476775d](https://github.com/jordanolv/NookApp/commit/476775d18a0b5b6774712c2a3be4281909d80b2a))
* continuous deployment pipeline to vps ([29412fd](https://github.com/jordanolv/NookApp/commit/29412fd9e869386c81ca21b9791be14d960d4b5d))
* **db:** add direct message tables and user handle ([2b79662](https://github.com/jordanolv/NookApp/commit/2b79662636f9b7001efce3d022c2adca5c2f5bbd))
* **db:** channel + category icon/banner columns and channel show_stat ([4ae0688](https://github.com/jordanolv/NookApp/commit/4ae0688cc131a1474f417f87a65e30f85ddf599c))
* **dms:** add direct messages api with handle lookup ([585ee5b](https://github.com/jordanolv/NookApp/commit/585ee5bb803a57d2221af156eb850e607f03bc0c))
* **dms:** add direct messages ui ([c00ab90](https://github.com/jordanolv/NookApp/commit/c00ab905808c7fc99d185f358a2e4f73ad809010))
* **dms:** direct messages with handle-based discovery ([6f9231c](https://github.com/jordanolv/NookApp/commit/6f9231c65ec60d46e6ddef708c453cb96cf3479d))
* feature-based plugin architecture with user pinning ([117db52](https://github.com/jordanolv/NookApp/commit/117db52084bc580a752c9bff44470e6543ebd125))
* full platform — world, voice, map editor, plugins ([#18](https://github.com/jordanolv/NookApp/issues/18)) ([af7f211](https://github.com/jordanolv/NookApp/commit/af7f2119d1b450004ea67d5c5a8e720841234170))
* **i18n:** server picker dropdown and channel banner labels ([17fe37f](https://github.com/jordanolv/NookApp/commit/17fe37f5e3eba8f03ceaaf62c793b5737e5dda8c))
* **layout:** add configurable app sidebar ([90fe34d](https://github.com/jordanolv/NookApp/commit/90fe34ddbb7c8e051dec5c7e29775722679a4c19))
* **layout:** dual sidebar with arrow-based section picker ([dcfde04](https://github.com/jordanolv/NookApp/commit/dcfde04867839aa7ceae0fd4b7aaad575656e8e6))
* **mailer:** add mailpit/resend drivers with verification template ([07d59d5](https://github.com/jordanolv/NookApp/commit/07d59d5e8fd615875d5bf90e766e53f9cd164109))
* **mailer:** add mailpit/resend drivers with verification template ([66fa482](https://github.com/jordanolv/NookApp/commit/66fa4826d44dd6f7b9506d546d557c3320e01ee8))
* **map:** add Y.js collaborative editing via Hocuspocus ([#19](https://github.com/jordanolv/NookApp/issues/19)) ([d076b29](https://github.com/jordanolv/NookApp/commit/d076b29db445ccedc9b387a1f492deb8ddd01631))
* **map:** admin build mode with floor tile editor ([#16](https://github.com/jordanolv/NookApp/issues/16)) ([263441a](https://github.com/jordanolv/NookApp/commit/263441aa2180850ea4ad1d5815047ebba7be6bad))
* **members:** add kick and ban moderation with server bans ([e2061b1](https://github.com/jordanolv/NookApp/commit/e2061b14cb51f0d691ca2ba6b9773f64f681ed1a))
* **members:** add MembersModule, ServerScopeGuard, role-based access ([f4264f2](https://github.com/jordanolv/NookApp/commit/f4264f22fc146a08e33e1158f7e15798a1ebd478))
* **messages:** live channel message counts via dedicated endpoint ([3dbeff8](https://github.com/jordanolv/NookApp/commit/3dbeff812bbad52b713985fd495d9e629e65099e))
* **messages:** support message editing and deletion with realtime sync ([a6dd6f4](https://github.com/jordanolv/NookApp/commit/a6dd6f402bbf0dde6732da2120b2c95aa02aaf1f))
* **monitoring:** report api and web exceptions to sentry ([c79efc0](https://github.com/jordanolv/NookApp/commit/c79efc016384f7f24ba54974067a15a426266963))
* **ops:** add automated postgres backups and restore ([#58](https://github.com/jordanolv/NookApp/issues/58)) ([3c90f40](https://github.com/jordanolv/NookApp/commit/3c90f4046d3888ea1ac29a026c2271265a99f2d9))
* password reset flow with email ([bc2c32a](https://github.com/jordanolv/NookApp/commit/bc2c32a1b78dcdf36e58bbada1e2301211ed9fb3))
* plugin sdk client + server-driven modal renderer ([c9c04cb](https://github.com/jordanolv/NookApp/commit/c9c04cbd897b485a978849f224981323f17b5a2e))
* plugin sidebar panels with placement choice ([4b3e3b8](https://github.com/jordanolv/NookApp/commit/4b3e3b8138fe19fbd9582092e8d591ca4a9c9b47))
* **plugins:** add plugin sdk, hello-world plugin, and management ui ([#13](https://github.com/jordanolv/NookApp/issues/13)) ([8630c52](https://github.com/jordanolv/NookApp/commit/8630c52c42c4c6abcc7bfe3789b95a1270e5fcf6))
* **plugins:** channel stat registry for type-specific badges ([2758d20](https://github.com/jordanolv/NookApp/commit/2758d20b7bf4cc5cb6c2bdc06ffa4a7fe72ee72f))
* production docker images and compose stack ([3f111e9](https://github.com/jordanolv/NookApp/commit/3f111e92c28baeaa7890e32c9326a29b965bc9de))
* **protocol:** add direct message dtos and socket events ([44d03bc](https://github.com/jordanolv/NookApp/commit/44d03bc06dde14c68eb4a24d13aef3f7f5b8da25))
* **protocol:** add plugin gateway message schemas ([35e9610](https://github.com/jordanolv/NookApp/commit/35e9610e5867c3592e6809dd9d11511fab521c0b))
* **protocol:** channel banner/show-stat fields and map dto updates ([f13b15b](https://github.com/jordanolv/NookApp/commit/f13b15b2a8961768191b0562710e731164a6e1ef))
* **realtime:** add messages, socket.io gateway, and livekit token ([908dad5](https://github.com/jordanolv/NookApp/commit/908dad536f66b638d1954ba4dae3f03769d6c28a))
* **realtime:** add messages, socket.io gateway, and livekit token ([689844f](https://github.com/jordanolv/NookApp/commit/689844ff1ff126bc8a6ab88ab7376ec860d78701))
* **realtime:** handle message update events on the client ([111160e](https://github.com/jordanolv/NookApp/commit/111160ea17d6deaab02026ef8e2c847c33ac16e6))
* **realtime:** persist and restore player last position ([724a999](https://github.com/jordanolv/NookApp/commit/724a999186d8d18473214123a8231084195226ef))
* rgpd account controls and nook dock menu ([#60](https://github.com/jordanolv/NookApp/issues/60)) ([0481db9](https://github.com/jordanolv/NookApp/commit/0481db9b0761749403d45634ce4b33dcf4b76f92))
* roles, widgets, character customization, and ui primitives ([#21](https://github.com/jordanolv/NookApp/issues/21)) ([f9550b5](https://github.com/jordanolv/NookApp/commit/f9550b5fc1a61291489445105ab1430b16bbd0b3))
* route via traefik labels instead of dedicated caddy ([c4b05b6](https://github.com/jordanolv/NookApp/commit/c4b05b66240a255cbef1cb446dbf9291a5ba8078))
* **security:** add rate limiting, helmet and lock socket cors ([#59](https://github.com/jordanolv/NookApp/issues/59)) ([0d39550](https://github.com/jordanolv/NookApp/commit/0d395508ee1a7a0d2efb3b902483e8dc5739f888))
* **servers:** add banner image with upload support ([71c335b](https://github.com/jordanolv/NookApp/commit/71c335bb925c2cbb233cf417fae79177b73df9fb))
* **servers:** add servers, channels, invites CRUD with member schema ([92f8c23](https://github.com/jordanolv/NookApp/commit/92f8c233986188df08a546804ee8b46b9aa65b60))
* **servers:** add servers, channels, invites CRUD with member schema ([6c8848b](https://github.com/jordanolv/NookApp/commit/6c8848b8f66ae5883d97419775a0d7e31cd4e4bd))
* **settings:** add classic interface toggle in appearance tab ([a775624](https://github.com/jordanolv/NookApp/commit/a775624ff665e89591d7e018f961c7debadf75af))
* **sidebar:** draggable and resizable channel rail ([3ca438f](https://github.com/jordanolv/NookApp/commit/3ca438ff1136fbad0fbe1b15a0484522f7dcabaf))
* **sidebar:** rewrite channel rail with DnD, categories, and banner ([e180e8f](https://github.com/jordanolv/NookApp/commit/e180e8fedc36113a07a5938447218616de859f44))
* **ui:** glassmorphism voice bar, icon rail, multi-window chat ([b31ac00](https://github.com/jordanolv/NookApp/commit/b31ac00d1f4afe49be3cfe8eaac5b179fc893923))
* **ui:** persist floating windows and panels per user ([#22](https://github.com/jordanolv/NookApp/issues/22)) ([4f57c9b](https://github.com/jordanolv/NookApp/commit/4f57c9b9d675fb2ec9e3556c9e89c681203af87f))
* **ui:** user status dot with online/busy/away picker, icon-based ping ([8e6f8dc](https://github.com/jordanolv/NookApp/commit/8e6f8dc7421e51bbfead3f2e10325eb764b8a239))
* **uploads:** add file upload endpoint with static file serving ([17cdbea](https://github.com/jordanolv/NookApp/commit/17cdbea5b1bc27fef2ce61f128113b383b04abe6))
* **users:** add account deletion with nook ownership transfer ([639386e](https://github.com/jordanolv/NookApp/commit/639386e976d7ca512d4f7b4345a765175577c8f8))
* **voice:** add camera, screen share, and settings buttons to user dock ([379b3f2](https://github.com/jordanolv/NookApp/commit/379b3f2d5e85422ad8022cc3ab5f46db0ac16b80))
* **voice:** add livekit voice channels with presence in sidebar ([#12](https://github.com/jordanolv/NookApp/issues/12)) ([8a1fa51](https://github.com/jordanolv/NookApp/commit/8a1fa5103c8836a9b602ebede5241d53f2d403de))
* **voice:** add voice member panel ([f7fe3ed](https://github.com/jordanolv/NookApp/commit/f7fe3ed1c47d710277926a0d56acf4e6103a0c4f))
* **voice:** cam bubbles, screen share ring, media panel ([#15](https://github.com/jordanolv/NookApp/issues/15)) ([6ca934b](https://github.com/jordanolv/NookApp/commit/6ca934b0fe7c9470b6919b249715b0678d992866))
* **voice:** redesign voice panel with upward-expanding action buttons ([19f15a5](https://github.com/jordanolv/NookApp/commit/19f15a53431ab63ef7b193c965f5c31da6417229))
* **web:** add developer plugins tab in user settings ([ea94b34](https://github.com/jordanolv/NookApp/commit/ea94b34fde3f2977e3e9167fb3217f43545b9fec))
* **web:** add farmer character variants ([f303b82](https://github.com/jordanolv/NookApp/commit/f303b82e4a8cbbd40a535d673ab59f04901b59a3))
* **web:** add homepage pinned channels ([cffcc5a](https://github.com/jordanolv/NookApp/commit/cffcc5a074805f45dfc6cc0328e5046354fb3fc5))
* **web:** add interface internationalization ([9f9a2ba](https://github.com/jordanolv/NookApp/commit/9f9a2ba1f09f2e73b9da8cef1af440fa20af37dc))
* **web:** add interface preferences composable ([75355e9](https://github.com/jordanolv/NookApp/commit/75355e9209001d8fdcb375b10f7c268380abdd8d))
* **web:** add invite link generation and join flow ([8a690f4](https://github.com/jordanolv/NookApp/commit/8a690f4563d7a36118d8ee0c9150dca5da81caeb))
* **web:** add invite link generation and join flow ([aabcdac](https://github.com/jordanolv/NookApp/commit/aabcdace973851a07be03e9a98a30c7ec2d41ab4))
* **web:** add phaser world with player movement and CG sprite layers ([#10](https://github.com/jordanolv/NookApp/issues/10)) ([0944ca1](https://github.com/jordanolv/NookApp/commit/0944ca12d215d20e6208ed3e70e1d7f7fd62cbca))
* **web:** add real-time chat with socket.io and message history ([b585d32](https://github.com/jordanolv/NookApp/commit/b585d32e98b60f1df25481d539c649e99b42d510))
* **web:** add server list, create server, channel sidebar navigation ([38879d0](https://github.com/jordanolv/NookApp/commit/38879d07fd3b9685f5323e5647d2dce2cfb37e3a))
* **web:** add server list, create server, channel sidebar navigation ([707922d](https://github.com/jordanolv/NookApp/commit/707922da073f76fd1e4fbcdd3ecf36c1f79569d7))
* **web:** import LimeZu build pack and Kenney tilesets ([137d1e9](https://github.com/jordanolv/NookApp/commit/137d1e9a1e68a58ef5d629e79dd426d4c6c89f40))
* **web:** mount classic layout when toggle is enabled ([eabbc5a](https://github.com/jordanolv/NookApp/commit/eabbc5abae19bc1254b6e0f538c367ed9022792f))
* **web:** move activity status picker into user dock menu ([c7317df](https://github.com/jordanolv/NookApp/commit/c7317df5f41e08f4ee2289ddf806fff7cf9ae4d7))
* **web:** notification dock and world HUD overlays ([5cf23f4](https://github.com/jordanolv/NookApp/commit/5cf23f4a90e2047ae0ec19ed9823423cc52e31c1))
* **web:** pages and layouts updated for theme and sidebar ([aca7fc3](https://github.com/jordanolv/NookApp/commit/aca7fc33ef3de9371e15e5ead6a3de78ec06ca8b))
* **web:** server settings modals refresh and plugins modal ([c924d84](https://github.com/jordanolv/NookApp/commit/c924d840816948fe091f29a282c10638e2f5e1c6))
* **web:** sidebar redesign with bottom dock and detached windows ([0ed99e5](https://github.com/jordanolv/NookApp/commit/0ed99e5ae3cc7acd278627a9adfb30f068f4c95a))
* **web:** theme system with toggle and multiple themes ([dbe1b7d](https://github.com/jordanolv/NookApp/commit/dbe1b7de36e71aea814b713be35ec0e9b2b6a260))
* **web:** user settings modal polish ([9db9d68](https://github.com/jordanolv/NookApp/commit/9db9d6814837bc252b4b5ab1430ce087afd77799))
* **web:** voice channels listed in sidebar with active time ([70b9942](https://github.com/jordanolv/NookApp/commit/70b9942d27227e6b7145bbfc52cfee7489f95518))
* **web:** world rendering and build editor refinements ([e7dd070](https://github.com/jordanolv/NookApp/commit/e7dd0709ad6698f35da385a4b14c7bf75fde2def))
* **world:** add click-to-move pathfinding ([0108f97](https://github.com/jordanolv/NookApp/commit/0108f97efc5427d1999d66d875c415292c1af8a3))
* **world:** add loading overlay with walking character ([17ef3de](https://github.com/jordanolv/NookApp/commit/17ef3decf1b8a3a42d613421725515e2435400f7))
* **world:** add map templates for new and existing nooks ([#52](https://github.com/jordanolv/NookApp/issues/52)) ([25acdbb](https://github.com/jordanolv/NookApp/commit/25acdbba63f4b7c09a1fe96209370fcb8168390b))
* **world:** add minimap presence ([504c6b6](https://github.com/jordanolv/NookApp/commit/504c6b6162f7825e4d1528c7eee644357dd7169b))
* **world:** add multiplayer phaser world with socket.io sync ([#11](https://github.com/jordanolv/NookApp/issues/11)) ([8b471fa](https://github.com/jordanolv/NookApp/commit/8b471fa6002dc7fac8fae6ebedd0847ce864ba08))
* **world:** add overlay components and local activity composable ([3ec5a01](https://github.com/jordanolv/NookApp/commit/3ec5a0114dae1a4d60af56ad6d00c1ffd8517258))
* **world:** add player interaction popup on sprite click and E key ([#20](https://github.com/jordanolv/NookApp/issues/20)) ([b566e99](https://github.com/jordanolv/NookApp/commit/b566e996837475444e9ebe6f7e9330ea24772331))
* **world:** add voice rooms with proximity detection and auto-join ([2aac279](https://github.com/jordanolv/NookApp/commit/2aac2796195944441106606cec8863cd6ef79cdc))
* **world:** centralize cg sprite-sheet layout ([57a929f](https://github.com/jordanolv/NookApp/commit/57a929fae4dba1c323561d2e8eed12e1320c700b))
* **world:** exterior decor, collision layer, build bar, character avatar ([49d21ba](https://github.com/jordanolv/NookApp/commit/49d21babf3a8de65dd88bae9d67d5db71b0d5451))
* **world:** floor/wall/decor catalogs and stamp/paint tools ([fef92a8](https://github.com/jordanolv/NookApp/commit/fef92a813420baff1ab7314cff551e1d5168b0b1))
* **world:** rebuild wall and room editor on limezu 3d sheet ([bd777bb](https://github.com/jordanolv/NookApp/commit/bd777bbe2383049e4e9301c3ee435d269c0af15d))


### Corrections

* **api:** add express as direct dependency ([37ed1d7](https://github.com/jordanolv/NookApp/commit/37ed1d7e1dc2b472476180e5cdae42e40a3e10c3))
* **db:** enforce composite primary key on server_plugin ([a3ea188](https://github.com/jordanolv/NookApp/commit/a3ea188a78b2e666c87bf60efe9c128b45edb8c6))
* **deps:** align opentelemetry peer to dedupe drizzle-orm ([893e8ad](https://github.com/jordanolv/NookApp/commit/893e8adf2905bf0aca22abe8ce815b11b86a6f20))
* make MAIL_DRIVER configurable via env (default mailpit) ([2185a5c](https://github.com/jordanolv/NookApp/commit/2185a5cebda7b9bbf1e6de3dad748e5262d9d975))
* **map:** eliminate sub-pixel wall gaps at 1.5x zoom ([#17](https://github.com/jordanolv/NookApp/issues/17)) ([929b476](https://github.com/jordanolv/NookApp/commit/929b476a0274944709946110b204b87aa3a8b75b))
* **ops:** restore executable bit on shell scripts ([ed9b1f2](https://github.com/jordanolv/NookApp/commit/ed9b1f21bbfd30b4204c01d18fcefd12b9545627))
* pin postgres to 17-alpine for stable volume layout ([592335f](https://github.com/jordanolv/NookApp/commit/592335fa5dd2928d783559832b77bf464fced635))
* **plugins:** inline hello-world manifest to fix dist require ([56e88ce](https://github.com/jordanolv/NookApp/commit/56e88ce0db6802972f60795965317f7b344de045))
* **voice:** cancel in-flight join via sequence counter ([e13f4d8](https://github.com/jordanolv/NookApp/commit/e13f4d8005a86bed5c7f5026d5798e3ec2eeeb82))
* **web:** alias @nookapp/protocol to source for client build ([ece5dd2](https://github.com/jordanolv/NookApp/commit/ece5dd2cf9b84ba443b8397683be3c7e1c77f211))
* **web:** refresh hocuspocus token on reconnect ([c33103b](https://github.com/jordanolv/NookApp/commit/c33103baf288409e871677ee854a2a4f56fbe660))
* **web:** use Record instead of Set in messages store ([d3edc84](https://github.com/jordanolv/NookApp/commit/d3edc8483cebc8ceaa2d5501d73ca785f62e8cd7))
* **web:** widen channel-select event type to include keyboard ([d359a84](https://github.com/jordanolv/NookApp/commit/d359a84cc869ef28e44c96f6db973412f279d03e))
* **world:** center player in visible viewport accounting for sidebar ([e4b6ac4](https://github.com/jordanolv/NookApp/commit/e4b6ac40947dcd7ee69d679092874d68b193893c))
* **world:** guard player:moved to prevent ghost respawn ([bacae9f](https://github.com/jordanolv/NookApp/commit/bacae9fb725367b7f3edc80ea36f7596a7fbc5c0))
* **world:** remove voice leave grace period — rooms have hard boundaries ([ddc895f](https://github.com/jordanolv/NookApp/commit/ddc895fe73e07839cc035f7756af51cff9184e89))
* **world:** restyle object label with theme tokens ([51b24ff](https://github.com/jordanolv/NookApp/commit/51b24ff234543a71db36268637ca7309518c03b7))


### Refactorisations

* **chat:** split MessageInput into EmojiPicker and GifPicker ([9ebf24a](https://github.com/jordanolv/NookApp/commit/9ebf24aa853264c2a60ed9d6ec228c9810243275))
* **classic:** extract HomeBanner and useServerHomeData composable ([2e500b5](https://github.com/jordanolv/NookApp/commit/2e500b51dfc5a3b4d558360a30eb4b96ba77a45f))
* **classic:** redesign lobby and board view as phpbb-style tables ([82cf771](https://github.com/jordanolv/NookApp/commit/82cf771d55418a81dfe33339965d882e6f202339))
* **classic:** swap to floating-window + widget-bar layout ([59d0604](https://github.com/jordanolv/NookApp/commit/59d0604fcabe4722dcdacadec995cdf6dcc48d03))
* **layout:** extract ChannelCard and channel formatting helpers ([375610d](https://github.com/jordanolv/NookApp/commit/375610d10adb2f9d0af6da251c96f760905b0772))
* **protocol:** drop dead dto.ts and flatten root re-exports ([28d5eab](https://github.com/jordanolv/NookApp/commit/28d5eabf8d49775aecc94d65b3c6a5e195c8728a))
* **voice:** split useVoice into voice/ feature folder ([fa14a61](https://github.com/jordanolv/NookApp/commit/fa14a6141e9e8c799702d7a76d33ccb91a742810))
* **web:** finalize world overlay migration to vue reactive state ([0cb08c6](https://github.com/jordanolv/NookApp/commit/0cb08c6c9602fab952d7852ff7c5f6ae1e42a7f8))
* **web:** persist character in user.ui_layout ([0a4815a](https://github.com/jordanolv/NookApp/commit/0a4815abb6f012ef6c3083b3d019b1c799ef98b3))
* **web:** split server page into focused composables and components ([462ab41](https://github.com/jordanolv/NookApp/commit/462ab4133551a0c6f2c0adcf73fdca9aa18b4584))
* **widgets:** extract GameComposer and topic/queue composables ([671df13](https://github.com/jordanolv/NookApp/commit/671df1317514d772c11251c76ef3d8c7432ed6f8))
* **world:** emit voice rooms separately and reuse overlay buffers ([cc93fe6](https://github.com/jordanolv/NookApp/commit/cc93fe65924cb64d5c914d23c5de0a16b99460b3))
* **world:** extract BuildWallPicker and useDraggablePanel ([bf75878](https://github.com/jordanolv/NookApp/commit/bf7587810c80cbd91ca575c49410b1741baf15bb))
* **world:** extract useMinimapPosition composable ([e350cd1](https://github.com/jordanolv/NookApp/commit/e350cd1e1be250109d035bd48197d50e899ecc82))
* **world:** remove click-to-move and pathfinding ([2371329](https://github.com/jordanolv/NookApp/commit/23713291282886a84124b24939a7d4c393072a95))
* **world:** split nook scene into feature subsystems ([5d5b9a1](https://github.com/jordanolv/NookApp/commit/5d5b9a1eeaedb369a6d3e34f63fad3ee9aeca5be))
* **world:** split NookWorld with overlays and zone-picker ([7f6aefa](https://github.com/jordanolv/NookApp/commit/7f6aefa3dd26db0fcc92eaa9416c6ae2a33c140f))

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
