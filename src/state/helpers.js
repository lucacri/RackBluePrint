import { CAT_COLORS, MAX_U, PORT_LBL, RACK_SIZES } from "../data/constants";
import BUILTIN_LIBRARY from "../data/library";

let _uid = 0;
export function uid() {
	return "d" + Date.now().toString(36) + ++_uid;
}

export function mkSlot() {
	return { items: [], spanOf: null };
}

const DEFAULT_STATE = {
	rackName: "Rack 1",
	rackSize: 12,
	powerCap: 2000,
	devices: {},
	slots: Array.from({ length: 12 }, mkSlot),
	selId: null,
	libOverrides: {},
	customLib: [],
};

function numberInRange(value, fallback, min, max) {
	const n = Number(value);
	return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function normalizePower(pwr) {
	const type = pwr?.type === "outlet" ? "cord" : pwr?.type;
	return {
		type: ["cord", "brick", "poe", "usb", "passive"].includes(type)
			? type
			: "passive",
		conn: typeof pwr?.conn === "string" ? pwr.conn : "",
		w: numberInRange(pwr?.w, 0, 0, 100000),
	};
}

function normalizePorts(ports) {
	if (!Array.isArray(ports)) return [];
	return ports.map((port) => ({
		t: typeof port?.t === "string" ? port.t : "ethernet",
		n: numberInRange(port?.n, 1, 1, 999),
		s: typeof port?.s === "string" ? port.s : String(port?.s ?? ""),
	}));
}

function normalizeShelvedItems(shelfId, shelved) {
	if (!Array.isArray(shelved)) return [];
	const shelf = { id: shelfId, cat: "shelf", shelved: [] };
	const seen = new Set();

	for (const [index, item] of shelved.entries()) {
		const id = String(item?.id ?? `${shelfId}-shelf-${index}`);
		if (seen.has(id)) continue;
		const normalized = normalizeDevice(id, item, 1);
		if (!normalized || !canPlaceOnShelf(shelf, normalized)) continue;
		shelf.shelved.push(normalized);
		seen.add(id);
	}

	return shelf.shelved;
}

function normalizeDevice(id, dev, rackSize) {
	if (!dev || typeof dev !== "object") return null;
	const cat = CAT_COLORS[dev.cat] ? dev.cat : "custom";
	const normalized = {
		id,
		libId: typeof dev.libId === "string" ? dev.libId : id,
		name:
			typeof dev.name === "string" && dev.name.trim()
				? dev.name
				: "Untitled device",
		cat,
		uH: numberInRange(dev.uH, 1, 1, rackSize),
		u: numberInRange(dev.u, MAX_U, 1, MAX_U),
		pwr: normalizePower(dev.pwr),
		ports: normalizePorts(dev.ports),
		notes: typeof dev.notes === "string" ? dev.notes : "",
	};
	if (cat === "shelf") {
		normalized.shelved = normalizeShelvedItems(id, dev.shelved);
	}
	return normalized;
}

export function normalizeState(raw) {
	if (!raw || typeof raw !== "object") return DEFAULT_STATE;

	const rackSize = RACK_SIZES.includes(Number(raw.rackSize))
		? Number(raw.rackSize)
		: DEFAULT_STATE.rackSize;
	const devices = Object.fromEntries(
		Object.entries(
			raw.devices && typeof raw.devices === "object" ? raw.devices : {},
		)
			.map(([id, dev]) => [id, normalizeDevice(id, dev, rackSize)])
			.filter(([, dev]) => dev),
	);

	const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
	const slots = Array.from({ length: rackSize }, mkSlot);
	const placedIds = new Set();

	for (let index = 0; index < rackSize; index++) {
		const rawSlot = rawSlots[index];
		if (!rawSlot || typeof rawSlot !== "object" || rawSlot.spanOf) continue;
		if (!Array.isArray(rawSlot.items)) continue;

		let usedU = 0;
		for (const item of rawSlot.items) {
			const device = devices[item?.id];
			if (!device || placedIds.has(device.id)) continue;
			const u = numberInRange(item.u, device.u, 1, MAX_U);
			if (usedU + u > MAX_U) continue;
			if (index + device.uH > rackSize) continue;

			let validSpan = true;
			for (let offset = 1; offset < device.uH; offset++) {
				const spanSlot = rawSlots[index + offset];
				if (
					!spanSlot ||
					typeof spanSlot !== "object" ||
					!spanSlot.spanOf ||
					spanSlot.spanOf.id !== device.id ||
					Number(spanSlot.spanOf.offset) !== offset
				) {
					validSpan = false;
					break;
				}
			}
			if (!validSpan) continue;

			slots[index].items.push({ id: device.id, u });
			for (let offset = 1; offset < device.uH; offset++) {
				slots[index + offset] = {
					items: [],
					spanOf: { id: device.id, offset },
				};
			}
			placedIds.add(device.id);
			usedU += u;
		}
	}

	const placedDevices = Object.fromEntries(
		Object.entries(devices).filter(([id]) => placedIds.has(id)),
	);
	const globalIds = new Set(Object.keys(placedDevices));
	const globallyUniqueDevices = Object.fromEntries(
		Object.entries(placedDevices).map(([id, dev]) => {
			if (dev.cat !== "shelf") return [id, dev];
			const shelf = { ...dev, shelved: [] };
			for (const item of dev.shelved ?? []) {
				if (globalIds.has(item.id)) continue;
				if (!canPlaceOnShelf(shelf, item)) continue;
				shelf.shelved.push(item);
				globalIds.add(item.id);
			}
			return [id, shelf];
		}),
	);

	return {
		...DEFAULT_STATE,
		rackName:
			typeof raw.rackName === "string" && raw.rackName.trim()
				? raw.rackName
				: DEFAULT_STATE.rackName,
		rackSize,
		powerCap: numberInRange(raw.powerCap, DEFAULT_STATE.powerCap, 0, 1000000),
		devices: globallyUniqueDevices,
		slots,
		selId:
			typeof raw.selId === "string" && globallyUniqueDevices[raw.selId]
				? raw.selId
				: null,
		libOverrides:
			raw.libOverrides && typeof raw.libOverrides === "object"
				? raw.libOverrides
				: {},
		customLib: Array.isArray(raw.customLib) ? raw.customLib : [],
	};
}

export function esc(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function getEffectiveLib(state) {
	return [
		...BUILTIN_LIBRARY.map((lib) =>
			state.libOverrides?.[lib.libId]
				? { ...lib, ...state.libOverrides[lib.libId] }
				: lib,
		),
		...(state.customLib ?? []),
	];
}

export function deviceFromLib(lib) {
	return {
		id: uid(),
		libId: lib.libId,
		name: lib.name,
		cat: lib.cat,
		uH: lib.uH,
		u: lib.u,
		pwr: { ...lib.pwr },
		ports: lib.ports.map((p) => ({ ...p })),
		notes: "",
		...(lib.cat === "shelf" ? { shelved: [] } : {}),
	};
}

// ── Placement validation ──────────────────────────────────────────────────────

function rowFreeUnits(slots, ri, ignoreId) {
	const slot = slots[ri];
	if (!slot) return 0;
	if (slot.spanOf) return slot.spanOf.id === ignoreId ? MAX_U : 0;
	return (
		MAX_U -
		slot.items.filter((it) => it.id !== ignoreId).reduce((s, it) => s + it.u, 0)
	);
}

function rowHasFullDevice(slots, ri, ignoreId) {
	const slot = slots[ri];
	if (!slot) return true;
	return slot.items
		.filter((it) => it.id !== ignoreId)
		.some((it) => it.u === MAX_U);
}

// Returns true if `dev` fits on `shelf` (shelves only hold single-U items)
export function canPlaceOnShelf(shelf, dev, ignoreId = null) {
	if (!shelf || shelf.cat !== "shelf") return false;
	if (dev.uH > 1) return false; // multi-U can't sit on a shelf
	if (dev.cat === "shelf") return false; // no nested shelves
	const used = (shelf.shelved ?? [])
		.filter((it) => it.id !== ignoreId)
		.reduce((s, it) => s + it.u, 0);
	return used + dev.u <= MAX_U;
}

export function canPlace(slots, rackSize, ri, dev, ignoreId = null) {
	if (ri < 0 || ri + dev.uH > rackSize) return false;
	for (let i = 0; i < dev.uH; i++) {
		const slot = slots[ri + i];
		if (!slot) return false;
		if (slot.spanOf && slot.spanOf.id !== ignoreId) return false;
		if (rowFreeUnits(slots, ri + i, ignoreId) < dev.u) return false;
		if (rowHasFullDevice(slots, ri + i, ignoreId)) return false;
	}
	return true;
}

export function findRow(slots, id) {
	for (let i = 0; i < slots.length; i++) {
		if (slots[i].items.some((it) => it.id === id)) return i;
	}
	return -1;
}

export function findFirstSlot(state, dev) {
	for (let i = 0; i < state.rackSize; i++) {
		if (canPlace(state.slots, state.rackSize, i, dev)) return i;
	}
	return -1;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function pwrBadge(pwr) {
	if (!pwr || pwr.type === "passive") return "";
	if (pwr.type === "poe") return "PoE";
	if (pwr.type === "brick") return "Brick";
	return pwr.conn || pwr.type;
}

export function portSummary(ports) {
	if (!ports?.length) return "";
	const p = ports[0];
	return `${p.n}×${PORT_LBL[p.t] ?? p.t}`;
}

export function rackSummary(state) {
	let uU = 0,
		w = 0;
	for (const dev of Object.values(state.devices)) {
		uU += dev.uH;
		w += dev.pwr?.w ?? 0;
		// Also count power draw of items sitting on shelves
		for (const it of dev.shelved ?? []) {
			w += it.pwr?.w ?? 0;
		}
	}
	const pct =
		state.powerCap > 0
			? Math.min(100, Math.round((w / state.powerCap) * 100))
			: 0;
	return { uU, freeU: state.rackSize - uU, w, pct };
}
