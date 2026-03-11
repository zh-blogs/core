/**
 * @file groups.ts
 * @description 定义身份组常量
 */

export enum Groups {
  /** 项目组 */
  PROJECT = "项目组",
  /** 技术组（负责开发和维护） */
  TECH = "技术组",
  /** 文档维护组 */
  DOCS = "文档维护组",
  /** 数据维护组 */
  DATA = "数据维护组",
  /** 外联组（负责对外合作） */
  OUTREACH = "外联组",
}

export const GroupKeys = Object.keys(Groups) as (keyof typeof Groups)[];
