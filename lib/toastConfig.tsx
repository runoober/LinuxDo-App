import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import type { ToastConfigParams } from "react-native-toast-message";

// 自定义 Status Tooltip Toast 组件
const StatusTooltipToast = ({ text1, props }: ToastConfigParams<{ x?: number }>) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { width: screenWidth } = useWindowDimensions();

	// 计算位置
	const x = props?.x ?? screenWidth / 2;

	return (
		<View
			style={{
				alignItems: "center",
				width: "100%",
			}}
		>
			<Text
				style={{
					fontSize: 14,
					fontWeight: "600",
					color: isDark ? "#a78bfa" : "#7c3aed", // 紫色文字
					textShadowColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
					textShadowOffset: { width: 0, height: 1 },
					textShadowRadius: 2,
				}}
			>
				{text1}
			</Text>
		</View>
	);
};

// Toast 配置
export const toastConfig = {
	statusTooltip: (props: ToastConfigParams<{ x?: number }>) => <StatusTooltipToast {...props} />,
};
