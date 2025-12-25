import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";
import { useActivityNavigation } from "~/app/activityScreen";
import { useTheme } from "~/components/providers/ThemeProvider";
import { SearchBox, type SearchBoxRef } from "~/components/search/SearchBox";
import { TopicPanel } from "~/components/topic/TopicPanel";

export default function HomeScreen() {
	const { t } = useTranslation();
	const layout = useWindowDimensions();
	const { colors } = useTheme();
	const SCREEN_WIDTH = Dimensions.get("window").width;
	const THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width as threshold for gesture
	const searchBoxRef = useRef<SearchBoxRef>(null);

	// 收起搜索建议框
	const dismissSearch = useCallback(() => {
		searchBoxRef.current?.dismiss();
	}, []);

	// renderTabBar 在组件内部定义，确保 useTheme 被正确调用
	const renderTabBar = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: for convenience
		(props: any) => (
			<View className="bg-card text-card-foreground">
				<TabBar
					{...props}
					style={{ backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }}
					indicatorStyle={{ backgroundColor: colors.primary }}
					labelStyle={{ color: colors.cardForeground }}
					activeColor={colors.cardForeground}
					inactiveColor={colors.cardForeground}
					pressColor="transparent"
					pressOpacity={1}
					swipeEnabled={true}
				/>
			</View>
		),
		[colors],
	);

	// Move SCENE_MAP inside the component to access the t function
	// Use useMemo to prevent unnecessary re-creation of SceneMap and its components
	const SCENE_MAP = useMemo(
		() =>
			SceneMap({
				all: () => <TopicPanel listTopics="listLatestTopics" onScrollBeginDrag={dismissSearch} onItemPress={dismissSearch} />,
				top: () => <TopicPanel listTopics="listTopTopics" onScrollBeginDrag={dismissSearch} onItemPress={dismissSearch} />,
				hot: () => <TopicPanel listTopics="listHotTopics" onScrollBeginDrag={dismissSearch} onItemPress={dismissSearch} />,
			}),
		[dismissSearch],
	);

	// Use translations for tab titles
	const ROUTES = [
		{ key: "all", title: t("home.allTopics") || "最新" },
		{ key: "top", title: t("home.topTopics") || "排行榜" },
		{ key: "hot", title: t("home.hotTopics") || "热门" },
	];

	const [index, setIndex] = useState(0);
	const translateX = useSharedValue(0);
	const { navigate } = useActivityNavigation();

	const rightSwipeGesture = Gesture.Pan()
		.activeOffsetX([-20, 20])
		.onBegin((event) => {
			// Only allow the gesture to start if we're on the first tab and swiping right
			return index === 0 && event.translationX >= 0 && event.absoluteX < 50;
		})
		.onUpdate((event) => {
			if (event.translationX > 0 && index === 0) {
				translateX.value = event.translationX;
			}
		})
		.onEnd((event) => {
			if (event.translationX > THRESHOLD && index === 0) {
				translateX.value = withSpring(0, { damping: 15 });
				runOnJS(navigate)({
					direction: "left",
				});
			} else translateX.value = withSpring(0, { damping: 15 });
		});

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: translateX.value }],
		};
	});

	return (
		// <GestureHandlerRootView style={{ flex: 1 }}>
		// <GestureDetector gesture={rightSwipeGesture}>
		<Animated.View style={[{ flex: 1 }, animatedStyle]}>
			{/* 搜索框 */}
			<SearchBox ref={searchBoxRef} />

			<TabView
				navigationState={{ index, routes: ROUTES }}
				renderScene={SCENE_MAP}
				onIndexChange={setIndex}
				initialLayout={{ width: layout.width }}
				renderTabBar={renderTabBar}
				swipeEnabled={true}
				lazy={true}
				lazyPreloadDistance={0}
			/>
		</Animated.View>
		// </GestureDetector>
		// </GestureHandlerRootView>
	);
}
