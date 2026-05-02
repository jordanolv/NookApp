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
    },
};
