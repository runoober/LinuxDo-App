import Markdown from "@ronradtke/react-native-markdown-display";
import { AtSign, Eye, Hash, Send, Smile, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	FadeIn,
	FadeOut,
	SlideInDown,
	SlideOutDown,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import type { GetTopic200PostStreamPostsItem } from "~/lib/gen/api/discourseAPI/schemas/getTopic200PostStreamPostsItem";
import { getInnerText } from "~/lib/utils/html";
import { useTheme } from "../providers/ThemeProvider";
import { EmojiPicker } from "./EmojiPicker";

interface ReplyInputProps {
	visible: boolean;
	replyingTo?: GetTopic200PostStreamPostsItem | null;
	onClose: () => void;
	onSubmit: (content: string, replyToPostId?: number) => Promise<void>;
}
// TODO: add support for custom emojis
export const ReplyInput = ({ visible, replyingTo, onClose, onSubmit }: ReplyInputProps) => {
	const { colors } = useTheme();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const textareaRef = useRef<React.ElementRef<typeof Textarea>>(null);
	const inputHeight = useSharedValue(180);
	const insets = useSafeAreaInsets();

	// Focus the textarea when it becomes visible
	useEffect(() => {
		if (visible) {
			setTimeout(() => {
				textareaRef.current?.focus();
			}, 300);
		} else {
			setContent("");
			setIsSubmitting(false);
			setShowEmojiPicker(false);
		}
	}, [visible]);

	// Handle content change
	const handleContentChange = useCallback(
		(text: string) => {
			setContent(text);

			// Adjust height based on content length and number of lines
			// Count newlines to estimate the number of lines
			const lineCount = (text.match(/\n/g) || []).length + 1;
			const baseHeight = 180; // 包含输入框和底部按钮行
			const lineHeight = 24; // Approximate line height
			const calculatedHeight = Math.min(baseHeight + lineCount * lineHeight, 360);

			inputHeight.value = withTiming(calculatedHeight, { duration: 150 });
		},
		[inputHeight],
	);

	// Insert special characters at cursor position
	const insertAtCursor = useCallback(
		(textToInsert: string) => {
			// Simply append to the end of content
			setContent((prev) => prev + textToInsert);

			// Focus back on textarea after a short delay
			setTimeout(() => {
				textareaRef.current?.focus();
			}, 50);
		},
		[],
	);

	// Toggle markdown preview
	const togglePreview = useCallback(() => {
		setShowPreview((prev) => !prev);
		setShowEmojiPicker(false);
	}, []);

	// Toggle emoji picker
	const toggleEmojiPicker = useCallback(() => {
		if (!showEmojiPicker) {
			// 关闭键盘，显示表情面板
			Keyboard.dismiss();
		}
		setShowEmojiPicker((prev) => !prev);
		setShowPreview(false);
	}, [showEmojiPicker]);

	// Handle emoji selection
	const handleEmojiSelect = useCallback((emojiCode: string) => {
		setContent((prev) => prev + emojiCode);
	}, []);

	// Handle textarea focus - hide emoji picker when textarea is focused
	const handleTextareaFocus = useCallback(() => {
		setShowEmojiPicker(false);
	}, []);

	// Handle submit
	const handleSubmit = useCallback(async () => {
		if (content.trim() && !isSubmitting) {
			try {
				setIsSubmitting(true);
				await onSubmit(content, replyingTo?.id);
				setContent("");
				onClose();
			} catch (error) {
				console.error("Error submitting reply:", error);
				setIsSubmitting(false);
			}
		}
	}, [content, onSubmit, replyingTo, onClose, isSubmitting]);

	// Animated styles
	const animatedContainerStyle = useAnimatedStyle(() => {
		return {
			height: inputHeight.value,
		};
	});

	if (!visible) return null;

	// If replying to a post, show a preview of what's being replied to
	const replyPreview = replyingTo ? getInnerText(replyingTo.cooked).substring(0, 100) : "";

	return (
		<Animated.View
			entering={SlideInDown.duration(300)}
			exiting={SlideOutDown.duration(200)}
			className="absolute bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg"
		>
			<View className="flex-row items-center justify-between px-4 py-2 border-b border-border">
				<Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} className="flex-1">
					<Text className="font-medium">{replyingTo ? `Replying to @${replyingTo.username}` : "Replying to Topic"}</Text>
					{replyingTo && (
						<Text className="text-xs text-muted-foreground mt-1" numberOfLines={1}>
							{replyPreview}
						</Text>
					)}
				</Animated.View>
				<Pressable onPress={onClose} className="p-2 ml-2">
					<X size={20} className="text-muted-foreground" />
				</Pressable>
			</View>

			<Animated.View style={[animatedContainerStyle, { paddingBottom: Math.max(insets.bottom, 16) }]} className="p-4 pb-6">
				{showPreview ? (
					<ScrollView
						className="flex-1 mb-2 p-2 border border-input rounded-md bg-background text-foreground"
						contentInsetAdjustmentBehavior="automatic"
						style={{ height: "100%" }}
					>
						<Markdown style={{ body: { color: colors.foreground } }}>{content || "*No content to preview*"}</Markdown>
					</ScrollView>
				) : (
					<Textarea
						ref={textareaRef}
						value={content}
						onChangeText={handleContentChange}
						placeholder="Be kind, polite, respectful, and professional"
						multiline
						className="flex-1 mb-2 text-base"
						autoFocus={false}
						textAlignVertical="top"
						onFocus={handleTextareaFocus}
					/>
				)}

				<View className="flex-row justify-between items-center">
					{/* Quick insert buttons */}
					<View className="flex-row">
						<Button variant="outline" size="sm" onPress={() => insertAtCursor("#")} className="mr-2">
							<Hash size={16} className="text-foreground" />
						</Button>
						<Button variant="outline" size="sm" onPress={() => insertAtCursor("@")} className="mr-2">
							<AtSign size={16} className="text-foreground" />
						</Button>
						<Button variant={showEmojiPicker ? "default" : "outline"} size="sm" onPress={toggleEmojiPicker} className="mr-2">
							<Smile size={16} className={showEmojiPicker ? "text-primary-foreground" : "text-foreground"} />
						</Button>
						<Button variant={showPreview ? "default" : "outline"} size="sm" onPress={togglePreview}>
							<Eye size={16} className={showPreview ? "text-primary-foreground" : "text-foreground"} />
						</Button>
					</View>

					{/* Character count and send button */}
					<View className="flex-row items-center">
						<Text className="text-muted-foreground text-xs mr-2">{content.length > 0 ? `${content.length} characters` : ""}</Text>
						<Button onPress={handleSubmit} disabled={!content.trim() || isSubmitting} className="flex-row items-center">
							<Text className="mr-2 text-primary-foreground">{isSubmitting ? "Sending..." : "Send"}</Text>
							<Send size={16} className="text-primary-foreground" />
						</Button>
					</View>
				</View>
			</Animated.View>

			{/* Emoji Picker */}
			<EmojiPicker visible={showEmojiPicker} onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
		</Animated.View>
	);
};
