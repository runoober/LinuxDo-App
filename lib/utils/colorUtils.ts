/**
 * 根据字符串生成哈希值
 */
const getHash = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return hash;
};

/**
 * 将十六进制颜色转换为亮度值 (0-255)
 */
export const getBrightness = (hexColor: string) => {
	const hex = hexColor.replace("#", "");
	const r = Number.parseInt(hex.substr(0, 2), 16);
	const g = Number.parseInt(hex.substr(2, 2), 16);
	const b = Number.parseInt(hex.substr(4, 2), 16);
	// 使用标准的亮度计算公式
	return (r * 299 + g * 587 + b * 114) / 1000;
};

/**
 * 根据背景色决定最佳的前景色（黑或白）
 */
export const getContrastColor = (hexColor: string) => {
	return getBrightness(hexColor) > 128 ? "#000000" : "#FFFFFF";
};

/**
 * 根据标签名生成一个确定的、视觉和谐的“小清新”风格 HSL 颜色
 * @param tagName 标签名
 * @param isDark 是否为深色模式
 */
export const getTagColor = (tagName: string, isDark = false) => {
	const hash = getHash(tagName);

	// 基础色相随机化 (0-360)
	const h = Math.abs(hash % 360);

	if (isDark) {
		// 深色模式：极低饱和度背景，高明度柔和文字
		return {
			bg: `hsla(${h}, 30%, 18%, 0.6)`,
			text: `hsla(${h}, 70%, 85%, 1)`,
			border: `hsla(${h}, 30%, 25%, 0.5)`,
		};
	} else {
		// 浅色模式（小清新）：非常淡的背景颜色，搭配同色系深色文字
		return {
			bg: `hsla(${h}, 45%, 96%, 1)`,
			text: `hsla(${h}, 50%, 45%, 1)`,
			border: `hsla(${h}, 45%, 90%, 1)`,
		};
	}
};

/**
 * 将高饱和度的 Hex 颜色“柔化”为小清新风格
 * 原理：保持色相，极度压缩饱和度，并强制高明度（浅色）或低明度（深色）
 */
export const dampenColor = (hex: string, isDark = false) => {
	const cleanHex = hex.replace("#", "");
	const r = Number.parseInt(cleanHex.substr(0, 2), 16) / 255;
	const g = Number.parseInt(cleanHex.substr(2, 2), 16) / 255;
	const b = Number.parseInt(cleanHex.substr(4, 2), 16) / 255;

	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s,
		l = (max + min) / 2;

	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	// 转换为角度
	const hDeg = h * 360;

	if (isDark) {
		return {
			bg: `hsla(${hDeg}, 30%, 22%, 0.8)`,
			text: `hsla(${hDeg}, 60%, 80%, 1)`,
			border: `hsla(${hDeg}, 30%, 28%, 0.6)`,
		};
	} else {
		return {
			bg: `hsla(${hDeg}, 40%, 92%, 1)`,
			text: `hsla(${hDeg}, 50%, 40%, 1)`,
			border: `hsla(${hDeg}, 40%, 85%, 1)`,
		};
	}
};
