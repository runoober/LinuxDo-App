import { FlashList, type FlashListProps } from "@shopify/flash-list";
import { useColorScheme } from "nativewind";
import { type ComponentType, type JSXElementConstructor, type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import type { GetTopic200PostStreamPostsItem } from "~/lib/gen/api/discourseAPI/schemas/getTopic200PostStreamPostsItem";
import { ErrorRetry } from "../ErrorRetry";
import { PostItem } from "./PostItem";
import { PostSkeleton } from "./PostSkeleton";

type PostListProps = {
	posts: GetTopic200PostStreamPostsItem[];
	opUsername?: string; // 楼主的username
	onReply?: (post: GetTopic200PostStreamPostsItem) => void;
	onLike?: (post: GetTopic200PostStreamPostsItem) => void;
	renderMore?: (post: GetTopic200PostStreamPostsItem, rerenderItem: () => void) => React.ReactNode;
	onLoadMore?: () => Promise<void>;
	onRefresh?: (forceRefresh?: boolean) => Promise<void>;
	isLoading?: boolean;
	headerComponent?: ReactElement;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ListHeaderComponent?: ComponentType<any> | ReactElement<any, string | JSXElementConstructor<any>> | null | undefined;
	title?: string;
	emptyStateMessage?: string;
	disablePull2Refresh?: boolean;
	hasMore?: boolean | (() => boolean);
	/** 当底部过度滚动时重新尝试加载更多 */
	onRetryLoadMore?: () => void;
	/** 外部传入的加载更多状态（用于重试加载时显示 loading） */
	isLoadingMore?: boolean;
	extraFlashListProps?: Omit<FlashListProps<GetTopic200PostStreamPostsItem>, "ref" | "data" | "renderItem" | "ListHeaderComponent">;
	/** 初始滚动到的帖子编号 (来自搜索结果) */
	initialPostNumber?: number;
};

export const PostList = ({
	posts,
	opUsername,
	onReply,
	onLike,
	renderMore,
	onLoadMore,
	onRefresh,
	isLoading,
	headerComponent,
	ListHeaderComponent,
	title = "Posts",
	emptyStateMessage = "No posts to display",
	disablePull2Refresh,
	hasMore,
	onRetryLoadMore,
	isLoadingMore,
	extraFlashListProps,
	initialPostNumber,
}: PostListProps) => {
	const { t } = useTranslation();
	const { colorScheme } = useColorScheme();
	const [filterType, setFilterType] = useState<"all" | "unread" | "bookmarked">("all");
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const listRef = useRef<FlashList<GetTopic200PostStreamPostsItem>>(null);
	const onEndReachedCalledDuringMomentum = useRef(false);

	const isDark = colorScheme === "dark";
	const hasScrolledToInitialPost = useRef(false);
	const isAtBottom = useRef(false);
	const lastContentHeight = useRef(0);

	// 当 posts 加载完成且有 initialPostNumber 时，滚动到指定位置
	useEffect(() => {
		if (initialPostNumber && posts.length > 0 && listRef.current && !hasScrolledToInitialPost.current) {
			const targetIndex = posts.findIndex((p) => p.post_number === initialPostNumber);

			// 延迟一小段时间以确保列表已渲染
			setTimeout(() => {
				if (targetIndex >= 0) {
					// 找到目标帖子，滚动到该位置
					hasScrolledToInitialPost.current = true;
					listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.3 });
				} else {
					// 目标帖子不在已加载列表中，滚动到末尾以触发加载更多
					listRef.current?.scrollToEnd({ animated: true });
				}
			}, 300);
		}
	}, [initialPostNumber, posts]);

	const handleRefresh = async () => {
		if (onRefresh && !refreshing) {
			setRefreshing(true);
			setError(null);
			try {
				// 下拉刷新时强制从服务器获取新数据
				await onRefresh(true);
			} catch (error) {
				console.error("Error refreshing:", error);
				setError(error instanceof Error ? error : new Error(String(error)));
			} finally {
				setRefreshing(false);
			}
		}
	};

	const handleLoadMore = async () => {
		if (
			onLoadMore &&
			!loadingMore &&
			!onEndReachedCalledDuringMomentum.current &&
			(hasMore === undefined || (typeof hasMore === "boolean" ? hasMore : hasMore()))
		) {
			onEndReachedCalledDuringMomentum.current = true;
			setLoadingMore(true);
			try {
				await onLoadMore();
			} catch (error) {
				console.error("Error loading more:", error);
			} finally {
				setLoadingMore(false);
			}
		}
	};

	// 检测底部过度滚动，当 hasMore 为 false 时，继续向下拉会重新尝试加载
	const lastRetryTime = useRef(0);
	const bottomReachCount = useRef(0);
	const lastBottomReachTime = useRef(0);
	
	const handleScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
			const paddingToBottom = 10;
			const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
			const hasMoreValue = typeof hasMore === "boolean" ? hasMore : hasMore?.();
			
			// 记录是否在底部
			isAtBottom.current = isAtEnd;
			lastContentHeight.current = contentSize.height;
			
			const now = Date.now();
			
			// 在底部且没有更多内容时，记录到达底部的次数
			if (isAtEnd && !hasMoreValue && onRetryLoadMore && !loadingMore && !isLoadingMore) {
				// 如果距离上次到达底部超过 500ms，重置计数
				if (now - lastBottomReachTime.current > 500) {
					bottomReachCount.current = 0;
				}
				
				bottomReachCount.current++;
				lastBottomReachTime.current = now;
				
				// 连续 3 次触发底部检测，且距离上次重试超过 3 秒，触发重试
				if (bottomReachCount.current >= 3 && now - lastRetryTime.current > 3000) {
					console.log("Bottom reached " + bottomReachCount.current + " times, retrying load more...");
					lastRetryTime.current = now;
					bottomReachCount.current = 0;
					onRetryLoadMore();
				}
			}

			// 调用外部传入的 onScroll
			extraFlashListProps?.onScroll?.(event);
		},
		[extraFlashListProps, hasMore, onRetryLoadMore, loadingMore, isLoadingMore],
	);

	// 当用户松开手指时，如果在底部则尝试触发
	const handleScrollEndDrag = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
			const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 10;
			const hasMoreValue = typeof hasMore === "boolean" ? hasMore : hasMore?.();
			const now = Date.now();
			
			// 在底部松开时，如果没有更多内容且距离上次重试超过 3 秒，触发重试
			if (isAtEnd && !hasMoreValue && onRetryLoadMore && !loadingMore && !isLoadingMore) {
				if (now - lastRetryTime.current > 3000) {
					console.log("Bottom scroll end, retrying load more...");
					lastRetryTime.current = now;
					onRetryLoadMore();
				}
			}
		},
		[hasMore, onRetryLoadMore, loadingMore, isLoadingMore],
	);

	const renderItem = useCallback(
		({ item }: { item: GetTopic200PostStreamPostsItem }) => {
			// Find the post being replied to if reply_to_post_number exists
			let replyToPost = null;
			if (item.reply_to_post_number) {
				replyToPost = posts.find((p) => p.post_number === Number(item.reply_to_post_number));
			}
			// 判断是否是楼主
			const isOP = opUsername ? item.username === opUsername : false;
			return (
				<PostItem
					key={item.id}
					post={item}
					replyToPost={replyToPost}
					isOP={isOP}
					onReply={onReply}
					onLike={onLike}
					renderMore={renderMore}
				/>
			);
		},
		[posts, opUsername, onReply, onLike, renderMore],
	);

	const renderFooter = () => {
		const hasMoreValue = typeof hasMore === "boolean" ? hasMore : hasMore?.();
		
		// 正在加载更多时显示加载指示器（包括内部加载和外部传入的重试加载状态）
		if (loadingMore || isLoadingMore) {
			return (
				<View className="py-4 flex items-center justify-center">
					<ActivityIndicator size="small" color={isDark ? "#E5E7EB" : "#6B7280"} />
					<Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("common.loading") || "加载中..."}</Text>
				</View>
			);
		}
		
		// hasMore 为 true 时也显示加载指示器
		if (onLoadMore !== undefined && hasMoreValue) {
			return (
				<View className="py-4 flex items-center justify-center">
					<ActivityIndicator size="small" color={isDark ? "#E5E7EB" : "#6B7280"} />
					<Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("common.loading") || "加载中..."}</Text>
				</View>
			);
		}
		
		return null;
	};

	const renderEmpty = () => (
		<View className="flex-1 items-center justify-center py-10">
			<Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>{emptyStateMessage}</Text>
		</View>
	);

	if (error) {
		return <ErrorRetry onRetry={handleRefresh} />;
	}

	if (!posts.length && isLoading) {
		return <PostSkeleton />;
	}

	return (
		<View className="flex-1">
			<View style={{ paddingHorizontal: 8 }}>
				<View className="border-b border-border shadow-md rounded-b-md">{headerComponent}</View>
			</View>

			<Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp} className="flex-1">
				<FlashList
					ref={listRef}
					data={posts}
					renderItem={renderItem}
					keyExtractor={(item) => `${item.id}-${item.post_number}`}
					estimatedItemSize={200}
					contentContainerStyle={{ paddingHorizontal: 8 }}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={renderEmpty}
					ListFooterComponent={renderFooter}
					ListHeaderComponent={ListHeaderComponent}
					extraData={{ isLoadingMore, loadingMore, hasMore }}
					{...(onRefresh
						? {
								onRefresh: disablePull2Refresh ? undefined : handleRefresh,
								refreshing: refreshing,
							}
						: {})}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					onMomentumScrollBegin={() => {
						onEndReachedCalledDuringMomentum.current = false;
					}}
					onScroll={handleScroll}
					onScrollEndDrag={handleScrollEndDrag}
					{...extraFlashListProps}
					// 确保外部传入的 onScroll 不会覆盖我们的处理（已在 handleScroll 中合并）
				/>
			</Animated.View>
		</View>
	);
};
