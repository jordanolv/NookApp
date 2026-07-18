<template>
  <div id="main-content" class="app-shell" tabindex="-1">
    <slot />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--page-bg);
  color: var(--ink);
}
</style>
