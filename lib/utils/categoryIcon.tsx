import * as Icons from "lucide-react-native";

// Discourse API 返回的图标名称到 Lucide 图标的映射
// Font Awesome 样式名称 -> Lucide 组件名
const FA_TO_LUCIDE_MAP: Record<string, keyof typeof Icons> = {
	// 常见分类图标映射
	seedling: "Sprout",
	comments: "MessageCircle",
	"comment-dots": "MessageCircle",
	question: "HelpCircle",
	"question-circle": "HelpCircle",
	info: "Info",
	"info-circle": "Info",
	bullhorn: "Megaphone",
	"code-branch": "GitBranch",
	code: "Code",
	cog: "Settings",
	cogs: "Settings",
	wrench: "Wrench",
	tools: "Wrench",
	star: "Star",
	"square-share-nodes": "Share2",
	heart: "Heart",
	fire: "Flame",
	book: "Book",
	"book-open": "BookOpen",
	"book-open-reader": "BookUser",
	lightbulb: "Lightbulb",
	"graduation-cap": "GraduationCap",
	users: "Users",
	user: "User",
	"user-group": "Users",
	briefcase: "Briefcase",
	rocket: "Rocket",
	gamepad: "Gamepad2",
	"gamepad-2": "Gamepad2",
	music: "Music",
	film: "Film",
	camera: "Camera",
	image: "Image",
	link: "Link",
	globe: "Globe",
	"globe-asia": "Globe",
	map: "Map",
	"map-marker": "MapPin",
	"map-pin": "MapPin",
	home: "Home",
	building: "Building",
	laptop: "Laptop",
	desktop: "Monitor",
	mobile: "Smartphone",
	phone: "Phone",
	envelope: "Mail",
	"paper-plane": "Send",
	bell: "Bell",
	calendar: "Calendar",
	clock: "Clock",
	shield: "Shield",
	lock: "Lock",
	key: "Key",
	dollar: "DollarSign",
	"dollar-sign": "DollarSign",
	shopping: "ShoppingCart",
	"shopping-cart": "ShoppingCart",
	tag: "Tag",
	tags: "Tags",
	bookmark: "Bookmark",
	flag: "Flag",
	trophy: "Trophy",
	medal: "Medal",
	gift: "Gift",
	palette: "Palette",
	brush: "Brush",
	pen: "Pen",
	pencil: "Pencil",
	edit: "Edit",
	"file-alt": "FileText",
	file: "File",
	folder: "Folder",
	archive: "Archive",
	trash: "Trash",
	search: "Search",
	filter: "Filter",
	sort: "ArrowUpDown",
	list: "List",
	grid: "Grid3x3",
	eye: "Eye",
	"eye-slash": "EyeOff",
	check: "Check",
	"check-circle": "CheckCircle",
	times: "X",
	"times-circle": "XCircle",
	plus: "Plus",
	minus: "Minus",
	"arrow-up": "ArrowUp",
	"arrow-down": "ArrowDown",
	"arrow-left": "ArrowLeft",
	"arrow-right": "ArrowRight",
	share: "Share",
	download: "Download",
	upload: "Upload",
	cloud: "Cloud",
	sun: "Sun",
	moon: "Moon",
	bolt: "Zap",
	bug: "Bug",
	coffee: "Coffee",
	utensils: "UtensilsCrossed",
	car: "Car",
	plane: "Plane",
	ship: "Ship",
	bicycle: "Bike",
	tree: "TreeDeciduous",
	leaf: "Leaf",
	paw: "PawPrint",
	cat: "Cat",
	dog: "Dog",
	fish: "Fish",
	"hands-helping": "HandHeart",
	handshake: "Handshake",
	"thumbs-up": "ThumbsUp",
	"thumbs-down": "ThumbsDown",
	smile: "Smile",
	laugh: "Laugh",
	meh: "Meh",
	frown: "Frown",
	angry: "Angry",
	chart: "ChartBar",
	"chart-bar": "ChartBar",
	"chart-line": "ChartLine",
	"chart-pie": "ChartPie",
	database: "Database",
	server: "Server",
	terminal: "Terminal",
	network: "Network",
	wifi: "Wifi",
	bluetooth: "Bluetooth",
	headphones: "Headphones",
	microphone: "Mic",
	"video-camera": "Video",
	tv: "Tv",
	"hard-drive": "HardDrive",
	cpu: "Cpu",
	memory: "MemoryStick",
	battery: "Battery",
	plug: "Plug",
	hammer: "Hammer",
	"screwdriver-wrench": "Wrench",
	paint: "PaintBucket",
	ruler: "Ruler",
	sitemap: "Network",
	random: "Shuffle",
	sync: "RefreshCw",
	repeat: "Repeat",
	play: "Play",
	pause: "Pause",
	stop: "Square",
	forward: "FastForward",
	backward: "Rewind",
	// 默认图标已覆盖大多数场景
};

/**
 * 将 Discourse API 返回的图标名称（通常是 Font Awesome 样式）转换为 Lucide 图标组件
 * @param iconName - API 返回的图标名称，如 "seedling"
 * @param size - 图标大小
 * @param color - 图标颜色
 * @returns Lucide 图标组件实例，如果找不到则返回 null
 */
export function getCategoryIcon(
	iconName: string | undefined | null,
	size: number = 16,
	color?: string
): React.ReactElement | null {
	if (!iconName) return null;

	// 转换为小写并去除 "fa-" 前缀
	const normalizedName = iconName.toLowerCase().replace(/^fa-/, "");

	// 查找映射
	const lucideIconName = FA_TO_LUCIDE_MAP[normalizedName];

	if (lucideIconName && lucideIconName in Icons) {
		const IconComponent = Icons[lucideIconName] as React.ComponentType<{
			size?: number;
			color?: string;
		}>;
		return <IconComponent size={size} color={color} />;
	}

	// 尝试直接查找（首字母大写的 PascalCase）
	const pascalCase = normalizedName
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	if (pascalCase in Icons) {
		const IconComponent = Icons[pascalCase as keyof typeof Icons] as React.ComponentType<{
			size?: number;
			color?: string;
		}>;
		return <IconComponent size={size} color={color} />;
	}

	return null;
}
