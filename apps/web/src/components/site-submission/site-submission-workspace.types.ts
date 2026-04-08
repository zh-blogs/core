import type { AutoFillMissingState } from '@/application/site-submission/site-submission.browser-workspace';
import type {
  CreateSubmissionFormState,
  DeleteSubmissionFormState,
  FieldErrors,
  QuerySubmissionFormState,
  SiteResolveResult,
  SiteSearchItem,
  SiteSubmissionOptionsResult,
  SubmissionDuplicateReviewPayload,
  SubmissionPage,
  SubmissionResult,
  SubmissionStatusResult,
  UpdateSubmissionFormState,
} from '@/application/site-submission/site-submission.service';

export type SiteFormKind = 'create' | 'update';

export type ValueState<T> = {
  get: () => T;
  set: (value: T) => void;
};

export interface CreateSubmissionDuplicateDialogState {
  code:
    | 'SITE_DUPLICATE_WEAK_CONFIRMATION_REQUIRED'
    | 'SITE_DUPLICATE_STRONG_CONTACT_REQUIRED'
    | 'SITE_RESTORE_REQUIRED';
  message: string;
  review: SubmissionDuplicateReviewPayload;
}

export interface SiteSubmissionWorkspaceControllerContext {
  activePage: SubmissionPage;
  options: ValueState<SiteSubmissionOptionsResult>;
  optionsPending: ValueState<boolean>;
  forms: {
    create: ValueState<CreateSubmissionFormState>;
    update: ValueState<UpdateSubmissionFormState>;
    delete: ValueState<DeleteSubmissionFormState>;
    query: ValueState<QuerySubmissionFormState>;
  };
  errors: {
    create: ValueState<FieldErrors>;
    update: ValueState<FieldErrors>;
    delete: ValueState<FieldErrors>;
    query: ValueState<FieldErrors>;
    queryError: ValueState<string | null>;
  };
  success: {
    create: ValueState<SubmissionResult | null>;
    update: ValueState<SubmissionResult | null>;
    delete: ValueState<SubmissionResult | null>;
    query: ValueState<SubmissionStatusResult | null>;
  };
  duplicate: {
    create: ValueState<CreateSubmissionDuplicateDialogState | null>;
  };
  pending: {
    create: ValueState<boolean>;
    update: ValueState<boolean>;
    delete: ValueState<boolean>;
    query: ValueState<boolean>;
    search: ValueState<boolean>;
    resolve: ValueState<boolean>;
    autoFill: ValueState<boolean>;
    autoFillTarget: ValueState<SiteFormKind | null>;
  };
  search: {
    query: ValueState<string>;
    results: ValueState<SiteSearchItem[]>;
    error: ValueState<string | null>;
    selectedSite: ValueState<SiteResolveResult | null>;
  };
  autoFillMissing: {
    create: ValueState<AutoFillMissingState>;
    update: ValueState<AutoFillMissingState>;
  };
  programPicker: {
    create: ValueState<string>;
    update: ValueState<string>;
  };
}
