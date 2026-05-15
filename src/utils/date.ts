/**
 * 获取当前的"日记日期"
 * 逻辑：第二天6点之前，算成前一天
 * 使用用户手机本地时间
 */
export const getCurrentDiaryDate = (now: Date = new Date()): Date => {
  const hour = now.getHours();
  const result = new Date(now);

  // 如果是凌晨0-6点，日期减一天
  if (hour < 6) {
    result.setDate(result.getDate() - 1);
  }

  return result;
};

/**
 * 将日期格式化为 YYYY-MM-DD 字符串
 */
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 将日期格式化为中文显示（如：2024年01月01日）
 */
export const formatChineseDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
};
