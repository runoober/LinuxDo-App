import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { dampenColor } from "~/lib/utils/colorUtils";
import { getCategoryIcon } from "~/lib/utils/categoryIcon";
import { useCategoriesStore } from "~/store/categoriesStore";
import { useActivityNavigation } from "../activityScreen";

export default function CategoriesScreen() {
	const { categories, init } = useCategoriesStore();
	const { navigate } = useActivityNavigation();
	const { t } = useTranslation();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	useEffect(() => {
		init();
	}, [init]);

	const renderItem = ({ item: category, index }: { item: (typeof categories)[0]; index: number }) => {
		const softColors = dampenColor(`#${category.data.color}`, isDark);
		const iconName = (category.data as { icon?: string }).icon;
		const IconElement = getCategoryIcon(iconName, 20, softColors.text);

		return (
			<Animated.View entering={FadeInDown.delay(index * 50).springify()} className="p-1 mb-3">
				<Button
					variant="outline"
					className="py-5 px-4 flex-row items-center justify-between"
					style={{ backgroundColor: softColors.bg, borderColor: softColors.border }}
					onPress={() =>
						navigate({
							listTopics: "listCategoryTopics",
							id: String(category.data.id),
							slug: category.data.slug,
							title: t("tabs.categoryTitle", { name: category.text }),
						})
					}
				>
					<View className="flex-row items-center flex-1 h-6">
						<View className="mr-3">
							{IconElement || <Bookmark size={20} color={softColors.text} />}
						</View>
						<View className="flex-1">
							<Text className="text-lg font-semibold mb-1" style={{ color: softColors.text }}>
								{category.text}
							</Text>
							{category.data.description && (
								<Text className="text-sm" style={{ color: softColors.text, opacity: 0.7 }}>
									{String(category.data.description)}
								</Text>
							)}
						</View>
					</View>
					{category.data.topic_count !== undefined && (
						<View className="ml-4 px-4 py-1 h-8 rounded-full" style={{ backgroundColor: softColors.border }}>
							<Text className="text-xs font-medium" style={{ color: softColors.text }}>
								{category.data.topic_count}
							</Text>
						</View>
					)}
				</Button>
			</Animated.View>
		);
	};

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					title: t("tabs.category"),
					headerLargeTitle: true,
					headerBlurEffect: "regular",
				}}
			/>

			<FlashList
				data={categories}
				renderItem={renderItem}
				estimatedItemSize={80}
				contentContainerStyle={{ padding: 16 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}
