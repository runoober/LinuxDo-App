import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Text } from "~/components/ui/text";
import { EMOJI_CATEGORIES, EMOJI_DATA, type EmojiCategoryId, getEmojiUrl, toEmojiCode } from "~/lib/constants/emojiData";
import { useTheme } from "../providers/ThemeProvider";

interface EmojiPickerProps {
	visible: boolean;
	onEmojiSelect: (emojiCode: string) => void;
	onClose?: () => void;
}

const EMOJI_SIZE = 28;
const EMOJI_PADDING = 8;
const COLUMNS = 8;

export const EmojiPicker = ({ visible, onEmojiSelect, onClose }: EmojiPickerProps) => {
	const { colors } = useTheme();
	const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>("smileys");

	const handleEmojiPress = useCallback(
		(emojiName: string) => {
			onEmojiSelect(toEmojiCode(emojiName));
		},
		[onEmojiSelect],
	);

	const handleCategoryPress = useCallback((categoryId: EmojiCategoryId) => {
		setActiveCategory(categoryId);
	}, []);

	if (!visible) return null;

	const emojis = EMOJI_DATA[activeCategory] || [];

	return (
		<Animated.View entering={SlideInDown.duration(250)} exiting={SlideOutDown.duration(200)} className="bg-card border-t border-border">
			{/* 分类 Tab 栏 */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="border-b border-border"
				contentContainerStyle={{ paddingHorizontal: 8 }}
			>
				{EMOJI_CATEGORIES.map((category) => (
					<Pressable
						key={category.id}
						onPress={() => handleCategoryPress(category.id)}
						className={`px-3 py-2 mx-1 rounded-t-lg ${activeCategory === category.id ? "bg-primary/20" : ""}`}
					>
						<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
							<Text className={`text-lg ${activeCategory === category.id ? "opacity-100" : "opacity-60"}`}>{category.icon}</Text>
						</Animated.View>
					</Pressable>
				))}
			</ScrollView>

			{/* 表情网格 */}
			<ScrollView
				style={{ maxHeight: 200 }}
				showsVerticalScrollIndicator={true}
				contentContainerStyle={{
					flexDirection: "row",
					flexWrap: "wrap",
					padding: 8,
				}}
			>
				{emojis.map((emojiName) => (
					<Pressable
						key={emojiName}
						onPress={() => handleEmojiPress(emojiName)}
						style={{
							width: `${100 / COLUMNS}%`,
							aspectRatio: 1,
							padding: EMOJI_PADDING / 2,
						}}
						className="items-center justify-center"
					>
						<Image
							source={{ uri: getEmojiUrl(emojiName) }}
							style={{ width: EMOJI_SIZE, height: EMOJI_SIZE }}
							contentFit="contain"
							cachePolicy="memory-disk"
						/>
					</Pressable>
				))}
			</ScrollView>

			{/* 分类名称提示 */}
			<View className="px-3 py-1 border-t border-border">
				<Text className="text-xs text-muted-foreground">
					{EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name || ""}
				</Text>
			</View>
		</Animated.View>
	);
};
