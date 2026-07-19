import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Comportement clavier attendu d'une boite de dialogue modale :
 * fermeture par Echap, focus deplace dedans a l'ouverture, focus contraint
 * tant qu'elle est ouverte, et focus rendu a l'element declencheur ensuite.
 *
 * Regroupe ici plutot que duplique dans chaque modale : ces quatre regles vont
 * ensemble, et une modale qui n'en applique que la moitie n'est pas navigable
 * au clavier.
 */
export function useDialogA11y(
  open: Ref<boolean>,
  panel: Ref<HTMLElement | null>,
  close: () => void,
) {
  let declencheur: HTMLElement | null = null;

  function focusables(): HTMLElement[] {
    if (!panel.value) return [];
    return Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open.value) return;

    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }

    if (e.key !== 'Tab') return;

    const cibles = focusables();
    if (!cibles.length) {
      // Sans cible focusable, la tabulation sortirait de la boite : on la bloque.
      e.preventDefault();
      return;
    }

    const premier = cibles[0]!;
    const dernier = cibles[cibles.length - 1]!;
    const actif = document.activeElement;

    if (e.shiftKey && (actif === premier || !panel.value?.contains(actif))) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && actif === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  watch(
    open,
    async (ouvert, avant) => {
      if (ouvert) {
        declencheur = document.activeElement as HTMLElement | null;
        document.addEventListener('keydown', onKeydown, true);
        // Le panneau n'est monte qu'apres le rendu declenche par `open`.
        await nextTick();
        (focusables()[0] ?? panel.value)?.focus();
        return;
      }

      if (avant) {
        document.removeEventListener('keydown', onKeydown, true);
        declencheur?.focus();
        declencheur = null;
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true));
}
