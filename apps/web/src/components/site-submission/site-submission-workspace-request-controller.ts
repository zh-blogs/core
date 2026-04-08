import {
  requestResolvedSite,
  requestSearchSites,
  requestSiteAutoFill,
  requestSubmissionMutation,
  requestSubmissionOptions,
  requestSubmissionQuery,
  type SubmissionMutationEndpoint,
} from '@/application/site-submission/site-submission.browser-actions';
import { clearSubmissionIdentifierSearchParams } from '@/application/site-submission/site-submission.browser-feedback';
import {
  applyAutoFillToForm,
  createEmptyAutoFillMissingState,
} from '@/application/site-submission/site-submission.browser-workspace';
import {
  buildCreateSubmissionPayload,
  buildDeleteSubmissionPayload,
  buildSubmissionQueryPayload,
  buildUpdateSubmissionPayload,
  createInitialCreateForm,
  createInitialDeleteForm,
  createInitialUpdateForm,
  createUpdateFormFromResolvedSite,
  type FieldErrors,
  isHttpUrl,
  type SiteResolveRequest,
  type SubmissionResult,
  trimText,
} from '@/application/site-submission/site-submission.service';
import { openSubmissionToast } from '@/shared/browser/submission-toast.service';

import { AUTO_FILL_ALL_MISSING } from './site-submission-workspace.constants';
import type { SiteSubmissionWorkspaceControllerContext } from './site-submission-workspace.types';
import type { createSiteSubmissionWorkspaceFormController } from './site-submission-workspace-form-controller';

type FormController = ReturnType<typeof createSiteSubmissionWorkspaceFormController>;

