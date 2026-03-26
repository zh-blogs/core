const VIEWPORT_PADDING_PX = 16;
const POPOVER_GAP_PX = 12;

type BuildInfoPopoverElements = {
  root: HTMLElement;
  trigger: HTMLElement;
  panel: HTMLElement;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isPopoverActive(root: HTMLElement): boolean {
  return root.matches(':hover') || root.matches(':focus-within');
}

function readViewportBounds() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function positionPopover({ root, trigger, panel }: BuildInfoPopoverElements): void {
  const rootRect = root.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewport = readViewportBounds();
  const minLeft = viewport.left + VIEWPORT_PADDING_PX;
  const maxLeft = Math.max(minLeft, viewport.right - VIEWPORT_PADDING_PX - panelRect.width);
  const preferredLeft = triggerRect.left + (triggerRect.width - panelRect.width) / 2;
  const nextLeft = clamp(preferredLeft, minLeft, maxLeft);
  const spaceAbove = triggerRect.top - viewport.top - VIEWPORT_PADDING_PX - POPOVER_GAP_PX;
  const spaceBelow = viewport.bottom - triggerRect.bottom - VIEWPORT_PADDING_PX - POPOVER_GAP_PX;
  const canFitAbove = spaceAbove >= panelRect.height;
  const canFitBelow = spaceBelow >= panelRect.height;
  const placeAbove = canFitAbove || (!canFitBelow && spaceAbove >= spaceBelow);
  const preferredTop = placeAbove
    ? triggerRect.top - panelRect.height - POPOVER_GAP_PX
    : triggerRect.bottom + POPOVER_GAP_PX;
  const minTop = viewport.top + VIEWPORT_PADDING_PX;
  const maxTop = Math.max(minTop, viewport.bottom - VIEWPORT_PADDING_PX - panelRect.height);
  const nextTop = clamp(preferredTop, minTop, maxTop);

  panel.dataset.popoverSide = placeAbove ? 'above' : 'below';
  panel.style.left = `${Math.round(nextLeft - rootRect.left)}px`;
  panel.style.top = `${Math.round(nextTop - rootRect.top)}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
}

function bindPopover(root: HTMLElement) {
  const trigger = root.querySelector('[data-build-info-trigger]');
  const panel = root.querySelector('[data-build-info-panel]');

  if (!(trigger instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
    return null;
  }

  let frameId = 0;

  const schedulePosition = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;

      if (!isPopoverActive(root)) {
        return;
      }

      positionPopover({ root, trigger, panel });
    });
  };

  const resizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          schedulePosition();
        })
      : null;

  root.addEventListener('mouseenter', schedulePosition);
  root.addEventListener('focusin', schedulePosition);
  trigger.addEventListener('click', schedulePosition);
  window.addEventListener('resize', schedulePosition, { passive: true });
  window.addEventListener('scroll', schedulePosition, { passive: true });
  window.visualViewport?.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('scroll', schedulePosition);
  resizeObserver?.observe(trigger);
  resizeObserver?.observe(panel);

  return () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }

    root.removeEventListener('mouseenter', schedulePosition);
    root.removeEventListener('focusin', schedulePosition);
    trigger.removeEventListener('click', schedulePosition);
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('scroll', schedulePosition);
    window.visualViewport?.removeEventListener('resize', schedulePosition);
    window.visualViewport?.removeEventListener('scroll', schedulePosition);
    resizeObserver?.disconnect();
  };
}

export function initBuildFooterPopover() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const cleanups = Array.from(document.querySelectorAll('[data-build-info-root]'))
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .map((root) => bindPopover(root))
    .filter((cleanup): cleanup is () => void => cleanup !== null);

  if (cleanups.length === 0) {
    return null;
  }

  return {
    destroy() {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    },
  };
}
