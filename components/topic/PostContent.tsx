import { useMemo } from "react";
import { View } from "react-native";
import { HTMLContent } from "~/components/ui/html-content";

interface PostContentProps {
	html: string;
}

export const PostContent = ({ html }: PostContentProps) => {
	// 预处理 HTML：移除 lightbox 图片的 meta 信息
	const processedHtml = useMemo(() => {
		if (!html) return html;
		
		let result = html;
		
		// 移除 Discourse lightbox 的 <div class="meta">...</div> 结构
		// 这个结构包含 SVG 图标、文件名和尺寸信息 (如 "987×581 25.3 KB")
		result = result.replace(/<div\s+class="meta"[^>]*>[\s\S]*?<\/div>/gi, '');
		
		return result;
	}, [html]);
	
	return (
		<View className="mb-3">
			<HTMLContent html={processedHtml} />
		</View>
	);
};
