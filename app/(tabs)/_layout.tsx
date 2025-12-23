import { Tabs } from "expo-router";
import { Bell, HomeIcon, Menu, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { UserAvatar } from "~/components/UserAvatar";
import { Text } from "~/components/ui/text";
import { useLinuxDoClientStore } from "~/store/linuxDoClientStore";
import { useUserStore } from "~/store/userStore";

export default function TabLayout() {
	const [showLoading, setShowLoading] = useState(true);
	const linuxDoClientState = useLinuxDoClientStore();
	const { username, userData, init: initUser } = useUserStore();
	const { t } = useTranslation();

	useEffect(() => {
		const initialize = async () => {
			try {
				// If client doesn't exist, initialize it
				if (linuxDoClientState.client === null) {
					await linuxDoClientState.init();
				}
				// Initialize user data regardless of client state
				initUser();
			} catch (error) {
				console.error("ERROR: When initializing tab layout", error);
			} finally {
				// Always hide loading after initialization attempt
				setShowLoading(false);
			}
		};

		initialize();
	}, [linuxDoClientState.client, linuxDoClientState.init, initUser]);

	// Show a simple loading indicator instead of full screen text
	if (showLoading)
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Text className="text-lg font-medium text-foreground">Loading...</Text>
			</View>
		);

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: Platform.select({
					ios: {
						position: "absolute",
					},
					default: {},
				}),
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: t("tabs.home") || "话题",
					tabBarIcon: ({ color }) => <HomeIcon color={color} />,
				}}
			/>
			<Tabs.Screen
				name="navigation"
				options={{
					title: t("tabs.navigation") || "导航",
					tabBarIcon: ({ color }) => <Menu color={color} />,
				}}
			/>
			<Tabs.Screen
				name="messages"
				options={{
					title: t("tabs.messages") || "消息",
					tabBarIcon: ({ color }) => <Bell color={color} />,
				}}
			/>
			<Tabs.Screen
				name="user"
				options={{
					title: t("tabs.user") || "我的",
					tabBarIcon: ({ color }) =>
						username ? (
							<UserAvatar username={username} avatarTemplate={userData?.user.avatar_template} size={24} />
						) : (
							<User color={color} size={24} />
						),
				}}
			/>
		</Tabs>
	);
}
