import CronExpressionParser from 'cron-parser';
import dayjs from 'dayjs';

const SIX_FIELD_MESSAGE = '请输入包含秒的六段式 Cron 表达式';

export function validateCronExpression(expression: string): {
  message?: string;
  valid: boolean;
} {
  const normalized = expression.trim();
  if (normalized.split(/\s+/).length !== 6) {
    return { message: SIX_FIELD_MESSAGE, valid: false };
  }
  try {
    CronExpressionParser.parse(normalized, { tz: 'Asia/Shanghai' });
    return { valid: true };
  } catch {
    return { message: 'Cron 表达式无效', valid: false };
  }
}

export function previewCronRuns(
  expression: string,
  currentDate = new Date(),
): string[] {
  const validation = validateCronExpression(expression);
  if (!validation.valid) return [];
  const interval = CronExpressionParser.parse(expression.trim(), {
    currentDate,
    tz: 'Asia/Shanghai',
  });
  return Array.from({ length: 5 }, () =>
    dayjs(interval.next().toDate()).format('YYYY-MM-DD HH:mm:ss'),
  );
}
