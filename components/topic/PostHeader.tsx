import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { UserAvatar } from "~/components/UserAvatar";
import { Text } from "~/components/ui/text";
import { dampenColor } from "~/lib/utils/colorUtils";
import { formatRelativeTime } from "~/lib/utils/dateFormat";

interface PostHeaderProps {
	username: string;
	name?: string;
	avatarTemplate: string;
	createdAt: string;
	postNumber: number;
	isOP?: boolean; // 是否是楼主
	userTitle?: string | null;
	flairBgColor?: string | null;
}

export const PostHeader = ({ username, name, avatarTemplate, createdAt, postNumber, isOP, userTitle, flairBgColor }: PostHeaderProps) => {
	// 判断是否有有效的 name（非空字符串）
	const hasName = name && name.trim().length > 0;
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

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
					</View>
					<Text className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</Text>
				</View>
			</View>

			<Text className="text-xs text-muted-foreground">#{postNumber}</Text>
		</View>
	);
};
