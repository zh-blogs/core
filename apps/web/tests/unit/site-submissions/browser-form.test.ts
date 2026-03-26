import { describe, expect, it } from 'vitest';

import {
  applyProgramCustomToForm,
  applyProgramOptionToForm,
} from '@/application/site-submission/site-submission.browser-form';
import { createInitialCreateForm } from '@/application/site-submission/site-submission.service';

describe('site submission browser form helpers', () => {
  it('clears custom program metadata when switching to an existing program option', () => {
    const form = createInitialCreateForm();

    applyProgramCustomToForm(form, 'My Blog Engine');
    form.architecture_program_is_open_source = true;
    form.architecture_website_url = 'https://example.com';
    form.architecture_repo_url = 'https://github.com/example/project';
    form.architecture_framework_ids = ['framework-1'];
    form.architecture_framework_custom_names = ['UnoCSS'];
    form.architecture_language_ids = ['language-1'];
    form.architecture_language_custom_names = ['TypeScript'];

    applyProgramOptionToForm(form, 'program-id-1');

    expect(form.architecture_program_id).toBe('program-id-1');
    expect(form.architecture_program_name).toBe('');
    expect(form.architecture_program_is_open_source).toBeNull();
    expect(form.architecture_website_url).toBe('');
    expect(form.architecture_repo_url).toBe('');
    expect(form.architecture_framework_ids).toEqual([]);
    expect(form.architecture_framework_custom_names).toEqual([]);
    expect(form.architecture_language_ids).toEqual([]);
    expect(form.architecture_language_custom_names).toEqual([]);
  });
});
