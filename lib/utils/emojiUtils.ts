/**
 * Emoji 短代码处理工具
 * 将 Discourse 的 emoji 短代码（如 :smiling_face_with_horns:）转换为 img 标签
 */

/**
 * 将 emoji 短代码转换为 Discourse emoji img 标签
 * 例如 :smiling_face_with_horns: -> <img class="emoji" src="...">
 * 
 * @param text 包含 emoji 短代码的文本
 * @returns 转换后的文本，短代码被替换为 img 标签
 */
export function convertEmojiShortcodes(text: string): string {
	if (!text) return text;

	// 先保护已有的 emoji img 标签，避免重复处理其中的短代码
	// 支持 class 和 src 属性的任意顺序
	const imgPlaceholders: string[] = [];
	let protectedText = text.replace(/<img[^>]+class="emoji[^"]*"[^>]*>/gi, (match) => {
		imgPlaceholders.push(match);
		return `__EMOJI_IMG_${imgPlaceholders.length - 1}__`;
	});

	// 转换文本中的 emoji 短代码
	const emojiCodePattern = /:([a-z0-9_+-]+):/gi;
	let convertedText = protectedText.replace(emojiCodePattern, (match, emojiName) => {
		return `<img class="emoji" src="https://linux.do/images/emoji/twitter/${emojiName}.png" alt="${match}" />`;
	});

	// 恢复原有的 emoji img 标签
	imgPlaceholders.forEach((img, index) => {
		convertedText = convertedText.replace(`__EMOJI_IMG_${index}__`, img);
	});

	return convertedText;
}

/**
 * Callout 类型到 emoji 的映射
 */
const CALLOUT_EMOJIS: Record<string, string> = {
	success: '✅',
	note: '📝',
	tip: '💡',
	warning: '⚠️',
	caution: '🔴',
	important: '❗',
	info: '💬',
	example: '📋',
	question: '❓',
	quote: '💬',
	abstract: '📄',
	summary: '📄',
	todo: '☑️',
	bug: '🐛',
	danger: '⛔',
	failure: '❌',
	fail: '❌',
	error: '❌',
	attention: '⚠️',
	check: '✅',
};

/**
 * 将 Obsidian/GitHub 风格的 callout 语法转换为 emoji
 * 例如 [!success] -> ✅, [!warning] -> ⚠️
 * 
 * @param text 包含 callout 语法的文本
 * @returns 转换后的文本，callout 语法被替换为对应的 emoji
 */
export function convertCalloutSyntax(text: string): string {
	if (!text) return text;
	
	return text.replace(
		/\[!(\w+)\]/gi,
		(_, type) => {
			const emoji = CALLOUT_EMOJIS[type.toLowerCase()] || '📌';
			return emoji;
		}
	);
}
