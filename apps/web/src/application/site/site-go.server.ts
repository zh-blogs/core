import type { SiteGoFailureReason, SiteGoResult } from '@/application/site/site-directory.models';
import { fetchSiteRandom } from '@/application/site/site-directory.server';

export const SITE_GO_EXAMPLE_QUERIES = [
  '?recommend=true',
  '?type=技术',
  '?recommend=true&type=技术',
] as const;

export function resolveSiteGoFeedback(failureReason: SiteGoFailureReason | null): {
  title: string;
  summary: string;
} {
  if (failureReason === 'UNKNOWN_PARAM') {
    return {
      title: '发现未支持的参数',
      summary: '随机页目前只接受 recommend 和 type 两个参数，请移除其他参数后再试。',
    };
  }

  if (failureReason === 'DUPLICATE_PARAM') {
    return {
      title: '参数不能重复传入',
      summary: 'recommend 和 type 都只接受单个值，请清理重复参数后重新发起随机跳转。',
    };
  }

  if (failureReason === 'INVALID_PARAMS') {
    return {
      title: '参数校验未通过',
      summary:
        'recommend 只接受精确值 true，type 需要精确匹配现有主标签；任意一个不合法都会停止随机跳转。',
    };
  }

  if (failureReason === 'INVALID_RECOMMEND') {
    return {
      title: 'recommend 参数无效',
      summary: 'recommend 只接受精确值 true；未传该参数时表示不过滤推荐状态。',
    };
  }

  if (failureReason === 'INVALID_TYPE') {
    return {
      title: '未找到对应主标签',
      summary: 'type 需要精确匹配现有主标签名称，请从下方可用主标签中选择后重试。',
    };
  }

  return {
    title: '当前筛选没有可跳转站点',
    summary: '当前参数组合下暂时没有匹配站点，可以调整参数后重新尝试。',
  };
}

export async function resolveSiteGoResult(url: URL): Promise<SiteGoResult> {
  return (
    (await fetchSiteRandom(url.search)) ?? {
      site: null,
      availableTypes: [],
      filters: {
        recommend: false,
        type: '',
      },
      failureReason: 'NO_MATCH',
    }
  );
}
