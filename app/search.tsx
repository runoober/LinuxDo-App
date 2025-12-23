import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Search } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/components/providers/ThemeProvider";
import { TopicCard, type TopicCardItem } from "~/components/topic/TopicCard";
import { Text } from "~/components/ui/text";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";

export default function SearchScreen() {
	const { t } = useTranslation();
	const { colors } = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { q } = useLocalSearchParams<{ q: string }>();
	const { client } = useLinuxDoClientStore();

	const [searchText, setSearchText] = useState(q || "");
	const [topics, setTopics] = useState<TopicCardItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const currentQueryRef = useRef<string>("");

	// 执行搜索
	const performSearch = useCallback(
		async (term: string, page = 1, append = false) => {
			if (!term.trim() || !client) return;

			// 如果是新搜索，重置状态
			if (!append) {
				setIsLoading(true);
				setTopics([]);
				setCurrentPage(1);
				setHasMore(true);
				currentQueryRef.current = term.trim();
			} else {
				setIsLoadingMore(true);
			}

			setHasSearched(true);

			try {
				const result = await client.search(term.trim(), page);

				// 从 posts 中提取每个 topic 的发帖者信息和搜索摘要
				const postsByTopicId = new Map<
					number,
					{ username: string; name: string; avatar_template: string; blurb: string; post_number: number }
				>();
				for (const post of result.posts || []) {
					// 只保留每个话题的第一个帖子的用户信息（通常是发帖者）
					if (!postsByTopicId.has(post.topic_id)) {
						postsByTopicId.set(post.topic_id, {
							username: post.username,
							name: post.name,
							avatar_template: post.avatar_template,
							blurb: post.blurb,
							post_number: post.post_number,
						});
					}
				}

				// 合并 topics 和发帖者信息
				const searchTopics = (result.topics || []).map((topic) => {
					const postInfo = postsByTopicId.get(topic.id);
					return {
						...topic,
						original_poster: postInfo
							? {
									username: postInfo.username,
									name: postInfo.name,
									avatar_template: postInfo.avatar_template,
								}
							: undefined,
						search_blurb: postInfo?.blurb,
						search_post_number: postInfo?.post_number,
					};
				}) as TopicCardItem[];

				// 检查是否还有更多数据
				const moreResults = result.grouped_search_result?.more_full_page_results ?? false;
				setHasMore(moreResults || searchTopics.length >= 50);

				if (append) {
					setTopics((prev) => {
						// 去重
						const existingIds = new Set(prev.map((t) => t.id));
						const newTopics = searchTopics.filter((t) => !existingIds.has(t.id));
						return [...prev, ...newTopics];
					});
					setCurrentPage(page);
				} else {
					setTopics(searchTopics);
					setCurrentPage(1);
				}
			} catch (error) {
				console.error("Search error:", error);
				if (!append) {
					setTopics([]);
				}
				setHasMore(false);
			} finally {
				setIsLoading(false);
				setIsLoadingMore(false);
			}
		},
		[client],
	);

	// 初始搜索
	useEffect(() => {
		if (q) {
			performSearch(q);
		}
	}, [q, performSearch]);

	// 处理搜索
	const handleSearch = useCallback(() => {
		if (searchText.trim()) {
			performSearch(searchText.trim());
		}
	}, [searchText, performSearch]);

	// 加载更多
	const handleLoadMore = useCallback(() => {
		if (isLoading || isLoadingMore || !hasMore || !currentQueryRef.current) return;
		performSearch(currentQueryRef.current, currentPage + 1, true);
	}, [isLoading, isLoadingMore, hasMore, currentPage, performSearch]);

	// 返回
	const handleBack = useCallback(() => {
		router.back();
	}, [router]);

	// 打开话题
	const handleTopicPress = useCallback(
		(topicId: number, postNumber?: number) => {
			if (postNumber) {
				router.push(`/topic/${topicId}?post=${postNumber}`);
			} else {
				router.push(`/topic/${topicId}`);
			}
		},
		[router],
	);

	// 渲染列表底部
	const renderFooter = useCallback(() => {
		if (isLoadingMore) {
			return (
				<View className="py-4 items-center">
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			);
		}
		if (!hasMore && topics.length > 0) {
			return (
				<View className="py-4 items-center">
					<Text className="text-muted-foreground text-sm">{t("search.noMore") || "没有更多结果了"}</Text>
				</View>
			);
		}
		return null;
	}, [isLoadingMore, hasMore, topics.length, colors.primary, t]);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<Stack.Screen options={{ headerShown: false }} />
			{/* 搜索头部 */}
			<View className="flex-row items-center px-3 py-1 bg-card border-b border-border">
				<TouchableOpacity onPress={handleBack} className="mr-2 p-1">
					<ArrowLeft size={24} color={colors.foreground} />
				</TouchableOpacity>
				<View className="flex-1 flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: colors.muted }}>
					<Search size={18} color={colors.mutedForeground} />
					<TextInput
						className="flex-1 ml-2 text-base"
						style={{ color: colors.foreground }}
						placeholder={t("search.placeholder") || "搜索..."}
						placeholderTextColor={colors.mutedForeground}
						value={searchText}
						onChangeText={setSearchText}
						onSubmitEditing={handleSearch}
						returnKeyType="search"
						autoFocus
					/>
				</View>
				<TouchableOpacity onPress={handleSearch} className="ml-2 p-1">
					<Text className="text-primary font-medium">{t("search.search") || "搜索"}</Text>
				</TouchableOpacity>
			</View>

			{/* 搜索结果 */}
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color={colors.primary} />
					<Text className="mt-2 text-muted-foreground">{t("common.loading") || "加载中..."}</Text>
				</View>
			) : topics.length > 0 ? (
				<FlatList
					data={topics}
					keyExtractor={(item) => String(item.id)}
					renderItem={({ item }) => (
						<TopicCard
							item={item}
							onPress={() => item.id && handleTopicPress(item.id, item.search_post_number)}
							enableSwipe={false}
							variant="search"
						/>
					)}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.3}
					ListFooterComponent={renderFooter}
					contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 12 }}
				/>
			) : hasSearched ? (
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-muted-foreground text-center">{t("search.noResults") || "未找到相关话题"}</Text>
				</View>
			) : (
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-muted-foreground text-center">{t("search.enterKeyword") || "请输入关键词进行搜索"}</Text>
				</View>
			)}
		</View>
	);
}
