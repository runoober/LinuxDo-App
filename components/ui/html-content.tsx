import { useColorScheme } from "nativewind";
import {
  Linking,
  Pressable,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import RenderHtml, {
  type MixedStyleDeclaration,
  type RenderHTMLProps,
  type TagName,
  HTMLElementModel,
  HTMLContentModel,
  CustomBlockRenderer,
  TChildrenRenderer,
  CustomRendererProps,
  TBlock,
} from "react-native-render-html";
import { cn } from "~/lib/utils";
import { convertEmojiShortcodes } from "~/lib/utils/emojiUtils";
import { Image as ExpoImage } from "expo-image";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Polygon,
  Polyline,
  Line,
  Rect,
  Text as SVGText,
} from "react-native-svg";
import { useMemo, memo, useEffect, useState, useCallback } from "react";
import { Text } from "react-native";
import { useImageViewer } from "../providers/ImageViewerProvider";
import { useTheme } from "../providers/ThemeProvider";
import { getTagColor } from "~/lib/utils/colorUtils";

export interface HTMLContentProps extends Partial<RenderHTMLProps> {
  html: string;
  contentClassName?: string;
  contentStyle?: ViewStyle;
  baseSize?: number;
  systemFonts?: string[];
  customStyles?: Partial<Record<TagName, MixedStyleDeclaration>>;
  onImagePress?: (uri: string) => void;
}

const SVGRenderer: CustomBlockRenderer = ({ tnode }) => {
  const { width, height, viewBox, ...otherAttrs } = tnode.attributes;
  const svgWidth = width ? parseInt(width) : 24;
  const svgHeight = height ? parseInt(height) : 24;
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = (
    viewBox || `0 0 ${svgWidth} ${svgHeight}`
  )
    .split(" ")
    .map(Number);

  const renderSVGElement = (node: any) => {
    const attrs = node.attributes || {};

    switch (node.tagName) {
      case "path":
        return (
          <Path
            key={node.key}
            d={attrs.d}
            fill={attrs.fill}
            stroke={attrs.stroke}
          />
        );
      case "circle":
        return (
          <Circle
            key={node.key}
            cx={attrs.cx}
            cy={attrs.cy}
            r={attrs.r}
            fill={attrs.fill}
            stroke={attrs.stroke}
          />
        );
      case "rect":
        return (
          <Rect
            key={node.key}
            x={attrs.x}
            y={attrs.y}
            width={attrs.width}
            height={attrs.height}
            fill={attrs.fill}
            stroke={attrs.stroke}
          />
        );
      case "line":
        return (
          <Line
            key={node.key}
            x1={attrs.x1}
            y1={attrs.y1}
            x2={attrs.x2}
            y2={attrs.y2}
            stroke={attrs.stroke}
          />
        );
      case "polyline":
        return (
          <Polyline
            key={node.key}
            points={attrs.points}
            fill={attrs.fill}
            stroke={attrs.stroke}
          />
        );
      case "polygon":
        return (
          <Polygon
            key={node.key}
            points={attrs.points}
            fill={attrs.fill}
            stroke={attrs.stroke}
          />
        );
      case "g":
        return (
          <G key={node.key} {...attrs}>
            {node.children?.map((child: any) => renderSVGElement(child))}
          </G>
        );
      case "text":
        return (
          <SVGText key={node.key} {...attrs}>
            {node.children?.[0]?.data}
          </SVGText>
        );
      default:
        return null;
    }
  };

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
      {...otherAttrs}
    >
      {tnode.children?.map((child: any) => renderSVGElement(child))}
    </Svg>
  );
};

const customHTMLElementModels = {
  svg: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "svg",
    renderer: SVGRenderer,
  } as any),
};

