"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorldPlugin = void 0;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const manifest = require('./plugin.json');
exports.helloWorldPlugin = {
    manifest,
    initialize(ctx) {
        ctx.commands.register('hello', (_args, cmdCtx) => {
            return `👋 Hello, ${cmdCtx.userName}!`;
        });
        ctx.commands.register('ping', (_args, cmdCtx) => {
            return `🏓 Pong! (from server ${cmdCtx.serverId})`;
        });
        ctx.commands.register('count', async (_args) => {
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
