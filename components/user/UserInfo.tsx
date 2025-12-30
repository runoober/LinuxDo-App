import { useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { HTMLContent } from "~/components/ui/html-content";
import { Text } from "~/components/ui/text";

const LINUX_DO_BASE_URL = "https://linux.do";

interface UserInfoProps {
	name: string;
	username: string;
	level: number;
	bio: string;
}

export function UserInfo({ name, username, level, bio }: UserInfoProps) {
	// 处理 bio 中的相对路径图片，拼接 base_url
	const processedBio = useMemo(() => {
		if (!bio) return "";
		// 将 src="/xxx" 替换为 src="https://linux.do/xxx"
		return bio.replace(
			/src="(\/[^"]*)"/g,
			`src="${LINUX_DO_BASE_URL}$1"`
		);
	}, [bio]);

	const hasHtmlContent = bio.includes("<");

	return (
		<Animated.View entering={FadeIn.delay(100)} className="flex-1">
			<View className="flex-row items-center justify-between">
				<View>
					<Text className="text-xl font-bold">{name}</Text>
					<Text className="text-sm text-muted-foreground">@{username}</Text>
					<Text className="text-sm text-primary">Level {level}</Text>
				</View>
				<Button variant="outline" size="sm">
					<Text>Edit</Text>
				</Button>
			</View>
			{bio ? (
				hasHtmlContent ? (
					<View className="mt-2">
						<HTMLContent html={processedBio} baseSize={14} />
					</View>
				) : (
					<Text className="mt-2 text-muted-foreground">{bio}</Text>
				)
			) : null}
		</Animated.View>
	);
}

