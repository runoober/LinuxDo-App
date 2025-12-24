/**
 * 处理 Discourse 标题中的 emoji
 * Discourse 的 fancy_title 可能包含 emoji 的 img 标签
 * 例如: "[水]多 :cookie: 了几个人"
 * 其中 :cookie: 会被转成 <img class="emoji" src="..." title=":cookie:">
 */

import { Image as ExpoImage } from "expo-image";
import React from "react";
import { Image, Text, View } from "react-native";
import { convertEmojiShortcodes } from "~/lib/utils/emojiUtils";

const EMOJI_IMG_REGEX = /<img[^>]+class="emoji[^"]*"[^>]+src="([^"]+)"[^>]*title="([^"]*)"[^>]*\/?>/gi;
const EMOJI_IMG_REGEX_ALT = /<img[^>]+src="([^"]+)"[^>]+class="emoji[^"]*"[^>]*title="([^"]*)"[^>]*\/?>/gi;

interface TitlePart {
	type: "text" | "emoji";
	content: string;
	src?: string;
}

/**
 * 解析包含 emoji img 标签的标题
 */
export function parseTitleWithEmoji(title: string): TitlePart[] {
	if (!title) return [];

	// 先将 emoji 短代码转换为 img 标签
	const processedTitle = convertEmojiShortcodes(title);

	const parts: TitlePart[] = [];
	let lastIndex = 0;

	// 匹配包含 class="emoji..." 的 img 标签，支持属性任意顺序
	// 使用更通用的正则：只要包含 class="emoji" 且包含 src 属性即可
	const regex = /<img\s+[^>]*class="emoji[^"]*"[^>]*>/gi;

	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: for performance
	while ((match = regex.exec(processedTitle)) !== null) {
		// 从 img 标签中提取 src 属性
		const srcMatch = match[0].match(/src="([^"]+)"/i);
		if (!srcMatch) continue;

		// 添加 emoji 之前的文本
		if (match.index > lastIndex) {
			const text = processedTitle.slice(lastIndex, match.index);
			if (text.trim()) {
				parts.push({ type: "text", content: decodeHTMLEntities(text) });
			}
		}

		// 添加 emoji
		parts.push({
			type: "emoji",
			content: match[0],
			src: srcMatch[1],
		});

		lastIndex = match.index + match[0].length;
	}

	// 添加最后的文本
	if (lastIndex < processedTitle.length) {
		const text = processedTitle.slice(lastIndex);
		if (text.trim()) {
			parts.push({ type: "text", content: decodeHTMLEntities(text) });
		}
	}

	// 如果没有找到任何 emoji，返回原始标题
	if (parts.length === 0) {
		return [{ type: "text", content: decodeHTMLEntities(processedTitle) }];
	}

	return parts;
}

/**
 * 解码 HTML 实体
 */
function decodeHTMLEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		// 破折号和连字符
		.replace(/&mdash;/g, "—")
		.replace(/&ndash;/g, "–")
		// 其他常见实体
		.replace(/&hellip;/g, "…")
		.replace(/&lsquo;/g, "'")
		.replace(/&rsquo;/g, "'")
		.replace(/&ldquo;/g, "\u201C")
		.replace(/&rdquo;/g, "\u201D")
		.replace(/&copy;/g, "©")
		.replace(/&reg;/g, "®")
		.replace(/&trade;/g, "™")
		// 数字编码的 HTML 实体
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

interface TitleWithEmojiProps {
	title: string;
	className?: string;
	emojiSize?: number;
}

/**
 * 渲染包含 emoji 的标题
 */
export function TitleWithEmoji({ title, className, emojiSize = 20 }: TitleWithEmojiProps) {
	const parts = parseTitleWithEmoji(title);

	return (
		<Text className={className}>
			{parts.map((part, index) => {
				if (part.type === "emoji" && part.src) {
					return (
						<View key={index} style={{ width: emojiSize, height: emojiSize }}>
							<ExpoImage source={{ uri: part.src }} style={{ width: emojiSize, height: emojiSize }} contentFit="contain" />
						</View>
					);
				}
				return <Text key={index}>{part.content}</Text>;
			})}
		</Text>
	);
}
