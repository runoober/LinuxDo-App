import { useColorScheme } from "nativewind";
import { useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import { UserAvatar } from "~/components/UserAvatar";
import { Text } from "~/components/ui/text";
import { Image as ExpoImage } from "expo-image";
import { dampenColor } from "~/lib/utils/colorUtils";
import { formatRelativeTime } from "~/lib/utils/dateFormat";
import Toast from "react-native-toast-message";

// User status 类型
export interface UserStatus {
	description?: string;
	emoji?: string;
	ends_at?: string | null;
    message_bus_last_id: number;
}

interface PostHeaderProps {
	username: string;
	name?: string;
	avatarTemplate: string;
	createdAt: string;
	postNumber: number;
	isOP?: boolean; // 是否是楼主
	userTitle?: string | null;
	flairBgColor?: string | null;
	flairUrl?: string | null; // 自定义 emoji 图片 URL
	userStatus?: UserStatus | null;
}

export const PostHeader = ({ username, name, avatarTemplate, createdAt, postNumber, isOP, userTitle, flairBgColor, flairUrl, userStatus }: PostHeaderProps) => {
	const hasName = name && name.trim().length > 0;
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const emojiRef = useRef<View>(null);

	// 构建 emoji 图片 URL
	// 优先级：flairUrl > 自定义 emoji 路径 > Twitter emoji 路径
	const statusEmojiUrl = useMemo(() => {
		if (!userStatus?.emoji) return null;
		const emojiName = userStatus.emoji;
		// 检测是否是自定义 emoji（通常包含下划线后跟数字，如 lark_043）
		const isCustomEmoji = /^[a-z]+_\d+$/.test(emojiName);
		if (isCustomEmoji) {
			// 如果有 flairUrl，拼接 base URL 使用；否则不显示
			return flairUrl ? `https://linux.do${flairUrl}` : null;
		}
		return `https://linux.do/images/emoji/twitter/${emojiName}.png`;
	}, [userStatus?.emoji, flairUrl]);

	// 点击 emoji 时显示自定义 Toast
	const handleEmojiPress = () => {
		if (userStatus?.description && emojiRef.current) {
			emojiRef.current.measureInWindow((x, y, width, height) => {
				// 先隐藏之前的 Toast，避免队列堆积
				Toast.hide();
				Toast.show({
					type: "statusTooltip",
					text1: userStatus.description,
					position: "top",
					visibilityTime: 1000,
					topOffset: y - 30, // 显示在 emoji 上方
					props: { x: x + width / 2 },
				});
			});
		}
	};

	return (
		<View className="flex-row justify-between items-center mb-3">
			<View className="flex-row items-center">
				<UserAvatar username={username} avatarTemplate={avatarTemplate} size={32} fallbackClassName="bg-muted" />
				<View className="ml-2">
					<View className="flex-row items-center gap-1">
						{hasName ? (
							<>
								<Text className="font-medium text-foreground">{name}</Text>
								<Text className="text-sm text-muted-foreground">@{username}</Text>
							</>
						) : (
							<Text className="font-medium text-foreground">{username}</Text>
						)}
						{isOP && (
							<View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isDark ? "rgba(14, 165, 233, 0.3)" : "#e0f2fe" }}>
								<Text className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">楼主</Text>
							</View>
						)}
						{userTitle && (
							<View
								className="px-1.5 py-0.5 rounded-full border"
								style={(() => {
									const colors = flairBgColor
										? dampenColor(`#${flairBgColor.replace("#", "")}`, isDark)
										: {
												bg: isDark ? "rgba(156, 163, 175, 0.15)" : "#f3f4f6",
												text: isDark ? "#9ca3af" : "#4b5563",
												border: isDark ? "rgba(156, 163, 175, 0.2)" : "#e5e7eb",
											};
									return {
										backgroundColor: colors.bg,
										borderColor: colors.border,
									};
								})()}
							>
								<Text
									className="text-[10px] font-medium"
									style={{
										color: flairBgColor ? dampenColor(`#${flairBgColor.replace("#", "")}`, isDark).text : isDark ? "#9ca3af" : "#4b5563",
									}}
								>
									{userTitle}
								</Text>
							</View>
						)}
						{/* User Status Emoji */}
						{statusEmojiUrl && (
							<View ref={emojiRef} collapsable={false}>
								<Pressable onPress={handleEmojiPress}>
									<ExpoImage
										source={{ uri: statusEmojiUrl }}
										style={{ width: 18, height: 18 }}
										contentFit="contain"
									/>
								</Pressable>
							</View>
						)}
					</View>
					<Text className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</Text>
				</View>
			</View>

			<Text className="text-xs text-muted-foreground">#{postNumber}</Text>
		</View>
	);
};
