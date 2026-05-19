'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.helloWorldPlugin = void 0;
const manifest = require('./plugin.json');
exports.helloWorldPlugin = {
  manifest,
  initialize(ctx) {
    ctx.commands.register('hello', (_args, cmdCtx) => {
      void _args;
      return `👋 Hello, ${cmdCtx.userName}!`;
    });
    ctx.commands.register('ping', (_args, cmdCtx) => {
      void _args;
      return `🏓 Pong! (from server ${cmdCtx.serverId})`;
    });
    ctx.commands.register('count', async () => {
      const current = (await ctx.storage.get('count')) ?? 0;
      const next = current + 1;
      await ctx.storage.set('count', next);
      return `Counter: ${next}`;
    });
    ctx.events.on('player:joined', (player) => {
      const p = player;
      ctx.broadcast.emit('message:sent', {
        id: `hello-bot-${Date.now()}`,
        channelId: 'system',
        authorId: 'plugin:hello-world',
        content: `👋 Welcome to the server, ${p.name}!`,
        createdAt: new Date().toISOString(),
        editedAt: null,
      });
    });
  },
};
