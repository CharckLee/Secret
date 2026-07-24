export interface BookmarkCardProps {
  /** 书签标题 */
  title: string;
  /** 书签链接地址 */
  url: string;
  /** 书签描述（可选） */
  description?: string;
  /** 标签列表 */
  tags?: string[];
}
