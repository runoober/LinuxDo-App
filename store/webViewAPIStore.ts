import { create } from "zustand";

export interface WebViewRequest {
	id: string;
	url: string;
	options?: RequestInit;
	resolve: (response: WebViewResponse) => void;
	reject: (error: Error) => void;
}

export interface WebViewResponse {
	ok: boolean;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	data: unknown;
	isCloudflareChallenge?: boolean;
}

interface WebViewAPIState {
	// WebView 是否可见（CF 验证时显示）
	isVisible: boolean;
	// 当前正在处理的请求
	currentRequest: WebViewRequest | null;
	// 待处理的请求队列
	requestQueue: WebViewRequest[];
	// WebView 是否已就绪
	isReady: boolean;
	// WebView 引用（由 Provider 设置）
	webViewRef: React.RefObject<unknown> | null;

	// 方法
	setWebViewRef: (ref: React.RefObject<unknown>) => void;
	setReady: (ready: boolean) => void;
	showWebView: () => void;
	hideWebView: () => void;

	// 执行请求
	executeRequest: (url: string, options?: RequestInit) => Promise<WebViewResponse>;

	// 发送请求到 WebView（内部方法）
	sendRequestToWebView: (request: WebViewRequest) => void;

	// 处理 WebView 返回的消息
	handleWebViewMessage: (data: string) => void;

	// 处理下一个请求
	processNextRequest: () => void;
}

let requestIdCounter = 0;

export const useWebViewAPIStore = create<WebViewAPIState>()((set, get) => ({
	isVisible: false,
	currentRequest: null,
	requestQueue: [],
	isReady: false,
	webViewRef: null,

	setWebViewRef: (ref) => {
		set({ webViewRef: ref });
	},

	setReady: (ready) => {
		console.log("[WebViewAPI] setReady:", ready);
		set({ isReady: ready });
		if (ready) {
			// 添加延迟确保 WebView 完全就绪后再处理请求
			// 解决首次打开应用时第一个请求失败的问题
			setTimeout(() => {
				get().processNextRequest();
			}, 500);
		}
	},

	showWebView: () => {
		console.log("[WebViewAPI] showWebView");
		set({ isVisible: true });
	},

	hideWebView: () => {
		console.log("[WebViewAPI] hideWebView");
		set({ isVisible: false });
	},

	executeRequest: (url, options) => {
		return new Promise((resolve, reject) => {
			const id = `req_${++requestIdCounter}_${Date.now()}`;
			const request: WebViewRequest = { id, url, options, resolve, reject };

			console.log(`[WebViewAPI] Queueing request ${id}: ${url}`);

			const { currentRequest, isReady } = get();

			if (!currentRequest && isReady) {
				// 没有正在处理的请求且 WebView 已就绪，直接处理
				set({ currentRequest: request });
				get().sendRequestToWebView(request);
			} else {
				// 加入队列
				set((state) => ({
					requestQueue: [...state.requestQueue, request],
				}));
			}
		});
	},

	// 内部方法：发送请求到 WebView
	sendRequestToWebView: (request: WebViewRequest) => {
		const { webViewRef } = get();
		if (!webViewRef?.current) {
			console.error("[WebViewAPI] WebView ref not available");
			request.reject(new Error("WebView not available"));
			get().processNextRequest();
			return;
		}

		console.log(`[WebViewAPI] Sending request ${request.id} to WebView`);

		const jsCode = `
			(async function() {
				try {
					const response = await fetch("${request.url}", ${JSON.stringify(request.options || {})});
					const contentType = response.headers.get("content-type") || "";
					let data;
					
					if (contentType.includes("application/json")) {
						data = await response.json();
					} else {
						data = await response.text();
					}
					
					// 检测是否为 Cloudflare 挑战
					const isCloudflareChallenge = 
						!response.ok && 
						typeof data === "string" && 
						(data.includes("Just a moment...") || 
						 data.includes("_cf_chl_opt") || 
						 data.includes("challenge-platform"));
					
					// 构造响应头对象
					const headers = {};
					response.headers.forEach((value, key) => {
						headers[key] = value;
					});
					
					window.ReactNativeWebView.postMessage(JSON.stringify({
						type: "api_response",
						requestId: "${request.id}",
						response: {
							ok: response.ok,
							status: response.status,
							statusText: response.statusText,
							headers: headers,
							data: data,
							isCloudflareChallenge: isCloudflareChallenge
						}
					}));
				} catch (error) {
					window.ReactNativeWebView.postMessage(JSON.stringify({
						type: "api_error",
						requestId: "${request.id}",
						error: error.message || "Unknown error"
					}));
				}
			})();
			true;
		`;

		// @ts-ignore - webViewRef.current 是 WebView 实例
		webViewRef.current?.injectJavaScript(jsCode);
	},

	handleWebViewMessage: (dataStr) => {
		try {
			const data = JSON.parse(dataStr);
			const { currentRequest } = get();

			if (data.type === "api_response" && currentRequest && data.requestId === currentRequest.id) {
				console.log(`[WebViewAPI] Received response for ${data.requestId}`);

				const response = data.response as WebViewResponse;

				// 如果检测到 CF 挑战，显示 WebView
				if (response.isCloudflareChallenge) {
					console.log("[WebViewAPI] Cloudflare challenge detected, showing WebView");
					get().showWebView();
					// 不resolve，等待用户完成验证后重试
					return;
				}

				currentRequest.resolve(response);
				set({ currentRequest: null });
				get().processNextRequest();
			} else if (data.type === "api_error" && currentRequest && data.requestId === currentRequest.id) {
				console.error(`[WebViewAPI] Request ${data.requestId} failed:`, data.error);
				currentRequest.reject(new Error(data.error));
				set({ currentRequest: null });
				get().processNextRequest();
			} else if (data.type === "page_loaded") {
				// WebView 加载完成（用于 CF 验证后的检测）
				console.log("[WebViewAPI] Page loaded in WebView");
				const { isVisible, currentRequest } = get();

				// 如果不是挑战页面，标记就绪
				if (!data.isChallengePage) {
					get().setReady(true);
				}

				// 如果正在显示 WebView（CF 验证中），检查是否验证完成
				if (isVisible && !data.isChallengePage) {
					console.log("[WebViewAPI] CF challenge appears complete");
					get().hideWebView();

					// 重试当前请求
					if (currentRequest) {
						console.log(`[WebViewAPI] Retrying request ${currentRequest.id}`);
						get().sendRequestToWebView(currentRequest);
					}
				}
			}
		} catch (e) {
			console.error("[WebViewAPI] Error parsing message:", e);
		}
	},

	processNextRequest: () => {
		const { requestQueue, currentRequest, isReady } = get();

		if (currentRequest || !isReady || requestQueue.length === 0) {
			return;
		}

		const [nextRequest, ...rest] = requestQueue;
		console.log(`[WebViewAPI] Processing next request: ${nextRequest.id}`);

		set({ currentRequest: nextRequest, requestQueue: rest });
		get().sendRequestToWebView(nextRequest);
	},
}));
