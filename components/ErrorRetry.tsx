import { AlertCircle, RefreshCw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";

type ErrorRetryProps = {
	onRetry: () => void;
	message?: string;
	retryText?: string;
};

export const ErrorRetry = ({ onRetry, message, retryText }: ErrorRetryProps) => {
	const { t } = useTranslation();

	return (
		<View className="flex-1 items-center justify-center p-6">
			<AlertCircle size={48} className="text-muted-foreground mb-4" />
			<Text className="text-lg text-muted-foreground mb-2 text-center">{message || t("common.loadFailed", "加载失败")}</Text>
			<Text className="text-sm text-muted-foreground/60 mb-6 text-center">{t("common.checkNetworkAndRetry", "请检查网络连接后重试")}</Text>
			<Pressable onPress={onRetry} className="flex-row items-center bg-primary px-6 py-3 rounded-lg active:opacity-80">
				<RefreshCw size={18} className="mr-2 text-primary-foreground" />
				<Text className="text-primary-foreground font-medium">{retryText || t("common.retry", "重试")}</Text>
			</Pressable>
		</View>
	);
};
