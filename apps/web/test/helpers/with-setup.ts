import { createApp, defineComponent, h } from 'vue';

/**
 * Runs a composable inside a real component instance so `onMounted` /
 * `onUnmounted` hooks fire. Without an instance Vue warns and never runs them,
 * which would silently hide the cleanup paths we want to assert.
 */
export function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;

  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => h('div');
      },
    }),
  );

  const host = document.createElement('div');
  document.body.appendChild(host);
  app.mount(host);

  return {
    result,
    unmount: () => {
      app.unmount();
      host.remove();
    },
  };
}
