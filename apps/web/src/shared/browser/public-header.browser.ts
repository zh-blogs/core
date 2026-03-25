export function initPublicHeader(): void {
  const init = () => {
    const header = document.querySelector('[data-public-header]');

    if (!(header instanceof HTMLElement)) {
      return;
    }

    const mobilePanel = header.querySelector('[data-mobile-panel]');
    const mobileToggle = header.querySelector('[data-mobile-toggle]');

    const setBrandVisible = (visible: boolean) => {
      header.querySelectorAll('[data-brand-shell], [data-brand-node]').forEach((node) => {
        if (node instanceof HTMLElement) {
          node.dataset.visible = visible ? 'true' : 'false';
        }
      });
    };

    const setMobileOpen = (open: boolean) => {
      if (!(mobilePanel instanceof HTMLElement) || !(mobileToggle instanceof HTMLElement)) {
        return;
      }

      mobilePanel.classList.toggle('hidden', !open);
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileToggle.querySelectorAll('[data-open]').forEach((icon) => {
        if (icon instanceof HTMLElement) {
          icon.dataset.open = open ? 'true' : 'false';
        }
      });
    };

    const closeMenus = (except?: HTMLElement) => {
      header.querySelectorAll('[data-menu-root], [data-submit-root]').forEach((root) => {
        if (!(root instanceof HTMLElement) || root === except) {
          return;
        }

        root.dataset.open = 'false';

        const toggle = root.querySelector('[aria-expanded]');

        if (toggle instanceof HTMLElement) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    };

    const syncBrandVisibility = () => {
      if (header.dataset.home !== 'true') {
        setBrandVisible(true);
        return;
      }

      const hero = document.querySelector('[data-home-hero]');

      if (!(hero instanceof HTMLElement)) {
        setBrandVisible(false);
        return;
      }

      const heroBottom = hero.getBoundingClientRect().bottom;
      const threshold = header.offsetHeight + 12;

      setBrandVisible(heroBottom <= threshold);
    };

    setMobileOpen(false);
    syncBrandVisibility();

    header.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const mobileTarget = target.closest('[data-mobile-toggle]');

      if (mobileTarget) {
        event.preventDefault();
        const nextOpen = mobileTarget.getAttribute('aria-expanded') !== 'true';
        setMobileOpen(nextOpen);
        return;
      }

      const toggle = target.closest('[data-menu-toggle], [data-submit-toggle]');

      if (toggle) {
        const root = toggle.closest('[data-menu-root], [data-submit-root]');

        if (!(root instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();

        const nextOpen = root.dataset.open !== 'true';

        closeMenus(root);
        root.dataset.open = nextOpen ? 'true' : 'false';
        toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        return;
      }

      if (target.closest('[data-mobile-panel] a[href]')) {
        setMobileOpen(false);
        closeMenus();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof Element) || target.closest('[data-public-header]')) {
        return;
      }

      closeMenus();
      setMobileOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenus();
        setMobileOpen(false);
      }
    });

    window.addEventListener('scroll', syncBrandVisibility, { passive: true });
    window.addEventListener('resize', () => {
      syncBrandVisibility();

      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
