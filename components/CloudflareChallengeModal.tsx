import { AlertCircle, RefreshCw, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { USER_AGENT } from "~/lib/utils/userAgent";
import { useCloudflareStore } from "~/store/cloudflareStore";

const LINUX_DO_BASE_URL = "https://linux.do";

export function CloudflareChallengeModal() {
	const { isChallengePending, challengeUrl, hideChallenge, completeChallenge } = useCloudflareStore();
	const webViewRef = useRef<WebView>(null);
	const [error, setError] = useState<string | null>(null);
	const [key, setKey] = useState(0);
	const hasCompletedRef = useRef(false);

	// 监听弹窗状态变化
	useEffect(() => {
		console.log("=== CloudflareChallengeModal state changed ===");
		console.log("isChallengePending:", isChallengePending);
		if (isChallengePending) {
			hasCompletedRef.current = false; // 重置
		}
	}, [isChallengePending]);

	const handleChallengeComplete = useCallback(() => {
		if (hasCompletedRef.current) return;
		hasCompletedRef.current = true;

		console.log("=== Challenge appears complete ===");
		console.log("WebView should have saved cf_clearance cookie to system cookie store");
		console.log("Note: The system cookie store is separate from axios tough-cookie");
		console.log("User may need to manually refresh or the app needs to use native fetch");

		// TODO: 目前 axios + tough-cookie 和系统 WebView cookie store 是隔离的
		// 理想解决方案需要：
		// 1. 使用 expo-dev-client + @react-native-cookies/cookies 读取系统 cookies
		// 2. 或者让 axios 不使用 tough-cookie，改用系统原生 cookie
		// 3. 或者使用原生模块读取 cookie

		completeChallenge();
	}, [completeChallenge]);

	const handleNavigationStateChange = useCallback(
		(navState: WebViewNavigation) => {
			console.log("=== Navigation state changed ===");
			console.log("url:", navState.url);
			console.log("title:", navState.title);
			console.log("loading:", navState.loading);

			if (navState.loading) {
				setError(null);
				return;
			}

			// 当导航成功并且不再是挑战页面时，认为验证完成
			if (navState.url) {
				const isLinuxDo = navState.url.includes("linux.do");
				const isCdnCgi = navState.url.includes("cdn-cgi") || navState.url.includes("challenge-platform");
				const isJustAMoment = navState.title?.toLowerCase().includes("just a moment");

				console.log("isLinuxDo:", isLinuxDo, "isCdnCgi:", isCdnCgi, "isJustAMoment:", isJustAMoment);

				// 如果成功加载了 linux.do 且不是 CF 验证页面
				if (isLinuxDo && !isCdnCgi && !isJustAMoment) {
					// 等待一小段时间确保 cookies 已保存
					setTimeout(() => {
						handleChallengeComplete();
					}, 1000);
				}
			}
		},
		[handleChallengeComplete],
	);

	const handleError = useCallback((syntheticEvent: { nativeEvent: { description: string } }) => {
		const { description } = syntheticEvent.nativeEvent;
		console.error("WebView error:", description);
		setError(description || "页面加载失败");
	}, []);

	const handleRenderProcessGone = useCallback(() => {
		console.error("WebView render process gone - recovering");
		setError("页面渲染进程意外终止");
		setKey((prev) => prev + 1);
	}, []);

	const handleRetry = useCallback(() => {
		setError(null);
		setKey((prev) => prev + 1);
	}, []);

	const handleClose = useCallback(() => {
		console.log("=== Manual close ===");
		hideChallenge();
	}, [hideChallenge]);

	if (!isChallengePending) {
		return null;
	}

	const sourceUrl = challengeUrl || LINUX_DO_BASE_URL;
	console.log("=== Rendering CloudflareChallengeModal ===");
	console.log("sourceUrl:", sourceUrl);

	return (
		<Modal
			visible={isChallengePending}
			animationType="slide"
			presentationStyle="fullScreen"
			onRequestClose={handleClose}
			statusBarTranslucent={true}
		>
			<View style={{ flex: 1, backgroundColor: "#fff" }}>
				{/* 顶部栏 */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						paddingHorizontal: 16,
						paddingVertical: 12,
						borderBottomWidth: 1,
						borderBottomColor: "#e5e5e5",
						backgroundColor: "#f5f5f5",
						paddingTop: 48,
					}}
				>
					<Text style={{ fontSize: 18, fontWeight: "600", color: "#000" }}>安全验证</Text>
					<Pressable onPress={handleClose} style={{ padding: 8 }}>
						<X size={24} color="#333" />
					</Pressable>
				</View>

				{/* 提示信息 */}
				<View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fef3c7" }}>
					<Text style={{ fontSize: 14, color: "#92400e" }}>请完成安全验证后继续使用。验证完成后页面会自动关闭，或点击右上角手动关闭。</Text>
				</View>

				{/* WebView 或错误状态 */}
				{error ? (
					<View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
						<AlertCircle size={48} color="#9ca3af" />
						<Text style={{ fontSize: 18, color: "#6b7280", marginTop: 16, marginBottom: 8, textAlign: "center" }}>加载失败</Text>
						<Text style={{ fontSize: 14, color: "#9ca3af", marginBottom: 24, textAlign: "center" }}>{error}</Text>
						<Pressable
							onPress={handleRetry}
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: "#3b82f6",
								paddingHorizontal: 24,
								paddingVertical: 12,
								borderRadius: 8,
							}}
						>
							<RefreshCw size={18} color="#fff" />
							<Text style={{ color: "#fff", fontWeight: "500", marginLeft: 8 }}>重试</Text>
						</Pressable>
					</View>
				) : (
					<WebView
						key={key}
						ref={webViewRef}
						source={{ uri: sourceUrl }}
						style={{ flex: 1 }}
						javaScriptEnabled={true}
						domStorageEnabled={true}
						thirdPartyCookiesEnabled={true}
						sharedCookiesEnabled={true}
						onNavigationStateChange={handleNavigationStateChange}
						onError={handleError}
						onRenderProcessGone={handleRenderProcessGone}
						onContentProcessDidTerminate={handleRenderProcessGone}
						onLoadStart={() => console.log("WebView load started")}
						onLoadEnd={() => console.log("WebView load ended")}
						userAgent={USER_AGENT}
					/>
				)}
			</View>
		</Modal>
	);
}