const ImageRenderer: CustomBlockRenderer = ({
  tnode,
  onImagePress,
}: CustomRendererProps<TBlock> & {
  onImagePress?: (src: string, alt?: string) => void;
}) => {
  const { src, alt, width: attrWidth, height: attrHeight, class: className } = tnode.attributes;
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = screenWidth - 32;

  const isEmoji = className?.split(' ').includes('emoji');

  const imageSize = useMemo(() => {
    if (!src) return null;

    if (isEmoji) {
      const size = attrWidth ? parseInt(attrWidth) : 20;
      return { width: size, height: size };
    }

    const w = attrWidth ? parseInt(attrWidth) : maxWidth;
    const h = attrHeight ? parseInt(attrHeight) : undefined;

    if (w && h) {
      const ratio = w / h;
      const finalWidth = Math.min(w, maxWidth);
      return { width: finalWidth, height: finalWidth / ratio };
    }

    return { width: maxWidth, height: undefined, aspectRatio: 16 / 9 };
  }, [attrWidth, attrHeight, maxWidth, src, isEmoji]);

  if (!src || !imageSize) return null;

  if (isEmoji) {
    return (
      <ExpoImage
        source={{ uri: src }}
        alt={alt}
        style={[imageSize, { verticalAlign: 'middle' } as any]}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <Pressable 
      onPress={() => onImagePress?.(src, alt)} 
      className="my-2 active:opacity-80"
      style={{ width: maxWidth }} // 强制常规图片占满宽度以实现“换行”
    >
      <ExpoImage
        source={{ uri: src }}
        alt={alt}
        style={imageSize}
        contentFit="contain"
        transition={300}
        className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
        cachePolicy="memory-disk"
      />
    </Pressable>
  );
};

ImageRenderer.displayName = "ImageRenderer";

// 代码块折叠渲染器
const CODE_COLLAPSE_THRESHOLD = 5; // 超过5行时显示折叠按钮
const COLLAPSED_LINE_HEIGHT = 20; // 每行大约高度

const CodeBlockRenderer: CustomBlockRenderer = function CodeBlockRendererFunc({ tnode, TDefaultRenderer, ...props }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const { colors } = useTheme();
  
  // 获取代码内容并计算行数
  const codeContent = useMemo(() => {
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.data || '';
      }
      if (node.children) {
        return node.children.map(extractText).join('');
      }
      return '';
    };
    return extractText(tnode);
  }, [tnode]);
  
  const lineCount = useMemo(() => {
    const matches = codeContent.match(/\n/g);
    return (matches || []).length + 1;
  }, [codeContent]);
  
  const shouldShowToggle = lineCount > CODE_COLLAPSE_THRESHOLD;
  
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // 复制代码到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      // 懒加载 expo-clipboard
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [codeContent]);

  // 计算折叠时的最大高度 (5行 + padding)
  const collapsedHeight = CODE_COLLAPSE_THRESHOLD * COLLAPSED_LINE_HEIGHT + 24;

  return (
    <View style={{ position: 'relative', marginVertical: 8 }}>
      {/* 代码内容区域 */}
      <View 
        style={{ 
          maxHeight: shouldShowToggle && isCollapsed ? collapsedHeight : undefined,
          overflow: 'hidden',
          backgroundColor: colors.muted,
          borderRadius: 6,
          padding: 12,
        }}
      >
        <TDefaultRenderer tnode={tnode} {...props} />
      </View>
      
      {/* 折叠渐变遮罩 */}
      {shouldShowToggle && isCollapsed && (
        <View 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 40,
            backgroundColor: colors.muted,
            opacity: 0.9,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
          }}
        />
      )}
      
      {/* 右上角按钮区域 */}
      <View style={{ position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4 }}>
        {/* 复制按钮 */}
        <Pressable
          onPress={handleCopy}
          style={{
            paddingHorizontal: 6,
            paddingVertical: 4,
            backgroundColor: colors.background,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: copied ? '#22C55E' : colors.mutedForeground }}>
            {copied ? '✓' : '📋'}
          </Text>
        </Pressable>

        {/* 折叠/展开按钮 */}
        {shouldShowToggle && (
          <Pressable
            onPress={toggleCollapse}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: colors.background,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {isCollapsed ? `展开 (${lineCount}行)` : '收起'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

CodeBlockRenderer.displayName = "CodeBlockRenderer";


export const useHTMLStyles = (
  baseSize = 16,
  customStyles: Partial<Record<TagName, MixedStyleDeclaration>> = {}
) => {
  const { colors } = useTheme();

  const defaultStyles: Partial<Record<TagName, MixedStyleDeclaration>> = {
    body: {
      color: colors.foreground,
      fontSize: baseSize,
      lineHeight: baseSize * 1.35,
    },
    p: {
      marginVertical: baseSize * 0.25,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    img: {
      marginHorizontal: 2,
    },
    a: {
      color: "#2563eb", // 明亮的蓝色链接
      textDecorationLine: "underline",
    },
    strong: {
      fontWeight: "bold",
    },
    em: {
      fontStyle: "italic",
    },
    pre: {
      // 样式由 CodeBlockRenderer 处理
      marginVertical: 0,
      padding: 0,
    },
    code: {
      fontFamily: "monospace",
      fontSize: baseSize * 0.875,
      backgroundColor: colors.muted,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    blockquote: {
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      paddingLeft: baseSize * 0.75,
      marginVertical: baseSize * 0.5,
      fontStyle: "italic",
    },
    ul: {
      marginVertical: baseSize * 0.5,
      paddingLeft: baseSize,
    },
    ol: {
      marginVertical: baseSize * 0.5,
      paddingLeft: baseSize,
    },
    li: {
      marginVertical: baseSize * 0.25,
    },
    h1: {
      fontSize: baseSize * 1.5,
      fontWeight: "bold",
      marginVertical: baseSize * 0.3,
      color: colors.foreground,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    h2: {
      fontSize: baseSize * 1.25,
      fontWeight: "bold",
      marginVertical: baseSize * 0.25,
      color: colors.foreground,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    h3: {
      fontSize: baseSize * 1.1,
      fontWeight: "bold",
      marginVertical: baseSize * 0.2,
      color: colors.foreground,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    h4: {
      fontSize: baseSize,
      fontWeight: "bold",
      marginVertical: baseSize * 0.15,
      color: colors.foreground,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: baseSize * 0.5,
    },
    th: {
      backgroundColor: colors.muted,
      padding: baseSize * 0.5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    td: {
      padding: baseSize * 0.5,
      borderWidth: 1,
      borderColor: colors.border,
    },
  };

  const classesStyles: Partial<Record<string, MixedStyleDeclaration>> = {
    emoji: {
      width: 20,
      height: 20,
    },
    // Discourse hashtag 样式 - 与 TopicCard 标签保持一致
    "hashtag-cooked": {
      paddingHorizontal: 8, // px-2
      paddingVertical: 2, // py-0.5
      borderRadius: 9999, // rounded-full
      fontSize: baseSize * 0.7, // text-[10px]
      fontWeight: "700", // font-bold
      textDecorationLine: "none",
      marginHorizontal: 2, // mr-1
      borderWidth: 1, // border
    },
  };

  return {
    tagsStyles: {
      ...defaultStyles,
      ...customStyles,
    },
    classesStyles,
    renderConfig: {
      enableExperimentalMarginCollapsing: true,
      enableExperimentalGhostLinesPrevention: true,
      enableExperimentalBRCollapsing: true,
    },
  };
};
// TODO: improve
export const HTMLContent = memo(
  ({
    html,
    contentClassName = "",
    contentStyle = {},
    baseSize = 16,
    systemFonts = [],
    customStyles = {},
    ...props
  }: HTMLContentProps) => {
    const { width } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();
    const { tagsStyles, classesStyles, renderConfig } = useHTMLStyles(baseSize, customStyles);
    const { showImage } = useImageViewer();

    const cleanHtml = useMemo(() => {
      // 将 :emoji_name: 短代码转换为 Discourse emoji 图片
      let processedHtml = convertEmojiShortcodes(html);

      // ========== 第一步：提取并保护 <pre> 代码块 ==========
      // 保留代码块内的换行符和原始内容，只清理其他地方的空白
      const preBlocks: string[] = [];
      processedHtml = processedHtml.replace(/<pre[\s\S]*?<\/pre>/gi, (match) => {
        preBlocks.push(match);
        return `__PRE_BLOCK_${preBlocks.length - 1}__`;
      });

      // ========== 第二步：处理 hashtag、lightbox meta 等（pre 已被保护） ==========
      
      // 处理 hashtag 链接：移除内部的 SVG 占位符，只保留标签文本，并注入动态颜色样式
      processedHtml = processedHtml.replace(
        /<a\s+class="hashtag-cooked"[^>]*href="([^"]*)"[^>]*>.*?<span>([^<]*)<\/span><\/a>/gi,
        (_, href, tagName) => {
          const colors = getTagColor(tagName, isDark);
          return `<a class="hashtag-cooked" href="${href}" style="background-color: ${colors.bg}; color: ${colors.text}; border-color: ${colors.border};">#${tagName}</a>`;
        }
      );

      // 移除 Discourse lightbox 图片的 meta 信息（包含 SVG 图标、文件名、尺寸等）
      processedHtml = processedHtml.replace(/<span\s+class="informations"[^>]*>[^<]*<\/span>/gi, '');
      processedHtml = processedHtml.replace(/<span\s+class="filename"[^>]*>[^<]*<\/span>/gi, '');
      processedHtml = processedHtml.replace(/<svg\s+class="[^"]*d-icon[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, '');
      processedHtml = processedHtml.replace(/<div\s+class="meta"[^>]*>\s*<\/div>/gi, '');

      // ========== 第三步：清理非 pre 区域的换行和空白 ==========
      processedHtml = processedHtml
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim();
      
      // ========== 第四步：还原 pre 块 ==========
      preBlocks.forEach((block, index) => {
        processedHtml = processedHtml.replace(`__PRE_BLOCK_${index}__`, block);
      });
      
      return processedHtml;
    }, [html, isDark]);

    // pre fetch images
    useEffect(() => {
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      const matches = [...cleanHtml.matchAll(imgRegex)];
      const imageUrls = matches.map((match) => match[1]);

      if (imageUrls.length > 0) {
        ExpoImage.prefetch(imageUrls);
      }
    }, [cleanHtml]);

    const renderers = useMemo(
      () => ({
        img: (props: any) =>
          ImageRenderer({
            ...props,
            onImagePress: (src: string, alt?: string) => showImage(src, alt),
          }),
        svg: SVGRenderer,
        pre: CodeBlockRenderer,
      }),
      [showImage]
    );

    return (
      <View
        className={cn("web:select-text", contentClassName)}
        style={contentStyle}
      >
        <RenderHtml
          contentWidth={width - 32}
          source={{ html: cleanHtml }}
          tagsStyles={tagsStyles}
          classesStyles={classesStyles as any}
          systemFonts={systemFonts}
          customHTMLElementModels={customHTMLElementModels}
          renderers={renderers}
          defaultTextProps={{
            selectable: true,
          }}
          renderersProps={{
            a: {
              onPress: (_, href) => {
                if (typeof href === "string") {
                  // 处理内部话题链接: https://linux.do/t/topic/123 -> /topic/123
                  // 这里的正则支持 /t/topic/123, /t/123 以及带 .json 的情况
                  const topicMatch = href.match(/https?:\/\/linux\.do\/t\/(?:topic\/)?(\d+)(?:\.json)?/i) 
                    || href.match(/^\/t\/(?:topic\/)?(\d+)(?:\.json)?/i);

                  // 处理标签链接: /tag/XXX
                  const tagMatch = href.match(/^\/tag\/([^/]+)/i);

                  if (topicMatch && topicMatch[1]) {
                    router.push(`/topic/${topicMatch[1]}`);
                  } else if (tagMatch && tagMatch[1]) {
                    // TODO: 导航到标签页面，目前暂时使用外部链接
                    Linking.openURL(`https://linux.do${href}`);
                  } else {
                    Linking.openURL(href);
                  }
                }
              },
            },
          }}
          {...renderConfig}
          {...props}
        />
      </View>
    );
  }
);

HTMLContent.displayName = "HTMLContent";
