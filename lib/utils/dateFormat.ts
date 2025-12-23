import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import i18n from "~/lib/i18n";

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
 * 格式化日期为相对时间（如 "1分钟前"、"1 minute ago"）
 * 支持 i18n 国际化
 */
export function formatRelativeTime(dateString: string): string {
	try {
		return formatDistanceToNow(new Date(dateString), {
			addSuffix: true,
			locale: getDateFnsLocale(),
		});
	} catch (e) {
		console.warn("formatRelativeTime", e);
		return dateString;
	}
}
