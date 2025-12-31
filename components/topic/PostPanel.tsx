import type { ViewToken } from "@shopify/flash-list";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ErrorRetry } from "~/components/ErrorRetry";
import { Text } from "~/components/ui/text";
import type { GetTopic200 } from "~/lib/gen/api/discourseAPI/schemas/getTopic200";
import type { GetTopic200PostStreamPostsItem } from "~/lib/gen/api/discourseAPI/schemas/getTopic200PostStreamPostsItem";
import { usePostsCache } from "~/store/cacheStore";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";
import { PostList } from "./PostList";
import { TopicHeader } from "./TopicHeader";
import { TopicDetailSkeleton } from "./TopicSkeleton";

export type PostPanelProps = {
	topicId: string;
	title?: string;
	initialTopic?: GetTopic200;
	onTopicChange?: (topic: GetTopic200) => void;
	disableRefresh?: boolean;
	disablePull2Refresh?: boolean;
	onReply?: (post: GetTopic200PostStreamPostsItem) => void;
	onLike?: (post: GetTopic200PostStreamPostsItem) => void;
	renderMore?: (post: GetTopic200PostStreamPostsItem, rerenderItem: () => void) => React.ReactNode;
	headerComponent?: React.ReactElement;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ListHeaderComponent?: React.ComponentType<any> | React.ReactElement<any> | null;
	/** 初始滚动到的帖子编号 (来自搜索结果) */
	initialPostNumber?: number;
};

