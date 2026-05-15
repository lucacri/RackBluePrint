import {
	createContext,
	useContext,
	useReducer,
	useEffect,
	useRef,
} from "react";
import { canPlace, canPlaceOnShelf, mkSlot, normalizeState } from "./helpers";

// ── Initial state ─────────────────────────────────────────────────────────────

export const INIT = {
	rackName: "Rack 1",
	rackSize: 12,
	powerCap: 2000,
	devices: {}, // id -> device
	slots: Array.from({ length: 12 }, mkSlot),
	selId: null,
	libOverrides: {}, // libId -> override fields
	customLib: [], // user-created library entries
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function removeDeviceFromSlots(slots, deviceId) {
	return slots.map((s) => ({
		...s,
		items: s.items.filter((it) => it.id !== deviceId),
		spanOf: s.spanOf?.id === deviceId ? null : s.spanOf,
	}));
}

function placeDeviceInSlots(slots, device, rowIndex) {
	const next = slots.map((s) => ({ ...s, items: [...s.items] }));
	next[rowIndex].items.push({ id: device.id, u: device.u });
	for (let i = 1; i < device.uH; i++) {
		next[rowIndex + i] = {
			...next[rowIndex + i],
			spanOf: { id: device.id, offset: i },
		};
	}
	return next;
}

function rebuildPlacedDevices(devices, slots, rackSize) {
	let rebuiltSlots = Array.from({ length: rackSize }, mkSlot);
	const keptDevices = {};

	for (let rowIndex = 0; rowIndex < rackSize; rowIndex++) {
		const slot = slots[rowIndex];
		if (!slot || slot.spanOf || !Array.isArray(slot.items)) continue;
		for (const item of slot.items) {
			const device = devices[item.id];
			if (!device || keptDevices[device.id]) continue;
			if (!canPlace(rebuiltSlots, rackSize, rowIndex, device)) continue;
			keptDevices[device.id] = device;
			rebuiltSlots = placeDeviceInSlots(rebuiltSlots, device, rowIndex);
		}
	}

	return { devices: keptDevices, slots: rebuiltSlots };
}

export function reducer(state, action) {
	switch (action.type) {
		case "LOAD":
			return normalizeState(action.payload);

		case "SET_RACK_NAME":
			return { ...state, rackName: action.name };

		case "SET_RACK_SIZE": {
			const { newSize } = action;
			const resizedSlots = Array.from(
				{ length: newSize },
				(_, i) => state.slots[i] ?? mkSlot(),
			);
			const { devices, slots } = rebuildPlacedDevices(
				state.devices,
				resizedSlots,
				newSize,
			);
			return {
				...state,
				rackSize: newSize,
				devices,
				slots,
				selId: state.selId && devices[state.selId] ? state.selId : null,
			};
		}

		case "SET_POWER_CAP":
			return { ...state, powerCap: action.cap };

		case "PLACE_DEVICE": {
			const { device, rowIndex } = action;
			if (
				!device ||
				state.devices[device.id] ||
				!canPlace(state.slots, state.rackSize, rowIndex, device)
			)
				return state;
			return {
				...state,
				devices: { ...state.devices, [device.id]: device },
				slots: placeDeviceInSlots(state.slots, device, rowIndex),
			};
		}

		case "MOVE_DEVICE_TO_RACK": {
			const { deviceId, rowIndex } = action;
			const device = state.devices[deviceId];
			if (!device) return state;
			const slots = removeDeviceFromSlots(state.slots, deviceId);
			if (!canPlace(slots, state.rackSize, rowIndex, device)) return state;
			return { ...state, slots: placeDeviceInSlots(slots, device, rowIndex) };
		}

		case "MOVE_DEVICE_TO_SHELF": {
			const { deviceId, shelfId } = action;
			const device = state.devices[deviceId];
			const shelf = state.devices[shelfId];
			if (!device || !canPlaceOnShelf(shelf, device)) return state;
			const devices = { ...state.devices };
			delete devices[deviceId];
			devices[shelfId] = {
				...shelf,
				shelved: [...(shelf.shelved ?? []), device],
			};
			return {
				...state,
				devices,
				slots: removeDeviceFromSlots(state.slots, deviceId),
				selId: state.selId === deviceId ? null : state.selId,
			};
		}

		case "MOVE_SHELF_ITEM": {
			const { deviceId, fromShelfId, toShelfId } = action;
			const fromShelf = state.devices[fromShelfId];
			const toShelf = state.devices[toShelfId];
			const device = fromShelf?.shelved?.find((it) => it.id === deviceId);
			if (
				!device ||
				!toShelf ||
				fromShelfId === toShelfId ||
				!canPlaceOnShelf(toShelf, device)
			)
				return state;
			return {
				...state,
				devices: {
					...state.devices,
					[fromShelfId]: {
						...fromShelf,
						shelved: fromShelf.shelved.filter((it) => it.id !== deviceId),
					},
					[toShelfId]: {
						...toShelf,
						shelved: [...(toShelf.shelved ?? []), device],
					},
				},
			};
		}

		case "MOVE_SHELF_ITEM_TO_RACK": {
			const { deviceId, shelfId, rowIndex } = action;
			const shelf = state.devices[shelfId];
			const device = shelf?.shelved?.find((it) => it.id === deviceId);
			if (!device || !canPlace(state.slots, state.rackSize, rowIndex, device))
				return state;
			return {
				...state,
				devices: {
					...state.devices,
					[device.id]: device,
					[shelfId]: {
						...shelf,
						shelved: shelf.shelved.filter((it) => it.id !== deviceId),
					},
				},
				slots: placeDeviceInSlots(state.slots, device, rowIndex),
			};
		}

		case "LIFT_DEVICE": {
			// Remove from slots only — keep in state.devices (used when moving)
			const { deviceId } = action;
			return { ...state, slots: removeDeviceFromSlots(state.slots, deviceId) };
		}

		case "DELETE_DEVICE": {
			const { deviceId } = action;
			const slots = removeDeviceFromSlots(state.slots, deviceId);
			const devices = { ...state.devices };
			delete devices[deviceId];
			return {
				...state,
				devices,
				slots,
				selId: state.selId === deviceId ? null : state.selId,
			};
		}

		case "SELECT_DEVICE":
			return { ...state, selId: action.deviceId };

		case "UPDATE_DEVICE": {
			if (!state.devices[action.deviceId]) return state;
			const { u: _u, uH: _uH, ...safeFields } = action.fields ?? {};
			return {
				...state,
				devices: {
					...state.devices,
					[action.deviceId]: {
						...state.devices[action.deviceId],
						...safeFields,
					},
				},
			};
		}

		case "ADD_CUSTOM_LIB":
			return { ...state, customLib: [...state.customLib, action.entry] };

		case "UPDATE_LIB": {
			const { libId, fields, isBuiltin } = action;
			let libOverrides = state.libOverrides;
			let customLib = state.customLib;
			if (isBuiltin) {
				libOverrides = { ...libOverrides, [libId]: fields };
			} else {
				customLib = customLib.map((l) =>
					l.libId === libId ? { ...l, ...fields } : l,
				);
			}
			// Propagate display-only changes to already-placed instances.
			// Size changes affect future placements only; slots remain the source of placed size.
			const devices = Object.fromEntries(
				Object.entries(state.devices).map(([id, dev]) =>
					dev.libId === libId
						? [
								id,
								{
									...dev,
									name: fields.name,
									cat: fields.cat,
									pwr: fields.pwr,
									ports: fields.ports,
								},
							]
						: [id, dev],
				),
			);
			return { ...state, libOverrides, customLib, devices };
		}

		// ── Shelf actions ─────────────────────────────────────────────────────────

		case "PLACE_ON_SHELF": {
			// device: full object (may or may not already be in state.devices)
			const { shelfId, device } = action;
			const shelf = state.devices[shelfId];
			const ignoreId = state.devices[device?.id] ? device.id : null;
			if (!device || !canPlaceOnShelf(shelf, device, ignoreId)) return state;
			const newDevices = { ...state.devices };
			if (newDevices[device.id]) delete newDevices[device.id]; // pull out of top-level if present
			newDevices[shelfId] = {
				...shelf,
				shelved: [...(shelf.shelved ?? []), device],
			};
			return {
				...state,
				devices: newDevices,
				slots: removeDeviceFromSlots(state.slots, device.id),
				selId: state.selId === device.id ? null : state.selId,
			};
		}

		case "LIFT_FROM_SHELF": {
			// Removes from shelf's shelved[]; caller re-places via PLACE_DEVICE / PLACE_ON_SHELF
			const { shelfId, deviceId } = action;
			const shelf = state.devices[shelfId];
			if (!shelf) return state;
			return {
				...state,
				devices: {
					...state.devices,
					[shelfId]: {
						...shelf,
						shelved: (shelf.shelved ?? []).filter((it) => it.id !== deviceId),
					},
				},
			};
		}

		case "REMOVE_FROM_SHELF": {
			// Delete a shelved item without re-placing it
			const { shelfId, deviceId } = action;
			const shelf = state.devices[shelfId];
			if (!shelf) return state;
			return {
				...state,
				devices: {
					...state.devices,
					[shelfId]: {
						...shelf,
						shelved: (shelf.shelved ?? []).filter((it) => it.id !== deviceId),
					},
				},
			};
		}

		case "CLEAR_RACK":
			return {
				...state,
				devices: {},
				slots: Array.from({ length: state.rackSize }, mkSlot),
				selId: null,
			};

		default:
			return state;
	}
}

// ── Context + Provider ────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
	const [state, dispatch] = useReducer(reducer, INIT);

	// Skip the very first save: on mount both effects fire in the same flush,
	// so the save effect would run with the blank INIT state and overwrite
	// localStorage before the load effect dispatches the persisted data.
	const isMounted = useRef(false);

	// Load persisted state on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem("rackitect_v1");
			if (!saved) return;
			dispatch({ type: "LOAD", payload: JSON.parse(saved) });
		} catch (_) {}
	}, []);

	// Persist on every state change — but skip the initial render
	useEffect(() => {
		if (!isMounted.current) {
			isMounted.current = true;
			return;
		}
		try {
			localStorage.setItem("rackitect_v1", JSON.stringify(state));
		} catch (_) {}
	}, [state]);

	return (
		<AppContext.Provider value={{ state, dispatch }}>
			{children}
		</AppContext.Provider>
	);
}

export function useApp() {
	return useContext(AppContext);
}
