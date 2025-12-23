import { X } from "lucide-react-native";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
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

			if (!navState.loading && navState.url?.includes("linux.do")) {
				// 页面加载完成，标记 WebView 就绪
				setReady(true);
			}
		},
		[setReady],
	);

	const handleLoadEnd = useCallback(() => {
		console.log("[WebViewAPI] WebView load ended");
		setReady(true);
	}, [setReady]);

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

			{/* 隐藏的 WebView（用于 API 请求）或全屏显示（CF 验证时） */}
			{isVisible ? (
				// CF 验证时全屏显示
				<Modal visible={true} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent={true}>
					<View style={styles.modalContainer}>
						{/* 顶部栏 */}
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

						{/* WebView */}
						<WebView
							ref={webViewRef}
							source={{ uri: LINUX_DO_BASE_URL }}
							style={styles.webView}
							javaScriptEnabled={true}
							domStorageEnabled={true}
							thirdPartyCookiesEnabled={true}
							sharedCookiesEnabled={true}
							injectedJavaScript={INJECTED_JS}
							onMessage={handleMessage}
							onNavigationStateChange={handleNavigationStateChange}
							onLoadEnd={handleLoadEnd}
							onError={handleError}
							userAgent={
								Platform.OS === "android"
									? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
									: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
							}
						/>
					</View>
				</Modal>
			) : (
				// 隐藏状态：渲染一个不可见的 WebView
				<View style={styles.hiddenContainer}>
					<WebView
						ref={webViewRef}
						source={{ uri: LINUX_DO_BASE_URL }}
						style={styles.hiddenWebView}
						javaScriptEnabled={true}
						domStorageEnabled={true}
						thirdPartyCookiesEnabled={true}
						sharedCookiesEnabled={true}
						injectedJavaScript={INJECTED_JS}
						onMessage={handleMessage}
						onNavigationStateChange={handleNavigationStateChange}
						onLoadEnd={handleLoadEnd}
						onError={handleError}
						userAgent={
							Platform.OS === "android"
								? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
								: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
						}
					/>
				</View>
			)}
		</>
	);
}

const styles = StyleSheet.create({
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