export function PostPanel(props: PostPanelProps) {
	const { topicId } = props;
	const { t } = useTranslation();
	const client = useLinuxDoClientStore().client!;

	const [topic, setTopic] = useState<GetTopic200 | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [hasMore, setHasMore] = useState(true);

	const postsCache = usePostsCache();

	const handleReadPost = useCallback((topicId: number, postNumbers: number[]) => {}, []);

	const [screenTrack] = useState(() => client.getScreenTrack(handleReadPost));

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		screenTrack.start(Number.parseInt(props.topicId));
		screenTrack.scrolled();
		screenTrack.setOnscreen(
			topic?.post_stream.posts.map((p) => p.post_number).slice(0, 1) ?? [],
			topic?.post_stream.posts.map((p) => p.post_number).slice(0, 1) ?? [],
		);
		return () => {
			screenTrack.stop();
		};
	}, [screenTrack, props.topicId]);

	const onPostListScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			screenTrack.scrolled();
		},
		[screenTrack],
	);

	const onPostListViewableItemsChanged = useCallback(
		(info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
			const viewablePostNumbers = info.viewableItems.map(({ item }) => item as GetTopic200PostStreamPostsItem).map((p) => p.post_number);
			const changedPostState = info.changed.map(({ item, isViewable }) => ({
				post_number: (item as GetTopic200PostStreamPostsItem).post_number,
				isViewable,
			}));
			screenTrack.setOnscreen(
				viewablePostNumbers,
				viewablePostNumbers.filter((p) => !changedPostState.find((c) => c.post_number === p && c.isViewable)),
			);
		},
		[screenTrack],
	);

	// Initial load if no topic provided
	// Stale-while-revalidate: 先显示缓存数据，然后后台静默刷新
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (props.initialTopic) {
			setTopic(props.initialTopic);
			setIsLoading(false);
		} else {
			// 先尝试使用缓存快速显示
			const cachedData = postsCache.get(topicId);
			if (cachedData) {
				setTopic(cachedData);
				setIsLoading(false);
				// 后台静默刷新获取最新数据
				client.getTopic({ id: topicId }).then((response) => {
					setTopic(response);
					postsCache.set(topicId, response);
				}).catch((error) => {
					console.error("Background refresh failed:", error);
					// 静默失败，不显示错误（已有缓存数据）
				});
			} else {
				// 没有缓存，正常加载
				handleRefresh();
			}
		}
	}, []);

	// Update cache when topic changes
	useEffect(() => {
		if (topic) {
			postsCache.set(topicId, topic);
			props.onTopicChange?.(topic);
		}
	}, [topic, postsCache.set, topicId, props.onTopicChange]);

	const handleRefresh = useCallback(async (forceRefresh = false) => {
		if (refreshing) return;
		try {
			setRefreshing(true);
			setError(null);
			// 如果是强制刷新或没有缓存，则从服务器获取
			const cachedData = forceRefresh ? null : postsCache.get(topicId);
			const response = cachedData ?? (await client.getTopic({ id: topicId }));
			setTopic(response);
			// 如果是从服务器获取的新数据，更新缓存
			if (!cachedData) {
				postsCache.set(topicId, response);
			}
		} catch (error) {
			console.error("Error loading topic:", error);
			setError(error instanceof Error ? error : new Error(String(error)));
		} finally {
			setRefreshing(false);
			setIsLoading(false);
		}
	}, [refreshing, topicId, client, postsCache.get, postsCache.set]);

	const handleLoadMore = useCallback(async () => {
		if (loadingMore || !hasMore || !topic) return;
		try {
			setLoadingMore(true);
			let neededPosts: number[] | null = null;
			const posts = topic?.post_stream.posts;

			if (!topic || !topic.post_stream.stream) {
				setHasMore(false);
				return;
			}

			if (posts) {
				const lastPostId = posts[posts.length - 1].id;
				const currentIndex = topic.post_stream.stream.findIndex((id) => id === lastPostId);
				neededPosts = topic.post_stream.stream.slice(currentIndex + 1, currentIndex + 20).map((id) => id as number);
			}

			if (!neededPosts || !neededPosts.length) {
				console.log("No more posts to load");
				setHasMore(false);
				return;
			}

			console.log("Loading more posts:", neededPosts);
			const response = await client.getPostsFromTopic(topicId, { post_ids: neededPosts });
			if (response.post_stream?.posts) {
				setTopic((prevTopic) => {
					if (!prevTopic) return prevTopic;
					return {
						...prevTopic,
						// biome-ignore lint/suspicious/noExplicitAny: <explanation>
						post_stream: { ...prevTopic.post_stream, posts: [...prevTopic.post_stream.posts, ...(response.post_stream!.posts! as any)] },
					};
				});

				// Check if there are more posts to load
				if (posts) {
					const updatedPosts = [...posts, ...response.post_stream.posts];
					const lastUpdatedPostId = updatedPosts[updatedPosts.length - 1].id;
					const updatedIndex = topic.post_stream.stream.findIndex((id) => id === lastUpdatedPostId);
					setHasMore(updatedIndex < topic.post_stream.stream.length - 1);
				}
			}
		} catch (error) {
			console.error("Error loading more posts:", error);
			// 静默处理错误，不显示弹框
		} finally {
			setLoadingMore(false);
		}
	}, [client, topicId, topic, loadingMore, hasMore]);

	// 底部过度滚动时重新尝试加载更多：重新获取帖子详情更新 stream，然后加载新帖子
	const handleRetryLoadMore = useCallback(async () => {
		if (loadingMore) return;
		
		// 使用 setTopic 获取最新的 topic 状态
		let currentTopic: GetTopic200 | undefined;
		setTopic((prev) => {
			currentTopic = prev;
			return prev;
		});
		
		if (!currentTopic) return;
		
		try {
			setLoadingMore(true);
			console.log("Retrying load more: fetching latest topic data...");
			
			// 1. 重新获取帖子详情，更新 post_stream.stream
			const latestTopic = await client.getTopic({ id: topicId });
			
			// 2. 使用最新的 topic 状态获取当前已加载的最后一个帖子
			// 再次获取最新状态（可能在请求期间有变化）
			setTopic((prev) => {
				currentTopic = prev;
				return prev;
			});
			
			if (!currentTopic) return;
			
			const currentPosts = currentTopic.post_stream.posts;
			const lastPostId = currentPosts[currentPosts.length - 1].id;
			console.log("Current last post ID:", lastPostId, "Total loaded posts:", currentPosts.length);
			
			// 3. 在新的 stream 中找到当前位置
			const newStream = latestTopic.post_stream?.stream || [];
			const currentIndex = newStream.findIndex((id) => id === lastPostId);
			console.log("Current index in new stream:", currentIndex, "New stream length:", newStream.length);
			
			if (currentIndex === -1 || currentIndex >= newStream.length - 1) {
				console.log("No new posts available");
				setHasMore(false);
				// 更新 stream 到最新
				setTopic((prevTopic) => {
					if (!prevTopic) return prevTopic;
					const updated = { ...prevTopic, post_stream: { ...prevTopic.post_stream, stream: newStream } };
					postsCache.set(topicId, updated);
					return updated;
				});
				return;
			}
			
			// 4. 获取当前位置之后的帖子 ID，过滤掉已加载的
			const loadedPostIds = new Set(currentPosts.map(p => p.id));
			const neededPostIds = newStream
				.slice(currentIndex + 1, currentIndex + 20)
				.map((id) => id as number)
				.filter(id => !loadedPostIds.has(id));
			
			if (neededPostIds.length === 0) {
				console.log("No more posts to load after refresh (all already loaded)");
				setHasMore(false);
				return;
			}
			
			console.log("Loading new posts:", neededPostIds);
			
			// 5. 获取新帖子内容
			const postsResponse = await client.getPostsFromTopic(topicId, { post_ids: neededPostIds });
			
			if (postsResponse.post_stream?.posts && postsResponse.post_stream.posts.length > 0) {
				// 6. 更新 topic 状态，合并新帖子和更新后的 stream
				setTopic((prevTopic) => {
					if (!prevTopic) return prevTopic;
					
					// 过滤掉已存在的帖子，避免重复
					const existingIds = new Set(prevTopic.post_stream.posts.map(p => p.id).filter((id): id is number => id !== undefined));
					const newPosts = postsResponse.post_stream!.posts!.filter(p => p.id !== undefined && !existingIds.has(p.id));
					
					if (newPosts.length === 0) {
						console.log("All fetched posts already exist, skipping update");
						return prevTopic;
					}
					
					console.log("Adding", newPosts.length, "new posts to list");
					const updatedTopic = {
						...prevTopic,
						post_stream: {
							...prevTopic.post_stream,
							stream: newStream,
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
							posts: [...prevTopic.post_stream.posts, ...(newPosts as any)],
						},
					};
					// 更新缓存
					postsCache.set(topicId, updatedTopic);
					return updatedTopic;
				});
				
				// 7. 检查是否还有更多帖子
				const allPosts = [...currentPosts, ...postsResponse.post_stream.posts];
				const lastUpdatedPostId = allPosts[allPosts.length - 1].id;
				const updatedIndex = newStream.findIndex((id) => id === lastUpdatedPostId);
				setHasMore(updatedIndex < newStream.length - 1);
			}
		} catch (error) {
			console.error("Error retrying load more:", error);
		} finally {
			setLoadingMore(false);
		}
	}, [client, topicId, loadingMore, postsCache.set]);

	if (error) {
		return <ErrorRetry onRetry={handleRefresh} message={t("topic.loadFailed", "加载话题失败")} />;
	}

	if (!topic || isLoading) {
		return <TopicDetailSkeleton />;
	}

	return (
		<PostList
			headerComponent={
				props.headerComponent ?? <TopicHeader topic={topic} />
				// props.headerComponent ?? (
				// 	<View className="px-4 bg-card">
				// 		<Text className="text-xl font-bold mb-2 text-foreground">
				// 			{/* biome-ignore lint/suspicious/noExplicitAny: TODO */}
				// 			{(topic as any).unicode_title || topic.fancy_title || topic.title}
				// 		</Text>
				// 	</View>
				// )
			}
			ListHeaderComponent={props.ListHeaderComponent}
			posts={topic.post_stream.posts}
			opUsername={topic.details.created_by.username} // 楼主的username
			onReply={props.onReply}
			onLike={props.onLike}
			renderMore={props.renderMore}
			onRefresh={props.disableRefresh ? undefined : handleRefresh}
			onLoadMore={handleLoadMore}
			isLoading={refreshing}
			title={props.title ?? topic.title}
			emptyStateMessage={t("topic.noPosts", "No posts in this topic yet")}
			hasMore={hasMore}
			onRetryLoadMore={handleRetryLoadMore}
			isLoadingMore={loadingMore}
			disablePull2Refresh={props.disablePull2Refresh}
			extraFlashListProps={{ onScroll: onPostListScroll, onViewableItemsChanged: onPostListViewableItemsChanged }}
			initialPostNumber={props.initialPostNumber}
		/>
	);
}
