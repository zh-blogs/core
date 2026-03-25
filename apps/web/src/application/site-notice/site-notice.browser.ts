import {
  DEFAULT_SITE_NOTICE_DURATION_MS,
  getLegacyDomainNoticeFromUrl,
  SITE_NOTICE_OPEN_EVENT,
  type SiteNoticePayload,
  type SiteNoticeTone,
} from './site-notice.service';

type NoticeStackWindow = Window & {
  ZhblogsNotice?: {
    close: (id?: string) => void;
    open: (payload: SiteNoticePayload) => string;
  };
};

export function initSiteNoticeCenter(stack: HTMLElement, template: HTMLTemplateElement): void {
  const toneTokens: Record<SiteNoticeTone, { color: string; dot: string }> = {
    info: {
      color: 'var(--color-info)',
      dot: 'var(--color-info-dot)',
    },
    neutral: {
      color: 'var(--color-fg-3)',
      dot: 'var(--color-info-dot)',
    },
    warning: {
      color: 'var(--color-warn)',
      dot: 'var(--color-warn-dot)',
    },
    success: {
      color: 'var(--color-ok)',
      dot: 'var(--color-ok-dot)',
    },
    error: {
      color: 'var(--color-fail)',
      dot: 'var(--color-fail-dot)',
    },
  };

  const closeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const remainingDurations = new Map<string, number>();
  const timerStarts = new Map<string, number>();
  let noticeIndex = 0;

  const findNotice = (id: string): HTMLElement | undefined =>
    [...stack.children].find(
      (candidate): candidate is HTMLElement =>
        candidate instanceof HTMLElement && candidate.dataset.noticeId === id,
    );

  const clearCloseTimer = (id: string) => {
    const timer = closeTimers.get(id);

    if (timer) {
      window.clearTimeout(timer);
      closeTimers.delete(id);
    }
  };

  const clearNoticeState = (id: string) => {
    clearCloseTimer(id);
    remainingDurations.delete(id);
    timerStarts.delete(id);
  };

  const pauseClose = (id: string) => {
    const remaining = remainingDurations.get(id);
    const startedAt = timerStarts.get(id);

    if (typeof remaining !== 'number' || typeof startedAt !== 'number') {
      clearCloseTimer(id);
      return;
    }

    const elapsed = Date.now() - startedAt;
    remainingDurations.set(id, Math.max(0, remaining - elapsed));
    timerStarts.delete(id);
    clearCloseTimer(id);
  };

  const closeNotice = (id?: string) => {
    const target =
      typeof id === 'string' && id
        ? findNotice(id)
        : stack.firstElementChild instanceof HTMLElement
          ? stack.firstElementChild
          : null;

    if (!target) {
      return;
    }

    const targetId = target.dataset.noticeId;

    if (!targetId) {
      target.remove();
      return;
    }

    if (target.dataset.state === 'closing') {
      return;
    }

    clearNoticeState(targetId);
    target.dataset.state = 'closing';

    setTimeout(() => {
      target.remove();
    }, 180);
  };

  const scheduleClose = (id: string) => {
    const remaining = remainingDurations.get(id);

    if (typeof remaining !== 'number' || remaining <= 0) {
      return;
    }

    clearCloseTimer(id);
    timerStarts.set(id, Date.now());
    closeTimers.set(
      id,
      setTimeout(() => {
        closeNotice(id);
      }, remaining),
    );
  };

  const buildNotice = (payload: SiteNoticePayload, id: string) => {
    const element = template.content.firstElementChild?.cloneNode(true);

    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const title = element.querySelector('[data-site-notice-title]');
    const message = element.querySelector('[data-site-notice-message]');
    const closeAction = element.querySelector('[data-site-notice-close]');
    const progress = element.querySelector('[data-site-notice-progress]');
    const progressBar = element.querySelector('[data-site-notice-progress-bar]');

    if (
      !(title instanceof HTMLElement) ||
      !(message instanceof HTMLElement) ||
      !(closeAction instanceof HTMLButtonElement) ||
      !(progress instanceof HTMLElement) ||
      !(progressBar instanceof HTMLElement)
    ) {
      return null;
    }

    const tokens = toneTokens[payload.tone ?? 'warning'];
    const durationMs =
      payload.durationMs === undefined ? DEFAULT_SITE_NOTICE_DURATION_MS : payload.durationMs;

    element.dataset.noticeId = id;
    element.dataset.state = 'idle';
    element.style.borderColor = `color-mix(in srgb, ${tokens.color} 55%, var(--color-line-med))`;
    element.style.setProperty('--site-notice-accent', tokens.dot);
    element.style.setProperty(
      '--site-notice-accent-soft',
      `color-mix(in srgb, ${tokens.dot} 18%, transparent)`,
    );
    title.textContent = payload.title;
    message.textContent = payload.message;

    const resumeTimer = () => {
      if (typeof durationMs !== 'number' || durationMs <= 0) {
        return;
      }

      progressBar.style.animationPlayState = 'running';
      scheduleClose(id);
    };

    closeAction.addEventListener('click', () => closeNotice(id));

    if (typeof durationMs === 'number' && durationMs > 0) {
      progress.hidden = false;
      progressBar.style.animationDuration = `${durationMs}ms`;
      progressBar.style.animationPlayState = 'running';
      progressBar.style.animationName = 'site-notice-progress';
      remainingDurations.set(id, durationMs);

      element.addEventListener('mouseenter', () => {
        pauseClose(id);
        progressBar.style.animationPlayState = 'paused';
      });
      element.addEventListener('mouseleave', resumeTimer);
    } else {
      progress.hidden = true;
    }

    return {
      element,
      resumeTimer,
    };
  };

  const openNotice = (payload: SiteNoticePayload): string => {
    noticeIndex += 1;
    const id = payload.id?.trim() || `site-notice-${Date.now()}-${noticeIndex}`;
    const existing = findNotice(id);

    if (existing) {
      existing.remove();
      clearNoticeState(id);
    }

    const result = buildNotice(payload, id);

    if (!result) {
      console.error('site notice item could not be created');
      return id;
    }

    stack.prepend(result.element);
    requestAnimationFrame(() => {
      result.element.dataset.state = 'open';
    });
    result.resumeTimer();

    return id;
  };

  (window as NoticeStackWindow).ZhblogsNotice = {
    close: closeNotice,
    open: openNotice,
  };

  window.addEventListener(SITE_NOTICE_OPEN_EVENT, (event) => {
    const notice = (event as CustomEvent<SiteNoticePayload>).detail;

    if (!notice) {
      return;
    }

    openNotice(notice);
  });

  const initialNotice = getLegacyDomainNoticeFromUrl(window.location.href);

  if (initialNotice) {
    openNotice(initialNotice);
  }
}
