import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TimeUnit = "s" | "m" | "h";

interface TimeUnitState {
	timeUnit: TimeUnit;
	setTimeUnit: (unit: TimeUnit) => void;
	cycleTimeUnit: () => void;
}

export const useTimeUnitStore = create<TimeUnitState>()(
	persist(
		(set, get) => ({
			timeUnit: "s",
			setTimeUnit: (unit) => set({ timeUnit: unit }),
			cycleTimeUnit: () => {
				const current = get().timeUnit;
				const next = current === "s" ? "m" : current === "m" ? "h" : "s";
				set({ timeUnit: next });
			},
		}),
		{
			name: "time-unit-storage",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
