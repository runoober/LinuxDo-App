import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import { ErrorRetry } from "~/components/ErrorRetry";
import { useTheme } from "~/components/providers/ThemeProvider";
import { Text } from "~/components/ui/text";
import { useAuthStore } from "~/store/authStore";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";

interface Notification {
	id: number;
	notification_type: number;
	read: boolean;
	created_at: string;
	post_number?: number;
	topic_id?: number;
	fancy_title?: string;
	slug?: string;
	data: {
		badge_id?: number;
		badge_name?: string;
		badge_slug?: string;
		badge_title?: boolean;
		username?: string;
		display_username?: string;
		topic_title?: string;
		original_username?: string;
		original_name?: string;
		original_post_id?: number;
		original_post_type?: number;
	};
}

export default function MessagesScreen() {
	const { t } = useTranslation();
	const { colors } = useTheme();
	const router = useRouter();
	const { isLoggedIn } = useAuthStore();
	const { client } = useLinuxDoClientStore();

	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadNotifications = useCallback(
		async (isRefresh = false) => {
			if (!client || !isLoggedIn) return;

			if (isRefresh) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			try {
				const response = await client.getNotifications();
				setNotifications(response.notifications || []);
			} catch (err: unknown) {
				console.error("加载通知失败:", err);
				setError(err instanceof Error ? err.message : "加载失败");
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[client, isLoggedIn],
	);

	useEffect(() => {
		if (isLoggedIn) {
			loadNotifications();
		}
	}, [isLoggedIn, loadNotifications]);

	const handleRefresh = useCallback(() => {
		loadNotifications(true);
	}, [loadNotifications]);

	const handleNotificationPress = useCallback(
		(notification: Notification) => {
			if (notification.topic_id) {
				router.push(`/topic/${notification.topic_id}`);
			}
		},
		[router],
	);

	const getNotificationText = (notification: Notification): string => {
		const { data } = notification;

		switch (notification.notification_type) {
			case 1: // mentioned
				return `${data.display_username || data.username} 在话题中提到了你`;
			case 2: // replied
				return `${data.display_username || data.username} 回复了你`;
			case 3: // quoted
				return `${data.display_username || data.username} 引用了你`;
			case 5: // liked
				return `${data.display_username || data.username} 赞了你的帖子`;
			case 6: // private_message
				return `${data.display_username || data.username} 给你发了私信`;
			case 9: // invited_to_topic
				return `${data.display_username || data.username} 邀请你加入话题`;
			case 12: // granted_badge
				return `你获得了徽章: ${data.badge_name}`;
			default:
				return "新通知";
		}
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 60) {
			return `${minutes}分钟前`;
		}
		if (hours < 24) {
			return `${hours}小时前`;
		}
		if (days < 30) {
			return `${days}天前`;
		}
		return date.toLocaleDateString();
	};

	const renderItem = useCallback(
		({ item }: { item: Notification }) => (
			<Pressable
				className={`flex-row p-4 border-b border-border active:opacity-70 ${!item.read ? "bg-primary/5" : "bg-card"}`}
				onPress={() => handleNotificationPress(item)}
			>
				<View className="flex-1">
					<Text className="text-base text-foreground mb-1">{getNotificationText(item)}</Text>
					{item.fancy_title && (
						<Text className="text-sm text-muted-foreground mb-1" numberOfLines={1}>
							{item.fancy_title}
						</Text>
					)}
					<Text className="text-xs text-muted-foreground">{formatTime(item.created_at)}</Text>
				</View>
				{!item.read && <View className="w-2 h-2 rounded-full bg-primary ml-2 mt-1.5" />}
			</Pressable>
		),
		[handleNotificationPress],
	);

	const renderEmpty = useCallback(() => {
		if (!isLoggedIn) {
			return (
				<View className="flex-1 items-center justify-center py-16">
					<Mail size={48} className="text-muted-foreground mb-3" />
					<Text className="text-muted-foreground mb-4">请先登录查看消息</Text>
					<Pressable className="bg-primary px-6 py-3 rounded-lg active:opacity-80" onPress={() => router.push("/loginScreen")}>
						<Text className="text-primary-foreground font-semibold">去登录</Text>
					</Pressable>
				</View>
			);
		}

		if (isLoading) {
			return (
				<View className="flex-1 items-center justify-center py-16">
					<ActivityIndicator size="large" color={colors.primary} />
					<Text className="text-muted-foreground mt-3">加载中...</Text>
				</View>
			);
		}

		if (error) {
			return <ErrorRetry onRetry={handleRefresh} message={t("notifications.loadFailed", "加载通知失败")} />;
		}

		return (
			<View className="flex-1 items-center justify-center py-16">
				<Text className="text-5xl mb-3">📭</Text>
				<Text className="text-muted-foreground">暂无通知</Text>
			</View>
		);
	}, [isLoading, error, isLoggedIn, colors.primary, router]);

	return (
		<View className="flex-1 bg-background">
			{/* 顶部栏 */}
			<View className="px-4 py-3 bg-card border-b border-border">
				<Text className="text-xl font-bold text-foreground">{t("tabs.messages") || "消息"}</Text>
			</View>

			<FlatList
				data={notifications}
				renderItem={renderItem}
				keyExtractor={(item) => item.id.toString()}
				refreshControl={
					<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
				}
				ListEmptyComponent={renderEmpty}
				contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
			/>
		</View>
	);
}
