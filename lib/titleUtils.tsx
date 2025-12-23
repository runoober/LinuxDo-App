/**
 * 处理 Discourse 标题中的 emoji
 * Discourse 的 fancy_title 可能包含 emoji 的 img 标签
 * 例如: "[水]多 :cookie: 了几个人"
 * 其中 :cookie: 会被转成 <img class="emoji" src="..." title=":cookie:">
 */

import { Image as ExpoImage } from "expo-image";
import React from "react";
import { Image, Text, View } from "react-native";

const EMOJI_IMG_REGEX = /<img[^>]+class="emoji"[^>]+src="([^"]+)"[^>]*title="([^"]*)"[^>]*\/?>/gi;
const EMOJI_IMG_REGEX_ALT = /<img[^>]+src="([^"]+)"[^>]+class="emoji"[^>]*title="([^"]*)"[^>]*\/?>/gi;

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

	const parts: TitlePart[] = [];
	let lastIndex = 0;

	// 尝试两种可能的 img 标签格式
	const regex = /<img[^>]+class="emoji"[^>]+src="([^"]+)"[^>]*\/?>/gi;

	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: for performance
	while ((match = regex.exec(title)) !== null) {
		// 添加 emoji 之前的文本
		if (match.index > lastIndex) {
			const text = title.slice(lastIndex, match.index);
			if (text.trim()) {
				parts.push({ type: "text", content: decodeHTMLEntities(text) });
			}
		}

		// 添加 emoji
		parts.push({
			type: "emoji",
			content: match[0],
			src: match[1],
		});

		lastIndex = match.index + match[0].length;
	}

	// 添加最后的文本
	if (lastIndex < title.length) {
		const text = title.slice(lastIndex);
		if (text.trim()) {
			parts.push({ type: "text", content: decodeHTMLEntities(text) });
		}
	}

	// 如果没有找到任何 emoji，返回原始标题
	if (parts.length === 0) {
		return [{ type: "text", content: decodeHTMLEntities(title) }];
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
		.replace(/&nbsp;/g, " ");
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
