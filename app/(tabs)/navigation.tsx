import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ChevronRight, History } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { type NavigationItem, NavigationSection } from "~/components/navigation/NavigationSection";
import { useTheme } from "~/components/providers/ThemeProvider";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { dampenColor, getTagColor } from "~/lib/utils/colorUtils";
import { getCategoryIcon } from "~/lib/utils/categoryIcon";
import { useActivityHistoryStore } from "~/store/activityHistoryStore";
import { useCategoriesStore } from "~/store/categoriesStore";
import { useTagsStore } from "~/store/tagsStore";
import { useActivityNavigation } from "../activityScreen";

export const EXTERNAL_LINKS: NavigationItem<string>[] = [
	{ key: "status", text: "status", data: "https://status.linux.do/" },
	{ key: "connect", text: "connect", data: "https://connect.linux.do/" },
	{ key: "webmail", text: "webmail", data: "https://webmail.linux.do" },
	{ key: "NeverGonnaGiveYouUp", text: "你不会想点击的", data: "https://www.bilibili.com/video/BV1GJ411x7h7/" },
];

export default function NavigationScreen() {
	const router = useRouter();
	const { categories, init: initCategories } = useCategoriesStore();
	const { tags, init: initTags } = useTagsStore();
	const { history } = useActivityHistoryStore();
	const { navigate } = useActivityNavigation();
	const { t } = useTranslation();
	const { colorScheme } = useColorScheme();
	const { colors } = useTheme();
	const isDark = colorScheme === "dark";
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([initCategories(), initTags()]);
		} catch (error) {
			console.error("Failed to refresh navigation data:", error);
		} finally {
			setIsRefreshing(false);
		}
	}, [initCategories, initTags]);

	// 处理前 20 个热门标签
	const processedTags = useMemo(() => {
		// 1. 深度克隆并按热度排序
		const sorted = [...tags].sort((a, b) => (b.data.count || 0) - (a.data.count || 0)).slice(0, 20);

		if (sorted.length === 0) return [];

		// 2. 计算热度范围
		const counts = sorted.map((t) => t.data.count || 0);
		const maxCount = Math.max(...counts);
		const minCount = Math.min(...counts);
		const range = maxCount - minCount || 1;

		return sorted.map((tag) => {
			const count = tag.data.count || 0;
			// 3. 计算热度比例 (0-1)
			const ratio = (count - minCount) / range;

			// 4. 根据热度选择颜色强度
			// 使用 getTagColor 获得基础色，然后手动调整 alpha 值 (0.1 ~ 0.5)
			const baseColors = getTagColor(tag.text, isDark);

			// 简单的线性映射：0.1 (最低热度) -> 0.4 (最高热度)
			const alpha = 0.1 + ratio * 0.35;

			// 提取 HSL 数据 (getTagColor 返回的是 hsla 格式)
			// 例如: hsla(200, 30%, 18%, 0.6)
			const hslaMatch = baseColors.bg.match(/hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/);
			let dynamicBg = baseColors.bg;
			const dynamicText = baseColors.text;

			if (hslaMatch) {
				const [_, h, s, l] = hslaMatch;
				dynamicBg = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;

				// 热度极高时字体加粗或稍微调暗（浅色模式）/调亮（深色模式）
				if (ratio > 0.8) {
					// 可以在这里进一步微调文字
				}
			}

			return {
				...tag,
				dynamicStyles: {
					bg: dynamicBg,
					text: dynamicText,
					border: baseColors.border,
					badgeBg: isDark ? `rgba(255,255,255, ${0.1 + ratio * 0.2})` : `rgba(0,0,0, ${0.05 + ratio * 0.1})`,
					badgeText: isDark ? (ratio > 0.7 ? "#fff" : "#9ca3af") : ratio > 0.7 ? "#111" : "#6b7280",
				},
			};
		});
	}, [tags, isDark]);

	useEffect(() => {
		initCategories();
		initTags();
	}, [initCategories, initTags]);

	const handleTagPress = (tag: (typeof tags)[0]) => {
		navigate({
			listTopics: "getTag",
			name: tag.text,
			title: t("tabs.tagTitle", { name: tag.text }),
		});
	};

	return (
		<ScrollView
			className="flex-1"
			refreshControl={
				<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
			}
		>
			<View className="p-4">
				<Text className="text-xl font-semibold mb-4">{t("tabs.navigation")}</Text>
			</View>

			<NavigationSection
				title={t("tabs.hotCategories")}
				items={categories.slice(0, 8)}
				onItemPress={(item) =>
					navigate({
						listTopics: "listCategoryTopics",
						id: String(item.data.id),
						slug: item.data.slug,
						title: t("tabs.categoryTitle", { name: item.text }),
					})
				}
				renderItem={(item) => {
					const softColors = dampenColor(`#${item.data.color}`, isDark);
					// 使用类型断言访问 icon 字段
					const iconName = (item.data as { icon?: string }).icon;
					const IconElement = getCategoryIcon(iconName, 16, softColors.text);
					return (
						<Button
							key={item.key}
							variant="outline"
							size="sm"
							className="flex-1 min-w-[45%] border-border/40 flex-row items-center"
							style={{ backgroundColor: softColors.bg, borderColor: softColors.border }}
							onPress={() =>
								navigate({
									listTopics: "listCategoryTopics",
									id: String(item.data.id),
									slug: item.data.slug,
									title: t("tabs.categoryTitle", { name: item.text }),
								})
							}
						>
							{IconElement && <View className="mr-1.5">{IconElement}</View>}
							<Text className="text-sm font-semibold" style={{ color: softColors.text }}>
								{item.text}
							</Text>
						</Button>
					);
				}}
				onViewMore={() => router.navigate("/categories")}
				delay={100}
			/>

			{/* 热门标签 - 显示热度 */}
			<Animated.View entering={FadeIn.delay(200)} className="mb-4 mx-4 p-4 bg-card rounded-lg">
				<View className="flex-row items-center justify-between mb-3">
					<Text className="text-lg font-semibold">{t("tabs.hotTags")}</Text>
					<Button variant="ghost" size="sm" onPress={() => router.navigate("/tags")} className="flex-row items-center">
						<Text className="text-sm text-card-foreground mr-1">{t("common.viewMore")}</Text>
						<ChevronRight size={16} className="text-card-foreground" />
					</Button>
				</View>
				<View className="flex-row flex-wrap gap-3">
					{processedTags.map((tag) => (
						<Pressable
							key={tag.key}
							className="relative flex-1 min-w-[45%] px-3 py-2.5 border border-border/40 rounded-lg active:opacity-70"
							style={{ backgroundColor: tag.dynamicStyles.bg, borderColor: tag.dynamicStyles.border }}
							onPress={() => handleTagPress(tag)}
						>
							<Text className="text-sm font-semibold text-center" style={{ color: tag.dynamicStyles.text }} numberOfLines={1}>
								{tag.text}
							</Text>
							{tag.data.count !== undefined && tag.data.count > 0 && (
								<View
									className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full min-w-[22px] shadow-sm"
									style={{ backgroundColor: tag.dynamicStyles.badgeBg }}
								>
									<Text className="text-[12px] text-center font-bold" style={{ color: tag.dynamicStyles.text, opacity: 0.9 }}>
										{tag.data.count >= 1000000
											? `${(tag.data.count / 1000000).toFixed(1)}m`
											: tag.data.count >= 1000
												? `${(tag.data.count / 1000).toFixed(1)}k`
												: tag.data.count}
									</Text>
								</View>
							)}
						</Pressable>
					))}
				</View>
			</Animated.View>

			<NavigationSection
				title={t("tabs.externalLinks")}
				items={EXTERNAL_LINKS}
				onItemPress={(item) => Linking.openURL(item.data)}
				onViewMore={() => router.navigate("/external")}
				delay={300}
			/>

			{history.length > 0 && (
				<View className="px-4 mb-8">
					<View className="flex-row items-center mb-3">
						<History size={18} className="text-muted-foreground mr-2" />
						<Text className="text-lg font-semibold">{t("common.history")}</Text>
					</View>
					<View className="flex-row flex-wrap gap-2">
						{history.slice(0, 5).map((item) => (
							<Button
								key={item.id}
								variant="outline"
								size="sm"
								className="flex-1 min-w-[45%]"
								onPress={() => navigate({ ...item.params, title: item.title })}
							>
								<Text className="text-sm" numberOfLines={1}>
									{item.title}
								</Text>
							</Button>
						))}
					</View>
				</View>
			)}
		</ScrollView>
	);
}
