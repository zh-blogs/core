import { getCollection } from 'astro:content';

const GROUP_ORDER = ['PROJECT', 'TECH', 'DOCS', 'DATA', 'OUTREACH'] as const;
const PROJECT_GROUP_ID = 'PROJECT' as const;

export interface CommunityRole {
  id: string;
  title: string;
  summary: string;
  details: string[];
  memberCount: number;
  activeContributorCount?: number;
  href: string;
}

function toAnchorId(value: string): string {
  return value.trim().toLowerCase();
}

export async function readCommunityRoles(): Promise<CommunityRole[]> {
  const [groups, members] = await Promise.all([getCollection('group'), getCollection('members')]);
  const orderIndexById = new Map<string, number>(GROUP_ORDER.map((id, index) => [id, index]));
  const activeMembers = members.filter((member) => member.data.status !== false);

  const roles = groups
    .slice()
    .sort(
      (left, right) =>
        (orderIndexById.get(left.id as (typeof GROUP_ORDER)[number]) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndexById.get(right.id as (typeof GROUP_ORDER)[number]) ?? Number.MAX_SAFE_INTEGER),
    )
    .map((group) => {
      const groupMembers = (
        group.id === PROJECT_GROUP_ID
          ? activeMembers
          : activeMembers.filter((member) => member.data.group.includes(group.id))
      ).map((member) => member.data.nickname || member.id);
      const memberCount = groupMembers.length;
      const memberLabel = memberCount > 0 ? groupMembers.join('、') : '暂无公开成员';
      const isProjectGroup = group.id === PROJECT_GROUP_ID;

      return {
        id: toAnchorId(group.id),
        title: group.data.name,
        summary: group.data.description,
        details: isProjectGroup
          ? [`当前活跃贡献者：${memberLabel}`, `当前活跃贡献人数：${memberCount} 人`]
          : [`当前公开成员：${memberLabel}`, `当前公开成员数：${memberCount} 人`],
        memberCount,
        activeContributorCount: isProjectGroup ? memberCount : undefined,
        href: `/contribute#${toAnchorId(group.id)}`,
      };
    });

  return roles;
}
