import { describe, expect, it } from 'vitest';

import {
  hasConfirmedWeakDuplicateReview,
  reviewSiteDuplicates,
} from '@/domain/sites/service/site-duplicate-review.service';

describe('reviewSiteDuplicates', () => {
  it('marks hostname matches as strong duplicates and same-name public sites as weak duplicates', () => {
    const result = reviewSiteDuplicates(
      [
        {
          id: '11111111-1111-4111-8111-111111111111',
          bid: 'visible-host',
          name: 'Visible Host',
          url: 'https://example.com/archive',
          is_show: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          bid: 'visible-name',
          name: 'Example Blog',
          url: 'https://example.net',
          is_show: true,
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          bid: 'hidden-name',
          name: 'Example Blog',
          url: 'https://hidden.example.net',
          is_show: false,
        },
      ],
      {
        bid: null,
        name: 'Example Blog',
        url: 'https://example.com',
      },
    );

    expect(result.strong).toEqual([
      {
        site_id: '11111111-1111-4111-8111-111111111111',
        bid: 'visible-host',
        name: 'Visible Host',
        url: 'https://example.com/archive',
        visibility: 'VISIBLE',
        reason: '站点域名一致',
      },
    ]);
    expect(result.weak).toEqual([
      {
        site_id: '22222222-2222-4222-8222-222222222222',
        bid: 'visible-name',
        name: 'Example Blog',
        url: 'https://example.net',
        visibility: 'VISIBLE',
        reason: '站点名称一致',
      },
    ]);
  });

  it('treats same registrable-domain label with different suffix as a weak duplicate', () => {
    const result = reviewSiteDuplicates(
      [
        {
          id: '44444444-4444-4444-8444-444444444444',
          bid: null,
          name: 'Different Name',
          url: 'https://blog.example.net',
          is_show: true,
        },
      ],
      {
        bid: null,
        name: 'Another Blog',
        url: 'https://example.com',
      },
    );

    expect(result.strong).toEqual([]);
    expect(result.weak).toEqual([
      {
        site_id: '44444444-4444-4444-8444-444444444444',
        bid: null,
        name: 'Different Name',
        url: 'https://blog.example.net',
        visibility: 'VISIBLE',
        reason: '主域标识一致但后缀不同',
      },
    ]);
  });
});

describe('hasConfirmedWeakDuplicateReview', () => {
  it('only accepts exact candidate id confirmation sets', () => {
    const weakCandidates = [
      {
        site_id: '55555555-5555-4555-8555-555555555555',
        bid: null,
        name: 'Example Blog',
        url: 'https://example.net',
        visibility: 'VISIBLE' as const,
        reason: '站点名称一致',
      },
    ];

    expect(
      hasConfirmedWeakDuplicateReview(weakCandidates, ['55555555-5555-4555-8555-555555555555']),
    ).toBe(true);
    expect(hasConfirmedWeakDuplicateReview(weakCandidates, [])).toBe(false);
    expect(
      hasConfirmedWeakDuplicateReview(weakCandidates, ['66666666-6666-4666-8666-666666666666']),
    ).toBe(false);
  });
});
