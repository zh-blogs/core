import type { SiteSubmissionWorkspaceControllerContext } from './site-submission-workspace.types';
import { createSiteSubmissionWorkspaceFormController } from './site-submission-workspace-form-controller';
import { createSiteSubmissionWorkspaceRequestController } from './site-submission-workspace-request-controller';

export function createSiteSubmissionWorkspaceController(
  context: SiteSubmissionWorkspaceControllerContext,
) {
  const formController = createSiteSubmissionWorkspaceFormController(context);
  const requestController = createSiteSubmissionWorkspaceRequestController(context, formController);

  return {
    ...formController,
    ...requestController,
  };
}

export type { ValueState } from './site-submission-workspace.types';
