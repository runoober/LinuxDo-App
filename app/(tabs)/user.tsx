import { router } from "expo-router";
import { Bookmark, ChevronRight, FileText, LogOut, Settings, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import Toast from "react-native-toast-message";
import { ErrorRetry } from "~/components/ErrorRetry";
import { UserAvatar } from "~/components/UserAvatar";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { UserHeader } from "~/components/user/UserHeader";
import { UserInfo } from "~/components/user/UserInfo";
import { UserStats } from "~/components/user/UserStats";
import { useAuthStore } from "~/store/authStore";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";
import { useUserStore } from "~/store/userStore";

interface MenuItem {
	icon: React.ReactNode;
	title: string;
	onPress: () => void;
}

export default function UserScreen() {
	const { t } = useTranslation();
	const { isLoggedIn, checkLoginStatus, logout, init: initAuth } = useAuthStore();
	const client = useLinuxDoClientStore().client;
	const { userData, isLoading, error, init: initUser } = useUserStore();

	const [isRefreshing, setIsRefreshing] = useState(false);
	interface UserSummary {
		user_summary: {
			days_visited: number;
			time_read: number;
			posts_read_count: number;
			likes_received: number;
		};
	}

	const [userSummary, setUserSummary] = useState<UserSummary | null>(null);

	// Check login status on mount and when auth state changes
	useEffect(() => {
		checkLoginStatus();
	}, [checkLoginStatus]);

	// Initialize user data if logged in
	useEffect(() => {
		if (isLoggedIn) {
			initUser();
		}
	}, [isLoggedIn, initUser]);

	// Get user summary if user data is available
	useEffect(() => {
		if (!userData || !client || userSummary) return;
		client
			.getUserSummary(userData.user.username)
			.then(setUserSummary)
			.catch((e) => {
				console.error("ERROR: When getting user summary", e);
			});
	}, [userData, client, userSummary]);

	// Handle refresh button press
	const handleRefresh = useCallback(async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);

		await initAuth();
		if (isLoggedIn) {
			await initUser();
		}

		setIsRefreshing(false);
	}, [isRefreshing, initAuth, initUser, isLoggedIn]);

	// Navigate to login screen
	const handleLoginPress = () => {
		router.push("/loginScreen");
	};

	// Handle logout
	const handleLogout = async () => {
		try {
			await logout();
			Toast.show({
				type: "success",
				text1: "已退出登录",
			});
		} catch (e) {
			console.error("ERROR: When logging out", e);
			Toast.show({
				type: "error",
				text1: "退出失败",
			});
		}
	};

	// Menu items
	const menuItems: MenuItem[] = [
		{
			icon: <FileText size={20} className="text-muted-foreground" />,
			title: "我的话题",
			onPress: () => {
				Toast.show({ type: "info", text1: "功能开发中" });
			},
		},
		{
			icon: <Bookmark size={20} className="text-muted-foreground" />,
			title: "我的书签",
			onPress: () => {
				Toast.show({ type: "info", text1: "功能开发中" });
			},
		},
		{
			icon: <Users size={20} className="text-muted-foreground" />,
			title: "我的关注",
			onPress: () => {
				Toast.show({ type: "info", text1: "功能开发中" });
			},
		},
		{
			icon: <Settings size={20} className="text-muted-foreground" />,
			title: "设置",
			onPress: () => {
				router.push("/settingsScreen");
			},
		},
	];

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4">
				<UserHeader />
				{isLoading ? (
					<View className="flex-1 items-center justify-center py-16">
						<Text>Loading...</Text>
					</View>
				) : !isLoggedIn ? (
					<View className="items-center justify-center py-16 gap-4">
						<Text className="text-lg text-muted-foreground mb-2">匿名浏览模式</Text>
						<Button onPress={handleLoginPress} size="lg" className="px-8">
							<Text className="text-primary-foreground font-semibold">去登录</Text>
						</Button>
					</View>
				) : userData === null || error ? (
					<ErrorRetry onRetry={handleRefresh} message={t("user.loadFailed", "加载用户信息失败")} />
				) : (
					<>
						<View className="flex-row gap-4 mb-4">
							<UserAvatar username={userData.user.username} avatarTemplate={userData.user.avatar_template} size={64} />
							<UserInfo
								name={userData.user.name || userData.user.username}
								username={userData.user.username}
								level={userData.user.trust_level}
								bio={userData.user.bio_excerpt || userData.user.bio_raw || ""}
							/>
						</View>
						{userSummary && (
							<UserStats
								stats={[
									{ label: "访问天数", value: userSummary.user_summary.days_visited },
									{ label: "阅读时间", value: userSummary.user_summary.time_read },
									{ label: "已读帖子", value: userSummary.user_summary.posts_read_count },
									{ label: "获得点赞", value: userSummary.user_summary.likes_received },
								]}
							/>
						)}
					</>
				)}
			</View>

			{/* Menu List */}
			<View className="bg-card mx-4 rounded-xl overflow-hidden mb-4">
				{menuItems.map((item, index) => (
					<Pressable
						key={item.title}
						className={`flex-row items-center justify-between px-4 py-4 active:bg-muted ${
							index < menuItems.length - 1 ? "border-b border-border" : ""
						}`}
						onPress={item.onPress}
					>
						<View className="flex-row items-center gap-3">
							{item.icon}
							<Text className="text-base text-foreground">{item.title}</Text>
						</View>
						<ChevronRight size={20} className="text-muted-foreground" />
					</Pressable>
				))}
			</View>

			{/* Logout Button */}
			{isLoggedIn && (
				<Pressable className="mx-4 mb-8 py-3.5 bg-destructive rounded-xl items-center active:opacity-80" onPress={handleLogout}>
					<View className="flex-row items-center gap-2">
						<LogOut size={18} className="text-destructive-foreground" />
						<Text className="text-destructive-foreground font-semibold">退出登录</Text>
					</View>
				</Pressable>
			)}
		</ScrollView>
	);
}
