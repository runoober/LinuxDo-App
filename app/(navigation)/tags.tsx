import { Stack } from "expo-router";
import { Hash, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { NavigationList } from "~/components/navigation/NavigationList";
import { useTheme } from "~/components/providers/ThemeProvider";
import { useTagsStore } from "~/store/tagsStore";
import { useActivityNavigation } from "../activityScreen";

export default function TagsScreen() {
	const { tags, init } = useTagsStore();
	const { navigate } = useActivityNavigation();
	const { t } = useTranslation();
	const { colors } = useTheme();
	const [searchText, setSearchText] = useState("");

	useEffect(() => {
		init();
	}, [init]);

	// 本地过滤标签
	const filteredTags = useMemo(() => {
		if (!searchText.trim()) return tags;
		const keyword = searchText.toLowerCase().trim();
		return tags.filter((tag) => tag.text.toLowerCase().includes(keyword));
	}, [tags, searchText]);

	const tagItems = filteredTags.map((tag) => ({
		id: tag.key.toString(),
		text: tag.text,
		count: tag.data.count,
		icon: <Hash className="text-primary" size={20} />,
		data: tag,
	}));

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					title: t("tabs.tags"),
					headerLargeTitle: true,
					headerBlurEffect: "regular",
				}}
			/>

			{/* 搜索框 - 样式与首页一致 */}
			<View className="flex-row items-center px-3 py-2 bg-card border-b border-border">
				<View className="flex-1 flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: colors.muted }}>
					<Search size={18} color={colors.mutedForeground} />
					<TextInput
						className="flex-1 ml-2 text-base"
						style={{ color: colors.foreground }}
						placeholder={t("search.searchTags") || "搜索标签..."}
						placeholderTextColor={colors.mutedForeground}
						value={searchText}
						onChangeText={setSearchText}
						returnKeyType="search"
					/>
					{searchText.length > 0 && (
						<TouchableOpacity onPress={() => setSearchText("")}>
							<X size={18} color={colors.mutedForeground} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			<NavigationList
				items={tagItems}
				onItemPress={(item) => {
					const tag = item.data;
					navigate({
						listTopics: "getTag",
						name: tag.text,
						title: t("tabs.tagTitle", { name: tag.text }),
					});
				}}
			/>
		</View>
	);
}
