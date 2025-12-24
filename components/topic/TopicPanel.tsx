import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { TopicList } from "~/components/topic/TopicList";
import { Text } from "~/components/ui/text";
import type LinuxDoClient from "~/lib/linuxDoClient";
import { mergeUsersToTopics } from "~/lib/utils/topicUtils";
import { useAuthStore } from "~/store/authStore";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";
import type { SwipeAction } from "../SwipeableWrapper";
import type { TopicCardItem } from "./TopicCard";

export type TopicMethods = "listLatestTopics" | "listUnreadTopics" | "listTopTopics" | "listHotTopics" | "getTag" | "listCategoryTopics";

export type CommonTopicPanelProps = {
	listTopics: "listLatestTopics" | "listUnreadTopics" | "listTopTopics" | "listHotTopics";
};
export type TagTopicPanelProps = {
	listTopics: "getTag";
	params: { name: string };
};

export type CategoryTopicPanelProps = {
	listTopics: "listCategoryTopics";
	params: { slug: string; id: number };
};

export type TopicPanelProps = CommonTopicPanelProps | TagTopicPanelProps | CategoryTopicPanelProps;

export type FlattenParams<T> = T extends { params: infer P } ? Omit<T, "params"> & P : T;
export type FlattenedTopicPanelProps = FlattenParams<TopicPanelProps>;
export type WithTopicPanelComponentProps<T> = T & {
	title?: string;
	initialItems?: TopicCardItem[] | undefined;
	onItemsChange?: (items: TopicCardItem[]) => void;
	swipe?: SwipeAction<TopicCardItem>[];
	disableRefresh?: boolean;
	disablePull2Refresh?: boolean;
};
export type TopicPanelComponentProps = WithTopicPanelComponentProps<TopicPanelProps>;

