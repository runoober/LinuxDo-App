import { ChevronRight } from "lucide-react-native";
import { type GestureResponderEvent, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { FadeIn } from "react-native-reanimated";
import { Text } from "~/components/ui/text";
import { useTimeUnitStore, type TimeUnit } from "~/store/timeUnitStore";

interface StatItemProps {
	value: number | string;
	label: string;
	isTimeValue?: boolean;
}

function formatTimeValue(seconds: number, unit: TimeUnit): string {
	switch (unit) {
		case "m":
			return `${Math.round(seconds / 60)}m`;
		case "h":
			return `${(seconds / 3600).toFixed(1)}h`;
		default:
			return `${seconds}s`;
	}
}

function StatItem({ value, label, isTimeValue }: StatItemProps) {
	const { timeUnit, cycleTimeUnit } = useTimeUnitStore();

	const displayValue =
		isTimeValue && typeof value === "number"
			? formatTimeValue(value, timeUnit)
			: value;

	if (isTimeValue) {
		return (
			<Pressable className="items-center active:opacity-70" onPress={cycleTimeUnit}>
				<Text className="text-2xl font-bold">{displayValue}</Text>
				<Text className="text-sm text-card-foreground">{label}</Text>
			</Pressable>
		);
	}

	return (
		<View className="items-center">
			<Text className="text-2xl font-bold">{displayValue}</Text>
			<Text className="text-sm text-card-foreground">{label}</Text>
		</View>
	);
}

interface UserStatsProps {
	stats: StatItemProps[];
	onPress?: ((event: GestureResponderEvent) => void) | null | undefined;
}

export function UserStats({ stats, onPress }: UserStatsProps) {
	const { t } = useTranslation();
	
	return (
		<Animated.View entering={FadeIn.delay(200)} className="mt-4 mb-4">
			<Pressable className="p-4 bg-card rounded-lg" onPress={onPress}>
				<View className="flex-row items-center justify-between mb-4">
					<Text className="text-lg">{t("user.stats")}</Text>
					<ChevronRight className="text-card-foreground" size={20} />
				</View>

				<View className="flex-row justify-between">
					{stats.map((stat) => (
						<StatItem key={stat.label} value={stat.value} label={stat.label} isTimeValue={stat.isTimeValue} />
					))}
				</View>
			</Pressable>
		</Animated.View>
	);
}
