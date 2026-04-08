import { describe, expect, it } from 'vitest';

import {
  buildRestoreSubmissionPayload,
  createInitialRestoreForm,
} from '@/application/site-submission/site-submission.service';

describe('buildRestoreSubmissionPayload', () => {
  it('builds a restore request payload after normalizing contact fields', () => {
    const form = createInitialRestoreForm();

    form.submitter_name = ' Alice ';
    form.submitter_email = 'Alice@Example.com ';
    form.restore_reason = ' 站点已恢复正常访问 ';
    form.notify_by_email = true;
    form.agree_terms = true;

    expect(buildRestoreSubmissionPayload('11111111-1111-7111-8111-111111111111', form)).toEqual({
      ok: true,
      data: {
        site_id: '11111111-1111-7111-8111-111111111111',
        submitter_name: 'Alice',
        submitter_email: 'alice@example.com',
        restore_reason: '站点已恢复正常访问',
        notify_by_email: true,
      },
    });
  });

  it('returns field errors when restore reason, agreement, or site id is invalid', () => {
    const form = createInitialRestoreForm();

    form.restore_reason = '';
    form.agree_terms = false;

    expect(buildRestoreSubmissionPayload('invalid-site-id', form)).toEqual({
      ok: false,
      fieldErrors: {
        agree_terms: '请先勾选同意协议。',
        restore_reason: '请填写恢复说明。',
        site_id: '恢复目标无效，请从重复提示重新进入。',
      },
      formError: '请先修正表单字段。',
    });
  });
});
