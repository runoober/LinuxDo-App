import { useRouter } from "expo-router";
import { Search, Tag, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { useTheme } from "~/components/providers/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Text } from "~/components/ui/text";
import { getTagColor } from "~/lib/utils/colorUtils";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";

export type SearchUser = {
	id: number;
	username: string;
	name: string;
	avatar_template: string;
};

export type SearchTag = {
	id: number;
	name: string;
	topic_count: number;
	staff: boolean;
};

export function SearchBox() {
	const { t } = useTranslation();
	const { colors } = useTheme();
	const router = useRouter();
	const { client } = useLinuxDoClientStore();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	const [searchText, setSearchText] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [users, setUsers] = useState<SearchUser[]>([]);
	const [tags, setTags] = useState<SearchTag[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const inputRef = useRef<TextInput>(null);

	// 延迟 1 秒执行搜索
	const handleSearchChange = useCallback(
		(text: string) => {
			setSearchText(text);

			// 清除之前的定时器
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}

			if (!text.trim()) {
				setUsers([]);
				setTags([]);
				return;
			}

			// 延迟 1 秒执行搜索
			searchTimeoutRef.current = setTimeout(async () => {
				if (!client) return;

				setIsLoading(true);
				try {
					const result = await client.searchSuggestions(text.trim());
					setUsers(result.users || []);
					setTags(result.tags || []);
				} catch (error) {
					console.error("Search suggestions error:", error);
					setUsers([]);
					setTags([]);
				} finally {
					setIsLoading(false);
				}
			}, 1000);
		},
		[client],
	);

	// 清理定时器
	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, []);

	// 处理点击「在所有话题和帖子中搜索」
	const handleSearchAll = useCallback(() => {
		if (searchText.trim()) {
			setIsFocused(false);
			setSearchText("");
			setUsers([]);
			setTags([]);
			Keyboard.dismiss();
			// 导航到搜索结果页面
			router.push(`/search?q=${encodeURIComponent(searchText.trim())}`);
		}
	}, [searchText, router]);

	// 处理点击标签
	const handleTagPress = useCallback(
		(tag: SearchTag) => {
			setIsFocused(false);
			setSearchText("");
			setUsers([]);
			setTags([]);
			Keyboard.dismiss();
			router.push(`/topic/tag/${tag.name}`);
		},
		[router],
	);

	// 处理点击用户
	const handleUserPress = useCallback(
		(user: SearchUser) => {
			setIsFocused(false);
			setSearchText("");
			setUsers([]);
			setTags([]);
			Keyboard.dismiss();
			// 导航到用户页面
			router.push(`/user/${user.username}`);
		},
		[router],
	);

	// 清空搜索
	const handleClear = useCallback(() => {
		setSearchText("");
		setUsers([]);
		setTags([]);
	}, []);

	// 获取头像 URL
	const getAvatarUrl = (template: string, size = 48) => {
		if (!template) return "";
		return `https://linux.do${template.replace("{size}", String(size))}`;
	};

	const showDropdown = isFocused && searchText.trim().length > 0;

	return (
		<View className="relative z-50">
			{/* 搜索输入框 */}
			<View className="flex-row items-center px-3 py-1 bg-card border-b border-border">
				<View className="flex-1 flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: colors.muted }}>
					<Search size={18} color={colors.mutedForeground} />
					<TextInput
						ref={inputRef}
						className="flex-1 ml-2 text-base"
						style={{ color: colors.foreground }}
						placeholder={t("search.placeholder") || "搜索..."}
						placeholderTextColor={colors.mutedForeground}
						value={searchText}
						onChangeText={handleSearchChange}
						onFocus={() => setIsFocused(true)}
						onBlur={() => {
							// 延迟关闭下拉框，以便用户可以点击其中的项目
							setTimeout(() => setIsFocused(false), 200);
						}}
						onSubmitEditing={handleSearchAll}
						returnKeyType="search"
					/>
					{searchText.length > 0 && (
						<TouchableOpacity onPress={handleClear}>
							<X size={18} color={colors.mutedForeground} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* 搜索建议下拉框 */}
			{showDropdown && (
				<View
					className="absolute left-0 right-0 bg-card border border-border rounded-b-lg shadow-lg"
					style={{
						top: "100%",
						maxHeight: 400,
						zIndex: 100,
					}}
				>
					<ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
						{/* 在所有话题和帖子中搜索 */}
						<Pressable className="flex-row items-center px-4 py-3 border-b border-border active:bg-muted" onPress={handleSearchAll}>
							<Search size={16} color={colors.primary} />
							<Text className="ml-2 text-primary">{searchText}</Text>
							<Text className="ml-1 text-muted-foreground">{t("search.searchInAll") || "在所有话题和帖子中"}</Text>
							<Text className="ml-1 text-muted-foreground text-sm">{t("search.pressEnter") || "或按 Enter"}</Text>
						</Pressable>

						{/* 标签列表 */}
						{tags.length > 0 && (
							<View className="border-b border-border">
								{tags.map((tag) => {
									const tagColors = getTagColor(tag.name, isDark);
									return (
										<Pressable
											key={tag.id}
											className="flex-row items-center px-4 py-2.5 active:bg-muted"
											onPress={() => handleTagPress(tag)}
										>
											<View
												className="p-1 rounded-md border"
												style={{
													backgroundColor: tagColors.bg,
													borderColor: tagColors.border,
												}}
											>
												<Tag size={12} color={tagColors.text} />
											</View>
											<Text className="ml-2 font-medium" style={{ color: tagColors.text }}>
												{tag.name}
											</Text>
										</Pressable>
									);
								})}
							</View>
						)}

						{/* 用户列表 */}
						{users.length > 0 && (
							<View>
								{users.map((user) => (
									<Pressable
										key={user.id}
										className="flex-row items-center px-4 py-2.5 active:bg-muted"
										onPress={() => handleUserPress(user)}
									>
										<Avatar className="h-8 w-8" alt={user.username}>
											<AvatarImage
												source={{
													uri: getAvatarUrl(user.avatar_template),
												}}
											/>
											<AvatarFallback>
												<Text className="text-xs">{user.username.charAt(0).toUpperCase()}</Text>
											</AvatarFallback>
										</Avatar>
										<View className="ml-2">
											<Text className="text-foreground font-medium">{user.name || user.username}</Text>
											<Text className="text-muted-foreground text-sm">{user.username}</Text>
										</View>
									</Pressable>
								))}
							</View>
						)}

						{/* 加载中 */}
						{isLoading && (
							<View className="px-4 py-3">
								<Text className="text-muted-foreground">{t("common.loading") || "加载中..."}</Text>
							</View>
						)}

						{/* 无结果 */}
						{!isLoading && tags.length === 0 && users.length === 0 && searchText.trim() && (
							<View className="px-4 py-3">
								<Text className="text-muted-foreground">{t("search.noSuggestions") || "暂无建议"}</Text>
							</View>
						)}
					</ScrollView>
				</View>
			)}
		</View>
	);
}
