import type { PluginDefinition } from '@nookapp/plugin-sdk';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const manifest = require('./plugin.json') as import('@nookapp/plugin-sdk').PluginManifest;

export const helloWorldPlugin: PluginDefinition = {
  manifest,
  initialize(ctx) {
    ctx.commands.register('hello', (_args, cmdCtx) => {
      return `👋 Hello, ${cmdCtx.userName}!`;
    });
  },
};
