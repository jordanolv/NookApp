<script setup lang="ts">
useHead({ title: 'Politique de confidentialité — NookApp' });
</script>

<template>
  <main class="legal">
    <NuxtLink to="/" class="legal__back">← NookApp</NuxtLink>
    <h1>Politique de confidentialité</h1>
    <p class="legal__updated">Dernière mise à jour : 7 juin 2026</p>

    <h2>1. Responsable du traitement</h2>
    <p>
      NookApp est responsable du traitement des données personnelles collectées via la plateforme.
      Pour toute question : <a href="mailto:contact@nookapp.eu">contact@nookapp.eu</a>.
    </p>

    <h2>2. Données collectées</h2>
    <ul>
      <li><strong>Compte</strong> : adresse email, pseudo, identifiant unique (handle).</li>
      <li>
        <strong>Contenu</strong> : messages, Nooks, cartes et objets que tu crées, préférences
        d'interface.
      </li>
      <li>
        <strong>Techniques</strong> : adresse IP et journaux de connexion (sécurité, anti-abus).
      </li>
    </ul>

    <h2>3. Finalités et base légale</h2>
    <p>
      Les données servent à fournir le service (exécution du contrat), sécuriser la plateforme
      (intérêt légitime) et t'envoyer les emails nécessaires au compte (vérification, mot de passe).
    </p>

    <h2>4. Durée de conservation</h2>
    <p>
      Les données sont conservées tant que ton compte existe. À la suppression du compte, elles sont
      effacées immédiatement (voir section 6). Les journaux techniques sont conservés au maximum 12
      mois.
    </p>

    <h2>5. Sous-traitants</h2>
    <ul>
      <li><strong>OVH</strong> — hébergement (Union européenne).</li>
      <li><strong>Resend</strong> — envoi des emails transactionnels.</li>
      <li><strong>LiveKit</strong> — flux audio et vidéo des salons vocaux.</li>
    </ul>

    <h2>6. Tes droits</h2>
    <p>
      Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, de
      portabilité et d'opposition. Tu peux supprimer ton compte et l'ensemble de tes données à tout
      moment depuis <em>Paramètres → Profil → Zone de danger</em>. Pour les autres demandes, écris à
      <a href="mailto:contact@nookapp.eu">contact@nookapp.eu</a>.
    </p>

    <h2>7. Cookies</h2>
    <p>
      NookApp utilise uniquement un cookie de session nécessaire à l'authentification. Aucun cookie
      publicitaire ni de traçage tiers n'est utilisé.
    </p>

    <p class="legal__links">
      <NuxtLink to="/legal/terms">Conditions d'utilisation</NuxtLink>
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
