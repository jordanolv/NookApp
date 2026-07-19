<template>
  <div class="min-h-full">
    <div class="fixed right-4 top-4 z-20 flex items-center gap-2">
      <PublicHeaderCta />
      <ThemeToggle />
      <LocaleSwitcher />
    </div>
    <div id="main-content" tabindex="-1">
      <slot />
    </div>
  </div>
</template>