export function createSiteSubmissionWorkspaceRequestController(
  context: SiteSubmissionWorkspaceControllerContext,
  formController: FormController,
) {
  const resetCreateSubmissionState = (): void => {
    context.forms.create.set(createInitialCreateForm());
    context.errors.create.set({});
    context.success.create.set(null);
    context.autoFillMissing.create.set(createEmptyAutoFillMissingState());
    context.programPicker.create.set('');
  };

  const resetResolvedSubmissionState = (): void => {
    context.search.query.set('');
    context.search.results.set([]);
    context.search.error.set(null);
    context.search.selectedSite.set(null);
    context.forms.update.set(createInitialUpdateForm());
    context.forms.delete.set(createInitialDeleteForm());
    context.errors.update.set({});
    context.errors.delete.set({});
    context.success.update.set(null);
    context.success.delete.set(null);
    context.autoFillMissing.update.set(createEmptyAutoFillMissingState());
    context.programPicker.update.set('');
  };

  const handleMutationSuccess = (
    kind: 'create' | 'update' | 'delete',
    result: SubmissionResult,
  ): void => {
    if (kind === 'create') {
      resetCreateSubmissionState();
      context.success.create.set(result);
    } else {
      resetResolvedSubmissionState();
      clearSubmissionIdentifierSearchParams();
      if (kind === 'update') {
        context.success.update.set(result);
      } else {
        context.success.delete.set(result);
      }
    }
  };

  const submitMutationRequest = async (params: {
    kind: 'create' | 'update' | 'delete';
    endpoint: SubmissionMutationEndpoint;
    payload: unknown;
    setFieldErrors: (errors: FieldErrors) => void;
    setPending: (pending: boolean) => void;
    successTitle: string;
    errorTitle: string;
  }): Promise<void> => {
    params.setPending(true);
    try {
      const result = await requestSubmissionMutation({
        endpoint: params.endpoint,
        payload: params.payload,
        successTitle: params.successTitle,
        errorTitle: params.errorTitle,
      });
      if (result.ok) {
        handleMutationSuccess(params.kind, result.data);
        return;
      }
      params.setFieldErrors(result.fieldErrors);
    } finally {
      params.setPending(false);
    }
  };

  const submitWithPayload = async (params: {
    build: () => { ok: true; data: unknown } | { ok: false; fieldErrors: FieldErrors };
    setErrors: (errors: FieldErrors) => void;
    clearSuccess: () => void;
    kind: 'create' | 'update' | 'delete';
    endpoint: SubmissionMutationEndpoint;
    successTitle: string;
    errorTitle: string;
    setPending: (pending: boolean) => void;
  }): Promise<void> => {
    params.setErrors({});
    params.clearSuccess();
    const parsed = params.build();
    if (!parsed.ok) {
      params.setErrors(parsed.fieldErrors);
      return;
    }
    await submitMutationRequest({
      kind: params.kind,
      endpoint: params.endpoint,
      payload: parsed.data,
      setFieldErrors: params.setErrors,
      setPending: params.setPending,
      successTitle: params.successTitle,
      errorTitle: params.errorTitle,
    });
  };

  const loadOptions = async (): Promise<void> => {
    context.optionsPending.set(true);
    try {
      const nextOptions = await requestSubmissionOptions(context.activePage);
      if (nextOptions) {
        context.options.set(nextOptions);
      }
    } finally {
      context.optionsPending.set(false);
    }
  };

  const resolveSite = async (target: string | SiteResolveRequest): Promise<void> => {
    context.pending.resolve.set(true);
    context.search.error.set(null);
    try {
      const result = await requestResolvedSite(target);
      if (!result.ok) {
        context.search.error.set(result.error);
        return;
      }
      context.search.selectedSite.set(result.data);
      context.forms.update.set(createUpdateFormFromResolvedSite(result.data));
      context.forms.delete.set({
        ...context.forms.delete.get(),
        site_identifier: result.data.site_id,
      });
      context.search.query.set(result.data.url);
      context.success.update.set(null);
      context.success.delete.set(null);
    } finally {
      context.pending.resolve.set(false);
    }
  };

  const runSearch = async (): Promise<void> => {
    const query = trimText(context.search.query.get());
    if (!query) {
      context.search.error.set('请输入站点名称或部分地址。');
      return;
    }

    context.pending.search.set(true);
    context.search.error.set(null);
    context.search.results.set([]);
    try {
      const result = await requestSearchSites(query);
      if (result.ok) {
        context.search.results.set(result.data);
        if (result.data.length === 0) {
          context.search.error.set('没有找到匹配的站点，请改用更完整的地址或唯一标识。');
        }
        return;
      }
      context.search.error.set(result.error);
    } finally {
      context.pending.search.set(false);
    }
  };

  const runAutoFill = async (kind: 'create' | 'update'): Promise<void> => {
    const url = formController.getSiteUrlByKind(kind);
    if (!isHttpUrl(url)) {
      formController.setAutoFillUrlError(kind);
      return;
    }

    context.pending.autoFill.set(true);
    context.pending.autoFillTarget.set(kind);
    formController.setAutoFillMissing(kind, createEmptyAutoFillMissingState());
    try {
      const result = await requestSiteAutoFill(url);
      if (!result.ok) {
        formController.setAutoFillMissing(kind, AUTO_FILL_ALL_MISSING);
        return;
      }

      formController.mutateSiteForm(kind, (form) => {
        applyAutoFillToForm(form, result.data, (value) => {
          formController.setProgramPickerValue(kind, value);
        });
      });

      if (result.evaluation.successCount === 6) {
        formController.setAutoFillMissing(kind, createEmptyAutoFillMissingState());
        openSubmissionToast({ tone: 'success', title: '自动填写', message: '已成功获取信息。' });
        return;
      }

      if (result.evaluation.successCount === 0) {
        formController.setAutoFillMissing(kind, AUTO_FILL_ALL_MISSING);
        openSubmissionToast({
          tone: 'error',
          title: '自动填写',
          message: '获取失败，请手动填写或稍后重试。',
        });
        return;
      }

      formController.setAutoFillMissing(kind, result.evaluation.missing);
      openSubmissionToast({
        tone: 'warning',
        title: '自动填写',
        message: '获取到部分信息，请补充完善其余信息。',
      });
    } finally {
      context.pending.autoFill.set(false);
      context.pending.autoFillTarget.set(null);
    }
  };

  const submitCreate = async (): Promise<void> =>
    submitWithPayload({
      build: () => buildCreateSubmissionPayload(context.forms.create.get()),
      setErrors: context.errors.create.set,
      clearSuccess: () => context.success.create.set(null),
      kind: 'create',
      endpoint: '/api/site-submissions/create',
      successTitle: '新增申请已进入审核',
      errorTitle: '提交未完成',
      setPending: context.pending.create.set,
    });

  const submitUpdate = async (): Promise<void> => {
    const selectedSite = context.search.selectedSite.get();
    if (!selectedSite) {
      return;
    }
    await submitWithPayload({
      build: () => buildUpdateSubmissionPayload(context.forms.update.get(), selectedSite),
      setErrors: context.errors.update.set,
      clearSuccess: () => context.success.update.set(null),
      kind: 'update',
      endpoint: '/api/site-submissions/update',
      successTitle: '修订申请已进入审核',
      errorTitle: '修订未提交',
      setPending: context.pending.update.set,
    });
  };

  const submitDelete = async (): Promise<void> =>
    submitWithPayload({
      build: () => buildDeleteSubmissionPayload(context.forms.delete.get()),
      setErrors: context.errors.delete.set,
      clearSuccess: () => context.success.delete.set(null),
      kind: 'delete',
      endpoint: '/api/site-submissions/delete',
      successTitle: '删除申请已进入审核',
      errorTitle: '删除申请未提交',
      setPending: context.pending.delete.set,
    });

  const submitQuery = async (): Promise<void> => {
    context.errors.queryError.set(null);
    context.errors.query.set({});
    context.success.query.set(null);
    const parsed = buildSubmissionQueryPayload(context.forms.query.get());
    if (!parsed.ok) {
      context.errors.query.set(parsed.fieldErrors);
      openSubmissionToast({
        tone: 'warning',
        title: '查询未完成',
        message: parsed.formError ?? '请先修正查询字段。',
      });
      return;
    }

    context.pending.query.set(true);
    try {
      const result = await requestSubmissionQuery(parsed.data);
      if (result.ok) {
        context.success.query.set(result.data);
        return;
      }
      context.errors.query.set(result.fieldErrors);
    } finally {
      context.pending.query.set(false);
    }
  };

  const initialize = async (params: {
    initialIdentifier: string;
    initialAuditId: string;
  }): Promise<void> => {
    await loadOptions();
    if (
      (context.activePage === 'update' || context.activePage === 'delete') &&
      trimText(params.initialIdentifier)
    ) {
      await resolveSite(params.initialIdentifier);
    }
    if (context.activePage === 'query' && trimText(params.initialAuditId)) {
      await submitQuery();
    }
  };

  return {
    loadOptions,
    resolveSite,
    runSearch,
    runAutoFill,
    submitCreate,
    submitUpdate,
    submitDelete,
    submitQuery,
    initialize,
  };
}