export function TopicPanel(props: TopicPanelComponentProps) {
	const listTopics = props.listTopics;
	const { t } = useTranslation();

	const { client, init: initClient } = useLinuxDoClientStore();
	const router = useRouter();
	const { isLoggedIn } = useAuthStore();

	// 如果是未读话题且用户未登录，直接初始化为空数组，避免显示加载状态
	const initialItems = listTopics === "listUnreadTopics" && !isLoggedIn ? [] : props.initialItems;
	const [topicItems, setTopicItems] = useState<TopicCardItem[] | undefined>(initialItems);
	const [loadMoreUrl, setLoadMoreUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// 使用 JSON.stringify 作为稳定的依赖项
	const paramsKey = "params" in props ? JSON.stringify(props.params) : "";
	
	// 使用 ref 追踪加载状态
	const isLoadingRef = useRef(false);

	const handleRefresh = useCallback(async () => {
		// 使用 ref 检查加载状态，避免闭包陷阱
		if (isLoadingRef.current || !client) return;

		// 如果是未读话题且用户未登录，不请求数据
		if (listTopics === "listUnreadTopics" && !isLoggedIn) {
			setTopicItems([]);
			setIsLoading(false);
			isLoadingRef.current = false;
			return;
		}

		try {
			setIsLoading(true);
			isLoadingRef.current = true;
			setTopicItems(undefined);
			setError(null);
			let topics: Awaited<
				ReturnType<
					LinuxDoClient["listLatestTopics" | "listUnreadTopics" | "listTopTopics" | "listHotTopics" | "getTag" | "listCategoryTopics"]
				>
			>;
			if (
				listTopics === "listLatestTopics" ||
				listTopics === "listUnreadTopics" ||
				listTopics === "listTopTopics" ||
				listTopics === "listHotTopics"
			)
				topics = await (
					client[listTopics] as () => ReturnType<LinuxDoClient["listLatestTopics" | "listUnreadTopics" | "listTopTopics" | "listHotTopics"]>
				)();
			else if (listTopics === "listCategoryTopics" && "params" in props) {
				const params = props.params as { slug: string; id: number };
				topics = await client[listTopics](params);
			}
			else if (listTopics === "getTag" && "params" in props) {
				const params = props.params as { name: string };
				topics = await client[listTopics](params);
			}
			else throw Error("TopicPanel(handleRefresh): Invalid listTopics");

			// 合并用户信息到话题列表
			const topicsWithUsers = mergeUsersToTopics(topics.topic_list?.topics as TopicCardItem[], (topics as any).users);
			setTopicItems(topicsWithUsers);
			const moreUrl = client.getLoadMoreTopicsUrl(topics as { topic_list?: { more_topics_url?: string } });
			setLoadMoreUrl(moreUrl);
			setHasMore(moreUrl !== null);
		} catch (err: any) {
			console.error("Error fetching topics:", err);
			// 提取错误信息
			let errorMessage = t("common.loadFailed");
			if (err?.message) {
				// 检查是否包含 HTTP 状态码
				const statusMatch = err.message.match(/(\d{3})/);
				if (statusMatch) {
					errorMessage = `${t("common.loadFailed")} (HTTP ${statusMatch[1]})`;
				} else {
					errorMessage = err.message;
				}
			}
			setError(errorMessage);
			// 设置空数组以显示错误状态而不是加载状态
			setTopicItems([]);
		} finally {
			setIsLoading(false);
			isLoadingRef.current = false;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [client, listTopics, paramsKey, isLoggedIn]);

	// 初始化加载数据 - 只在组件首次挂载时执行
	useEffect(() => {
		const initializeClientAndRefresh = async () => {
			// 如果是未读话题且用户未登录，直接返回
			if (listTopics === "listUnreadTopics" && !isLoggedIn) {
				return;
			}

			// 初始化客户端
			if (!client) {
				await initClient();
				return; // 等待 client 初始化后再次触发此 effect
			}

			// 刷新数据
			handleRefresh();
		};

		initializeClientAndRefresh();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [client, initClient, listTopics, isLoggedIn]);

	// Only call onItemsChange when topicItems changes and is not undefined
	useEffect(() => {
		if (topicItems !== undefined) {
			props.onItemsChange?.(topicItems);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [topicItems]);

	const handleLoadMore = useCallback(async () => {
		if (isLoading || !hasMore || !topicItems || topicItems.length === 0 || !client) return;

		try {
			setIsLoading(true);
			console.log("TopicPanel: Load more topics, URL:", loadMoreUrl);
			const topics = await client.loadMoreTopics(loadMoreUrl!);

			const newTopics = topics?.topic_list?.topics;
			if (topics === null || !newTopics?.length) {
				throw Error("No more topics");
			}

			// 合并用户信息到新加载的话题
			const newTopicsWithUsers = mergeUsersToTopics(newTopics as TopicCardItem[], (topics as any).users);

			setTopicItems((prev) => {
				if (!prev) return newTopicsWithUsers;

				const existingTopics = new Set(prev.map((topic) => topic.id));
				const uniqueNewTopics = newTopicsWithUsers.filter((topic) => !existingTopics.has(topic.id));

				if (!uniqueNewTopics.length) {
					setHasMore(false);
					return prev;
				}

				return [...prev, ...uniqueNewTopics];
			});
			const moreUrl = client.getLoadMoreTopicsUrl(topics);
			setLoadMoreUrl(moreUrl);
			setHasMore(moreUrl !== null);
		} catch (error) {
			console.error("Error loading more topics:", error);
			setHasMore(false);
		} finally {
			setIsLoading(false);
		}
	}, [client, isLoading, hasMore, topicItems, loadMoreUrl]);

	// 显示错误状态
	if (error && topicItems?.length === 0) {
		return (
			<View className="flex-1 items-center justify-center p-4">
				<Text className="text-destructive text-center mb-4">{error}</Text>
				<Text className="text-muted-foreground text-center mb-4">{t("common.checkNetworkAndRetry")}</Text>
				<View className="bg-primary rounded-lg px-6 py-3">
					<Text className="text-primary-foreground font-medium" onPress={handleRefresh}>
						{t("common.retry")}
					</Text>
				</View>
			</View>
		);
	}

	return topicItems !== undefined ? (
		<TopicList
			initialItems={topicItems}
			onRefresh={props.disableRefresh ? undefined : handleRefresh}
			disablePull2Refresh={props.disablePull2Refresh}
			onLoadMore={handleLoadMore}
			hasMore={hasMore}
			title={props.title}
			onPress={(id) => router.push(`/topic/${id}`)}
			swipe={props.swipe}
		/>
	) : (
		<View className="flex-1 items-center justify-center">
			<Text>{t("home.loadingTopics")}</Text>
		</View>
	);
}

/** @deprecated Use TopicPanel directly */
export function CommonTopicPanel({ listTopics, ...props }: WithTopicPanelComponentProps<CommonTopicPanelProps>) {
	return <TopicPanel listTopics={listTopics} {...props} />;
}
export function TagTopicPanel({ listTopics, name, ...props }: WithTopicPanelComponentProps<FlattenParams<TagTopicPanelProps>>) {
	return <TopicPanel listTopics={listTopics} params={{ name }} {...props} />;
}
export function CategoryTopicPanel({
	listTopics,
	slug,
	id,
	...props
}: WithTopicPanelComponentProps<FlattenParams<CategoryTopicPanelProps>>) {
	return <TopicPanel listTopics={listTopics} params={{ slug, id }} {...props} />;
}
