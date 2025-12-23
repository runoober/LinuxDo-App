/**
 * WebView API 客户端
 * 通过 WebView 执行 API 请求，与 Cloudflare cookies 共享
 */

import { type WebViewResponse, useWebViewAPIStore } from "~/store/webViewAPIStore";

const BASE_URL = "https://linux.do";

export interface WebViewAPIOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string | object;
}

/**
 * 通过 WebView 执行 API 请求
 */
export async function webViewFetch(path: string, options: WebViewAPIOptions = {}): Promise<WebViewResponse> {
	const { executeRequest } = useWebViewAPIStore.getState();

	const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

	const fetchOptions: RequestInit = {
		method: options.method || "GET",
		headers: {
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
			...options.headers,
		},
		credentials: "include",
	};

	if (options.body) {
		if (typeof options.body === "object") {
			fetchOptions.body = JSON.stringify(options.body);
			fetchOptions.headers = {
				...fetchOptions.headers,
				"Content-Type": "application/json",
			};
		} else {
			fetchOptions.body = options.body;
		}
	}

	return executeRequest(url, fetchOptions);
}

/**
 * GET 请求
 */
export async function webViewGet(path: string, headers?: Record<string, string>): Promise<WebViewResponse> {
	return webViewFetch(path, { method: "GET", headers });
}

/**
 * POST 请求
 */
export async function webViewPost(path: string, body?: string | object, headers?: Record<string, string>): Promise<WebViewResponse> {
	return webViewFetch(path, { method: "POST", body, headers });
}

/**
 * 检查 WebView API 是否就绪
 */
export function isWebViewAPIReady(): boolean {
	return useWebViewAPIStore.getState().isReady;
}

/**
 * 等待 WebView API 就绪
 */
export function waitForWebViewAPI(timeout = 10000): Promise<void> {
	return new Promise((resolve, reject) => {
		const { isReady } = useWebViewAPIStore.getState();
		if (isReady) {
			resolve();
			return;
		}

		const startTime = Date.now();
		const checkReady = () => {
			if (useWebViewAPIStore.getState().isReady) {
				resolve();
				return;
			}
			if (Date.now() - startTime > timeout) {
				reject(new Error("WebView API timeout"));
				return;
			}
			setTimeout(checkReady, 100);
		};
		checkReady();
	});
}
