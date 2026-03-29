import { describe, expect, it } from 'vitest';

import { resolveSiteGoFeedback } from '@/application/site/site-go.server';

describe('site go feedback', () => {
  it('returns strict guidance for unsupported params', () => {
    expect(resolveSiteGoFeedback('UNKNOWN_PARAM')).toEqual({
      title: '发现未支持的参数',
      summary: '随机页目前只接受 recommend 和 type 两个参数，请移除其他参数后再试。',
    });
  });

  it('returns type guidance for invalid type values', () => {
    expect(resolveSiteGoFeedback('INVALID_TYPE')).toEqual({
      title: '未找到对应主标签',
      summary: 'type 需要精确匹配现有主标签名称，请从下方可用主标签中选择后重试。',
    });
  });

  it('returns combined guidance when recommend and type are both invalid', () => {
    expect(resolveSiteGoFeedback('INVALID_PARAMS')).toEqual({
      title: '参数校验未通过',
      summary:
        'recommend 只接受精确值 true，type 需要精确匹配现有主标签；任意一个不合法都会停止随机跳转。',
    });
  });

  it('returns no-match guidance when filters are valid but empty', () => {
    expect(resolveSiteGoFeedback('NO_MATCH')).toEqual({
      title: '当前筛选没有可跳转站点',
      summary: '当前参数组合下暂时没有匹配站点，可以调整参数后重新尝试。',
    });
  });
});
