const AUTH_ERROR_MESSAGES: Record<string, string> = {
  current_password_required: '请先输入当前密码。',
  email_already_verified: '这个邮箱已经验证过了。',
  email_not_verified: '邮箱尚未验证，请先完成验证。',
  email_taken: '这个邮箱已经被使用。',
  expired_password_reset_token: '重置链接已过期，请重新申请。',
  expired_verification_token: '验证链接已过期，请重新发送。',
  github_account_conflict: '这个 GitHub 账号已经绑定到其他账户。',
  github_account_exists: '这个邮箱已经有 GitHub 账户，请先用 GitHub 登录。',
  github_already_bound: '当前账户已经绑定了 GitHub。',
  github_bind_email_mismatch: 'GitHub 主邮箱必须和当前账户邮箱一致。',
  github_not_bound: '当前账户还没有绑定 GitHub。',
  github_unbind_requires_password: '请先设置本地密码，再解绑 GitHub。',
  invalid_credentials: '账号或密码不正确。',
  invalid_current_password: '当前密码不正确。',
  invalid_password: '密码长度需要在 8 到 128 位之间。',
  invalid_password_reset_token: '重置链接无效。',
  invalid_username: '用户名需要是 3-32 位，仅允许字母、数字、_ 和 -。',
  invalid_verification_token: '验证链接无效。',
  password_mismatch: '两次输入的密码不一致。',
  request_failed: '请求失败，请稍后重试。',
  unsupported_account: '这个账号当前不支持该操作。',
  used_password_reset_token: '这个重置链接已经使用过了。',
  used_verification_token: '这个验证链接已经使用过了。',
  user_not_found: '没有找到对应账号。',
  username_taken: '这个用户名已经被占用。',
};

const AUTH_STATUS_MESSAGES: Record<string, string> = {
  'email-verified': '邮箱验证成功，现在可以登录了。',
  'github-bound': 'GitHub 绑定成功。',
  'github-unbound': 'GitHub 已解绑。',
  'password-reset': '密码已经重置，请使用新密码登录。',
  'password-updated': '密码已经更新。',
  'reset-sent': '如果账号存在且符合条件，我们已经发送了重置邮件。',
  'verification-resent': '验证邮件已经重新发送，请查收邮箱。',
  'verification-sent': '验证邮件已经发送，请先完成邮箱验证。',
};

export const getAuthErrorMessage = (code: string | null): string | null =>
  code ? (AUTH_ERROR_MESSAGES[code] ?? '操作失败，请稍后再试。') : null;

export const getAuthStatusMessage = (code: string | null): string | null =>
  code ? (AUTH_STATUS_MESSAGES[code] ?? null) : null;
