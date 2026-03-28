/**
 * @file identities.ts
 * @description 定义身份标识常量
 */

export enum Identities {
  /** 项目负责人 */
  LEADER = '项目负责人',
  /** 核心贡献者 */
  CORE = '核心贡献者',
  /** 贡献者 */
  CONTRIBUTOR = '贡献者',
}

export const IdentitiesKeys = Object.keys(Identities) as (keyof typeof Identities)[];
