import { Image } from "expo-image";
import { Eye, Heart, MessageCircle, Star, Trash2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Animated, Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";
import type { paths } from "~/lib/api/schema";
import { dampenColor, getContrastColor, getTagColor } from "~/lib/utils/colorUtils";
import { formatRelativeTime } from "~/lib/utils/dateFormat";
import { useCategoriesStore } from "~/store/categoriesStore";
import { TitleWithEmoji } from "~/lib/titleUtils";
import { type SwipeAction, SwipeableWrapper } from "../SwipeableWrapper";
import { UserAvatar } from "../UserAvatar";

// 基础 TopicCardItem 类型
type BaseTopicCardItem = NonNullable<
	NonNullable<paths["/latest.json"]["get"]["responses"]["200"]["content"]["application/json"]["topic_list"]>["topics"]
>[number];

// 扩展的发帖者信息
export type OriginalPosterInfo = {
	username: string;
	name?: string | null;
	avatar_template?: string;
};

// 扩展的 TopicCardItem，包含发帖者信息和搜索摘要
export type TopicCardItem = BaseTopicCardItem & {
	original_poster?: OriginalPosterInfo;
	search_blurb?: string; // 搜索结果摘要
	search_post_number?: number; // 搜索结果锚定的回复编号
};

type TopicCardProps = {
	item: TopicCardItem;
	onPress?: (id: number) => void;
	enableSwipe?: boolean;
	swipe?: SwipeAction<TopicCardItem>[];
	/** 卡片显示模式：default=普通话题列表, search=搜索结果 */
	variant?: "default" | "search";
};

export const TopicCard = ({ item, onPress, enableSwipe = true, swipe, variant = "default" }: TopicCardProps) => {
	const { categories, init: initCategories } = useCategoriesStore();
	const { t } = useTranslation();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	useEffect(() => {
		initCategories();
	}, [initCategories]);

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const hasUnread = item.unseen || (item.unread_posts && item.unread_posts > 0);

	const handleLongPress = () => {
		Animated.sequence([
			Animated.timing(scaleAnim, {
				toValue: 0.97,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start();

		showActionMenu();
	};

	const showActionMenu = () => {
		Alert.alert(
			t("topic.options"),
			t("topic.chooseAction"),
			[
				{
					text: t("topic.todo"),
					style: "destructive",
				},
				{
					text: t("topic.believeWillDoneSoon"),
					style: "destructive",
				},
				{
					text: t("common.cancel"),
					style: "cancel",
				},
			],
			{ cancelable: true },
		);
	};

	// Check for undefined values that might be causing issues
	// biome-ignore lint/suspicious/noExplicitAny: TODO
	const title = (item as any).unicode_title || item.fancy_title || item.title || "";
	const postsCount = item.posts_count || 0;
	const views = item.views || 0;
	const likeCount = item.like_count || 0;
	const lastPostedAt = item.last_posted_at || item.created_at || "";
	const lastPosterUsername = item.last_poster_username || "";
	const categoryId = item.category_id || 0;
	const category = useMemo(() => categories.find((c) => c.data.id === categoryId), [categories, categoryId]);

	return (
		<>
			<SwipeableWrapper enableSwipe={enableSwipe} swipe={swipe} item={item}>
				<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
					<Pressable
						onPress={() => onPress?.(item.id!)}
						onLongPress={handleLongPress}
						delayLongPress={300}
						className="p-4 mb-3 rounded-xl bg-card shadow-sm"
					>
						{/* 主布局：左侧头像 + 右侧内容 */}
						<View className="flex-row">
							{/* 左侧：发帖者头像和用户名 */}
							{item.original_poster && (
								<View className="items-center mr-3" style={{ width: 48 }}>
									<UserAvatar
										username={item.original_poster.username}
										avatarTemplate={item.original_poster.avatar_template}
										size={40}
										fallbackClassName="bg-muted"
									/>
									<Text className="text-xs text-muted-foreground mt-1 text-center font-bold" numberOfLines={1} style={{ width: 48 }}>
										{item.original_poster.name?.trim() || item.original_poster.username}
									</Text>
								</View>
							)}

							{/* 右侧：帖子内容 */}
							<View className="flex-1">
								{/* Topic Header */}
								<View className="flex-row justify-between items-start mb-2">
									<View className="flex-1 mr-2">
										<TitleWithEmoji
											title={title}
											className={`text-lg font-bold ${hasUnread ? "text-foreground" : "text-muted-foreground"}`}
											emojiSize={18}
										/>
									</View>

									{item.pinned && (
										<View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7" }}>
											<Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{t("topic.pinned")}</Text>
										</View>
									)}
								</View>

								{/* Topic Image (if available) */}
								{item.image_url && (
									<View className="mb-3 overflow-hidden rounded-lg">
										<Image source={{ uri: item.image_url }} className="h-40 w-full" contentFit="cover" transition={300} />
									</View>
								)}

								{/* Topic Stats and Tags */}
								<View className="flex-row justify-between items-start mb-2">
									{/* Stats - 左对齐 */}
									<View className="flex-row items-center">
										{item.views !== undefined && (
											<View className="flex-row items-center mr-3">
												<Eye size={16} className="text-muted-foreground" />
												<Text className="ml-1 text-sm text-muted-foreground">{views}</Text>
											</View>
										)}

										<View className="flex-row items-center mr-3">
											<MessageCircle size={16} className="text-muted-foreground" />
											<Text className="ml-1 text-sm text-muted-foreground">{postsCount}</Text>
										</View>

										{likeCount > 0 && (
											<View className="flex-row items-center">
												<Star size={16} className="text-muted-foreground" fill={item.bookmarked ? "#EAB308" : "none"} />
												<Text className="ml-1 text-sm text-muted-foreground">{likeCount}</Text>
											</View>
										)}
									</View>

									{/* Tags - 右对齐，支持换行 */}
									{/* biome-ignore lint/suspicious/noExplicitAny: API 返回的 tags 字段未在类型定义中声明 */}
									{(item as any).tags && (item as any).tags.length > 0 && (
										<View className="flex-row flex-wrap justify-end flex-1 ml-2">
											{(item as any).tags.map((tag: string) => {
												const tagColors = getTagColor(tag, isDark);
												return (
													<View
														key={`${tag}`}
														className="px-2 py-0.5 rounded-full ml-1 mb-1 border"
														style={{
															backgroundColor: tagColors.bg,
															borderColor: tagColors.border,
														}}
													>
														<Text className="text-[10px] font-bold" style={{ color: tagColors.text }}>
															{tag}
														</Text>
													</View>
												);
											})}
										</View>
									)}
								</View>

								{/* Last Poster / Search Blurb */}
								{variant === "search" && item.search_blurb ? (
									// 搜索结果模式：显示时间 - 摘要
									<View className="flex-row items-center justify-between">
										<Text className="text-sm text-muted-foreground flex-1" numberOfLines={5}>
											{formatRelativeTime(lastPostedAt)} - {item.search_blurb}
										</Text>

										{category &&
											(() => {
												const softColors = dampenColor(`#${category.data.color}`, isDark);
												return (
													<View
														className="px-2 py-0.5 rounded-md ml-2 border"
														style={{
															backgroundColor: softColors.bg,
															borderColor: softColors.border,
														}}
													>
														<Text className="text-[10px] font-bold" style={{ color: softColors.text }}>
															{category.text}
														</Text>
													</View>
												);
											})()}
									</View>
								) : lastPosterUsername ? (
									// 普通话题列表模式：显示用户名 + 时间
									<View className="flex-row items-center justify-between">
										<Text className="text-sm text-muted-foreground">
											{lastPosterUsername}
											{"  "}
											{formatRelativeTime(lastPostedAt)}
										</Text>

										{category &&
											(() => {
												const softColors = dampenColor(`#${category.data.color}`, isDark);
												return (
													<View
														className="px-2 py-0.5 rounded-md ml-2 border"
														style={{
															backgroundColor: softColors.bg,
															borderColor: softColors.border,
														}}
													>
														<Text className="text-[10px] font-bold" style={{ color: softColors.text }}>
															{category.text}
														</Text>
													</View>
												);
											})()}
									</View>
								) : null}
							</View>
						</View>

						{/* Unread Indicator */}
						{hasUnread === true && <View className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />}

						{/* Bookmarked Indicator */}
						{item.bookmarked === true && <View className="absolute top-4 right-8 w-2 h-2 rounded-full bg-yellow-500" />}
					</Pressable>
				</Animated.View>
			</SwipeableWrapper>
		</>
	);
};
