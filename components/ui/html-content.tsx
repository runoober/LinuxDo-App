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
import { useMemo, memo, useEffect } from "react";
import { useImageViewer } from "../providers/ImageViewerProvider";
import { useTheme } from "../providers/ThemeProvider";

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
      backgroundColor: colors.muted,
      padding: baseSize * 0.75,
      borderRadius: 6,
      marginVertical: baseSize * 0.5,
      overflow: "visible",
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
    const router = useRouter();
    const { tagsStyles, classesStyles, renderConfig } = useHTMLStyles(baseSize, customStyles);
    const { showImage } = useImageViewer();

    const cleanHtml = useMemo(() => {
      // 将 :emoji_name: 短代码转换为 Discourse emoji 图片
      const processedHtml = convertEmojiShortcodes(html);

      return processedHtml
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim();
    }, [html]);

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

                  if (topicMatch && topicMatch[1]) {
                    router.push(`/topic/${topicMatch[1]}`);
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
