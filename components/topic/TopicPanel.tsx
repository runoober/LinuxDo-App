import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

	// Initialize client if not exists and refresh topics
	useEffect(() => {
		const initializeClientAndRefresh = async () => {
			// 如果是未读话题且用户未登录，直接返回，不需要初始化客户端
			if (listTopics === "listUnreadTopics" && !isLoggedIn) {
				// 不需要设置topicItems，因为我们已经在初始状态设置了
				return;
			}

			// 初始化客户端
			if (!client) {
				await initClient();
			}

			// 对于非未读话题或已登录用户，在客户端初始化后刷新数据
			handleRefresh();
		};

		initializeClientAndRefresh();
	}, [client, initClient, listTopics, isLoggedIn]); // 移除topicItems依赖，避免无限循环

	// Only call onItemsChange when topicItems changes and is not undefined
	useEffect(() => {
		// Skip the initial render when topicItems is set from props.initialItems
		if (topicItems !== undefined) {
			props.onItemsChange?.(topicItems);
		}
	}, [topicItems, props.onItemsChange]);

	const handleRefresh = useCallback(async () => {
		if (isLoading || !client) return; // Prevent multiple simultaneous calls and handle client undefined

		// 如果是未读话题且用户未登录，不请求数据
		if (listTopics === "listUnreadTopics" && !isLoggedIn) {
			setTopicItems([]);
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setTopicItems(undefined);
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
			else if (listTopics === "listCategoryTopics") topics = await client[listTopics](props.params);
			else if (listTopics === "getTag") topics = await client[listTopics](props.params);
			else throw Error("TopicPanel(handleRefresh): Invalid listTopics");

			// 合并用户信息到话题列表
			const topicsWithUsers = mergeUsersToTopics(topics.topic_list?.topics as TopicCardItem[], (topics as any).users);
			setTopicItems(topicsWithUsers);
			const moreUrl = client.getLoadMoreTopicsUrl(topics as { topic_list?: { more_topics_url?: string } });
			setLoadMoreUrl(moreUrl);
			setHasMore(moreUrl !== null);
		} catch (error: any) {
			console.error("Error fetching topics:", error);
			// 凡是请求失败，都确保 topicItems 不为 undefined，从而允许用户看到空状态或进行下拉刷新
			setTopicItems((prev) => prev || []);
		} finally {
			setIsLoading(false);
		}
	}, [client, isLoading, listTopics, props, isLoggedIn]);

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
