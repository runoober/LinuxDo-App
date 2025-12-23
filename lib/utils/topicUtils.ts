import type { OriginalPosterInfo, TopicCardItem } from "~/components/topic/TopicCard";

// 用户信息类型（API 返回的 users 数组元素）
type UserInfo = {
	id?: number;
	username?: string;
	name?: string | null;
	avatar_template?: string;
};

// Poster 类型（API 返回的 posters 数组元素）
type PosterInfo = {
	user_id?: number;
	description?: string;
	extras?: string;
};

// 带有 posters 字段的 topic 类型
type TopicWithPosters = TopicCardItem & {
	posters?: PosterInfo[];
};

/**
 * 将用户信息合并到话题列表中
 * 为每个话题查找 Original Poster 并添加 original_poster 字段
 * @param topics - 话题列表
 * @param users - 用户列表
 * @returns 包含 original_poster 信息的话题列表
 */
export function mergeUsersToTopics(topics: TopicWithPosters[] | undefined, users: UserInfo[] | undefined): TopicCardItem[] {
	if (!topics) return [];
	if (!users || users.length === 0) return topics;

	// 创建用户 ID 到用户信息的映射
	const userMap = new Map<number, UserInfo>();
	for (const user of users) {
		if (user.id !== undefined) {
			userMap.set(user.id, user);
		}
	}

	// 为每个话题查找 Original Poster
	return topics.map((topic) => {
		// 查找 Original Poster（description 包含 "Original Poster" 或 "原始发帖人"）
		const originalPoster = topic.posters?.find(
			(p) => p.description?.includes("Original Poster") || p.description?.includes("原始发帖人") || p.extras === "latest",
		);

		if (!originalPoster || originalPoster.user_id === undefined) {
			return topic;
		}

		const user = userMap.get(originalPoster.user_id);
		if (!user || !user.username) {
			return topic;
		}

		// 添加 original_poster 信息
		const opInfo: OriginalPosterInfo = {
			username: user.username,
			name: user.name,
			avatar_template: user.avatar_template,
		};

		return {
			...topic,
			original_poster: opInfo,
		};
	});
}
