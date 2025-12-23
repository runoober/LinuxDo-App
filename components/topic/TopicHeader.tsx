import { Eye, MessageCircle, Star } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import type { GetTopic200 } from "~/lib/gen/api/discourseAPI/schemas/getTopic200";
import { TitleWithEmoji } from "~/lib/titleUtils";
import { formatRelativeTime } from "~/lib/utils/dateFormat";
import { useCategoriesStore } from "~/store/categoriesStore";

type TopicHeaderProps = {
	topic: GetTopic200;
};

export const TopicHeader = ({ topic }: TopicHeaderProps) => {
	const { categories, init: initCategories } = useCategoriesStore();

	useEffect(() => {
		initCategories();
	}, [initCategories]);

	// 优先使用 unicode_title（如果有），否则使用 fancy_title
	// biome-ignore lint/suspicious/noExplicitAny: TODO
	const titleToRender = (topic as any).unicode_title || topic.fancy_title || topic.title;

	// 获取分类信息
	const categoryId = topic.category_id || 0;
	const category = useMemo(() => categories.find((c) => c.data.id === categoryId), [categories, categoryId]);

	return (
		<View className="p-4 pt-2 bg-card">
			<TitleWithEmoji title={titleToRender} className="text-xl font-bold mb-2 text-foreground" emojiSize={20} />

			{/* Stats */}
			<View className="flex-row justify-between items-center">
				<View className="flex-row items-center">
					<View className="flex-row items-center mr-4">
						<Eye size={16} className="text-muted-foreground" />
						<Text className="ml-1 text-sm text-muted-foreground">{topic.views}</Text>
					</View>

					<View className="flex-row items-center mr-4">
						<MessageCircle size={16} className="text-muted-foreground" />
						<Text className="ml-1 text-sm text-muted-foreground">{topic.posts_count}</Text>
					</View>

					{topic.like_count > 0 && (
						<View className="flex-row items-center">
							<Star size={16} className="text-muted-foreground" fill={topic.bookmarked ? "#EAB308" : "none"} />
							<Text className="ml-1 text-sm text-muted-foreground">{topic.like_count}</Text>
						</View>
					)}
				</View>

				<Text className="text-xs text-muted-foreground">{formatRelativeTime(topic.created_at)}</Text>
			</View>
		</View>
	);
};
