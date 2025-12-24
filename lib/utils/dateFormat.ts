import { format, formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import i18n from "~/lib/i18n";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * 获取当前语言对应的 date-fns locale
 */
function getDateFnsLocale() {
	const lang = i18n.language;
	switch (lang) {
		case "zh-CN":
			return zhCN;
		case "en":
		default:
			return enUS;
	}
}

/**
 * 格式化日期为智能时间显示
 * - 小于30天：显示相对时间（如 "1分钟前"、"3天前"）
 * - 大于等于30天且同一年：显示月日（如 "12月24日" 或 "Dec 24"）
 * - 大于等于30天且不同年：显示年月日（如 "2024年12月24日" 或 "Dec 24, 2024"）
 * 支持 i18n 国际化
 */
export function formatRelativeTime(dateString: string): string {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / DAY_MS);

		// 小于30天，显示相对时间
		if (diffDays < 30) {
			return formatDistanceToNow(date, {
				addSuffix: true,
				locale: getDateFnsLocale(),
			});
		}

		const locale = getDateFnsLocale();
		const isSameYear = date.getFullYear() === now.getFullYear();

		// 大于等于30天
		if (isSameYear) {
			// 同一年：显示月日
			return format(date, "M-d");
		}
		// 不同年：显示年月日
		return format(date, "yyyy-M-d");
	} catch (e) {
		console.warn("formatRelativeTime", e);
		return dateString;
	}
}
