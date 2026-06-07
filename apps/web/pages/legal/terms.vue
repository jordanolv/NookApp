<script setup lang="ts">
useHead({ title: "Conditions d'utilisation — NookApp" });
</script>

<template>
  <main class="legal">
    <NuxtLink to="/" class="legal__back">← NookApp</NuxtLink>
    <h1>Conditions d'utilisation</h1>
    <p class="legal__updated">Dernière mise à jour : 7 juin 2026</p>

    <h2>1. Objet</h2>
    <p>
      NookApp est une plateforme de bureaux virtuels permettant de créer des espaces (Nooks), d'y
      discuter, de parler en vocal et d'y jouer. En créant un compte, tu acceptes ces conditions.
    </p>

    <h2>2. Compte</h2>
    <p>
      Tu es responsable de la confidentialité de tes identifiants et de l'activité sur ton compte.
      Tu dois avoir au moins 15 ans pour utiliser le service.
    </p>

    <h2>3. Usage acceptable</h2>
    <p>Tu t'engages à ne pas utiliser NookApp pour :</p>
    <ul>
      <li>diffuser des contenus illégaux, haineux ou portant atteinte à autrui ;</li>
      <li>harceler d'autres utilisateurs ou usurper une identité ;</li>
      <li>compromettre la sécurité ou la disponibilité de la plateforme.</li>
    </ul>

    <h2>4. Contenu utilisateur</h2>
    <p>
      Tu restes propriétaire du contenu que tu publies. Tu es seul responsable de ce contenu et nous
      accordes le droit de l'héberger et de l'afficher dans le cadre du service.
    </p>

    <h2>5. Plugins et paiements</h2>
    <p>
      Certains plugins sont payants par abonnement, par Nook. L'accès au plugin est actif tant que
      l'abonnement correspondant est en cours de validité.
    </p>

    <h2>6. Disponibilité</h2>
    <p>
      Le service est fourni « en l'état », sans garantie de disponibilité ininterrompue. Nous
      pouvons faire évoluer ou suspendre des fonctionnalités.
    </p>

    <h2>7. Résiliation</h2>
    <p>
      Tu peux supprimer ton compte à tout moment depuis
      <em>Paramètres → Profil → Zone de danger</em>. Nous pouvons suspendre un compte en cas de
      violation de ces conditions.
    </p>

    <h2>8. Droit applicable</h2>
    <p>Ces conditions sont régies par le droit français.</p>

    <p class="legal__links">
      <NuxtLink to="/legal/privacy">Politique de confidentialité</NuxtLink>
    </p>
  </main>
</template>

<style scoped>
.legal {
  max-width: 720px;
  margin: 0 auto;
  padding: 64px 24px 96px;
  color: var(--ink);
  line-height: 1.7;
}
.legal__back {
  display: inline-block;
  margin-bottom: 32px;
  font-weight: 600;
  color: var(--ink-muted);
}
.legal h1 {
  font-size: 1.8rem;
  font-weight: 700;
}
.legal__updated {
  color: var(--ink-faint);
  font-size: 0.85rem;
  margin-top: 4px;
}
.legal h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 8px;
}
.legal ul {
  list-style: disc;
  padding-left: 22px;
}
.legal a {
  color: #5865f2;
}
.legal__links {
  margin-top: 48px;
  border-top: 1px solid var(--surface-border);
  padding-top: 24px;
}
</style>
