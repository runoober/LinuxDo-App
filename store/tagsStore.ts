import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NavigationItem } from "~/components/navigation/NavigationSection";
import type { ListTags200TagsItem } from "~/lib/gen/api/discourseAPI/schemas";
import { useLinuxDoClientStore } from "./linuxDoClientStore";

interface TagsState {
	tags: NavigationItem<ListTags200TagsItem>[];
	isLoading: boolean;
	error: string | null;
	init: () => Promise<void>;
	refresh: () => Promise<void>;
}

export const useTagsStore = create<TagsState>()(
	devtools(
		(set, get) => ({
			tags: [],
			isLoading: false,
			error: null,

			init: async () => {
				const { isLoading, tags, refresh } = get();
				if (isLoading || tags.length > 0) return;

				await refresh();
			},

			refresh: async () => {
				if (get().isLoading) return;

				const client = useLinuxDoClientStore.getState().client;
				if (!client) return;

				set({ isLoading: true, error: null });

				try {
					const data = await client.listTags();

					// 收集顶层 tags
					const topLevelTags: ListTags200TagsItem[] = data.tags || [];

					// 收集 extras.tag_groups 中的所有 tags
					const tagGroupTags: ListTags200TagsItem[] = [];
					const extras = data.extras as
						| { tag_groups?: { id: number; name: string; tags: ListTags200TagsItem[] }[] }
						| undefined;
					if (extras?.tag_groups) {
						for (const group of extras.tag_groups) {
							if (group.tags) {
								tagGroupTags.push(...group.tags);
							}
						}
					}

					// 合并并去重（以 id 为准）
					const tagMap = new Map<string, ListTags200TagsItem>();
					for (const tag of [...topLevelTags, ...tagGroupTags]) {
						if (tag.id) {
							// 如果已存在，保留 count 更大的
							const existing = tagMap.get(tag.id);
							if (!existing || (tag.count ?? 0) > (existing.count ?? 0)) {
								tagMap.set(tag.id, tag);
							}
						}
					}

					// 转换为数组并按 count 降序排序
					const allTags = Array.from(tagMap.values()).sort(
						(a, b) => (b.count ?? 0) - (a.count ?? 0),
					);

					set({
						tags: allTags.map((tag) => ({
							key: tag.id || "",
							text: tag.text || "",
							data: tag,
						})),
						isLoading: false,
					});
				} catch (e) {
					console.error("ERROR: When listTags", e);
					set({
						tags: [
							{
								key: "1",
								text: "Error loading tags",
								data: {} as ListTags200TagsItem,
							},
						],
						isLoading: false,
						error: "Failed to load tags",
					});
				}
			},
		}),
		{
			name: "tags-store",
		},
	),
);
