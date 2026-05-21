# Example bot

Reference plugin for NookApp. Demonstrates the feature-based architecture: one
bot ships multiple features, each exposing its own commands, menus and event
handlers.

## Layout

```
src/
  index.ts            entry — instantiates the client and registers features
  features/
    casino.ts         "Casino" feature (slot, roulette stubs)
    cards.ts          "Card Collector" feature (inventory, trading stubs)
```

Each feature exports a `registerXxxFeature(plugin)` function that grabs a
`plugin.feature(id, info)` builder and chains `.addCommand()`, `.addMenu()`,
`.onInteraction()`, `.onEvent()`.

## Running

1. Create a plugin in the web app (User settings → Developer → Create plugin)
   and copy the API key.
2. Install it on a Nook (Server settings → Plugins → Install).
3. Run:

```
API_KEY=npk_… pnpm -F @nookapp/example-bot start
```

The bot connects, advertises its two features, and waits for commands or menu
opens. Commands and panels are stubs — fill them with real logic.
