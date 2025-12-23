import { ChevronRight } from "lucide-react-native";
import type { Key } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Text } from "~/components/ui/text";
import { Button } from "../ui/button";

export type NavigationItem<T> = {
	key: Key;
	text: string;
	data: T;
};

interface NavigationSectionProps<T> {
	title: string;
	items: NavigationItem<T>[];
	onItemPress?: (item: NavigationItem<T>) => void;
	onViewMore?: () => void;
	delay?: number;
	renderItem?: (item: NavigationItem<T>, index: number) => React.ReactNode;
}

export function NavigationSection<T>({ title, items, onItemPress, onViewMore, delay = 0, renderItem }: NavigationSectionProps<T>) {
	const { t } = useTranslation();
	return (
		<Animated.View entering={FadeIn.delay(delay)} className="mb-4 mx-4 p-4 bg-card rounded-lg">
			<View className="flex-row items-center justify-between mb-3">
				<Text className="text-lg font-semibold">{title}</Text>
				<Button variant="ghost" size="sm" onPress={onViewMore} className="flex-row items-center">
					<Text className="text-sm text-card-foreground mr-1">{t("common.viewMore")}</Text>
					<ChevronRight size={16} className="text-card-foreground" />
				</Button>
			</View>

			<View className="flex-row flex-wrap gap-3">
				{items.map((item, index) => {
					if (renderItem) return renderItem(item, index);
					return (
						<Button key={item.key} variant="outline" size="sm" className="flex-1 min-w-[45%]" onPress={() => onItemPress?.(item)}>
							<Text className="text-sm">{item.text}</Text>
						</Button>
					);
				})}
			</View>
		</Animated.View>
	);
}
