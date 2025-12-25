import { X } from "lucide-react-native";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { USER_AGENT } from "~/lib/utils/userAgent";
import { useWebViewAPIStore } from "~/store/webViewAPIStore";

const LINUX_DO_BASE_URL = "https://linux.do";

// 注入到 WebView 的 JavaScript，用于检测页面加载完成
const INJECTED_JS = `
	(function() {
		// 通知 React Native 页面加载完成
		function notifyPageLoaded() {
			const isChallengePage = 
				document.title.toLowerCase().includes("just a moment") ||
				window.location.href.includes("cdn-cgi") ||
				window.location.href.includes("challenge-platform");
			
			window.ReactNativeWebView.postMessage(JSON.stringify({
				type: "page_loaded",
				url: window.location.href,
				title: document.title,
				isChallengePage: isChallengePage
			}));
		}
		
		// 页面加载完成时通知
		if (document.readyState === "complete") {
			notifyPageLoaded();
		} else {
			window.addEventListener("load", notifyPageLoaded);
		}
		
		// 监听 URL 变化
		let lastUrl = window.location.href;
		setInterval(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				notifyPageLoaded();
			}
		}, 500);
	})();
	true;
`;

export function WebViewAPIProvider({ children }: { children: React.ReactNode }) {
	const webViewRef = useRef<WebView>(null);
	const { isVisible, setWebViewRef, setReady, hideWebView, handleWebViewMessage } = useWebViewAPIStore();

	// 设置 WebView 引用
	useEffect(() => {
		setWebViewRef(webViewRef as React.RefObject<unknown>);
	}, [setWebViewRef]);

	const handleMessage = useCallback(
		(event: { nativeEvent: { data: string } }) => {
			handleWebViewMessage(event.nativeEvent.data);
		},
		[handleWebViewMessage],
	);

	const handleNavigationStateChange = useCallback(
		(navState: WebViewNavigation) => {
			console.log("[WebViewAPI] Navigation:", navState.url, "loading:", navState.loading);

			if (navState.loading) {
				// 页面开始加载，标记 WebView 不就绪
				setReady(false);
			}
		},
		[setReady],
	);

	const handleLoadStart = useCallback(() => {
		console.log("[WebViewAPI] WebView load started");
		setReady(false);
	}, [setReady]);

	const handleLoadEnd = useCallback(() => {
		// 仅作为日志，就绪状态交由 handleMessage 处理
		console.log("[WebViewAPI] WebView load ended");
	}, []);

	const handleError = useCallback((syntheticEvent: { nativeEvent: { description: string } }) => {
		console.error("[WebViewAPI] WebView error:", syntheticEvent.nativeEvent.description);
	}, []);

	const handleClose = useCallback(() => {
		console.log("[WebViewAPI] Manual close");
		hideWebView();
	}, [hideWebView]);

	return (
		<>
			{children}

			{/* 唯一常驻的 WebView 容器 */}
			<View
				style={[
					isVisible ? styles.fullScreenContainer : styles.hiddenContainer,
					{ zIndex: isVisible ? 9999 : -1 },
				]}
				pointerEvents={isVisible ? "auto" : "none"}
			>
				{isVisible && (
					<>
						{/* 顶部栏 - 仅在可见时显示 */}
						<View style={styles.header}>
							<Text style={styles.headerTitle}>安全验证</Text>
							<Pressable onPress={handleClose} style={styles.closeButton}>
								<X size={24} color="#333" />
							</Pressable>
						</View>

						{/* 提示信息 */}
						<View style={styles.notice}>
							<Text style={styles.noticeText}>请完成安全验证后继续使用。验证完成后会自动继续。</Text>
						</View>
					</>
				)}

				<WebView
					ref={webViewRef}
					source={{ uri: LINUX_DO_BASE_URL }}
					style={isVisible ? styles.webView : styles.hiddenWebView}
					javaScriptEnabled={true}
					domStorageEnabled={true}
					thirdPartyCookiesEnabled={true}
					sharedCookiesEnabled={true}
					injectedJavaScript={INJECTED_JS}
					onMessage={handleMessage}
					onNavigationStateChange={handleNavigationStateChange}
					onLoadStart={handleLoadStart}
					onLoadEnd={handleLoadEnd}
					onError={handleError}
					userAgent={USER_AGENT}
				/>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	fullScreenContainer: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "#fff",
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e5e5",
		backgroundColor: "#f5f5f5",
		paddingTop: 48,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#000",
	},
	closeButton: {
		padding: 8,
	},
	notice: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "#fef3c7",
	},
	noticeText: {
		fontSize: 14,
		color: "#92400e",
	},
	webView: {
		flex: 1,
	},
	hiddenContainer: {
		position: "absolute",
		width: 1,
		height: 1,
		opacity: 0,
		overflow: "hidden",
	},
	hiddenWebView: {
		width: 1,
		height: 1,
	},
});
