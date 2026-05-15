import { describe, expect, it } from "vitest";
import { RACK_SIZES } from "../data/constants";
import { deviceFromLib, findRow, mkSlot, normalizeState } from "./helpers";
import { INIT, reducer } from "./AppContext";

const oneU = {
	libId: "server",
	name: "Server",
	cat: "compute",
	uH: 1,
	u: 6,
	pwr: { type: "cord", conn: "C13", w: 100 },
	ports: [],
};

const twoU = { ...oneU, libId: "storage", name: "Storage", uH: 2 };
const shelfLib = {
	libId: "shelf",
	name: "Shelf",
	cat: "shelf",
	uH: 1,
	u: 6,
	pwr: { type: "passive", conn: "", w: 0 },
	ports: [],
};

function place(state, lib, rowIndex) {
	return reducer(state, {
		type: "PLACE_DEVICE",
		device: deviceFromLib(lib),
		rowIndex,
	});
}

describe("normalizeState", () => {
	it("repairs malformed persisted state and removes dangling slot references", () => {
		const normalized = normalizeState({
			rackName: 42,
			rackSize: 999,
			powerCap: "bad",
			selId: "missing-device",
			devices: {
				ok: {
					id: "ok",
					libId: "ok-lib",
					name: "OK",
					cat: "compute",
					uH: 1,
					u: 6,
					pwr: { type: "outlet", conn: "C13", w: "15" },
					ports: [{ t: "ethernet", n: "2", s: 10 }],
				},
			},
			slots: [
				{
					items: [
						{ id: "ok", u: 6 },
						{ id: "missing-device", u: 6 },
					],
					spanOf: null,
				},
				{ items: "not-array", spanOf: { id: "missing-device", offset: 1 } },
			],
		});

		expect(RACK_SIZES).toContain(normalized.rackSize);
		expect(normalized.rackName).toBe("Rack 1");
		expect(normalized.powerCap).toBe(2000);
		expect(normalized.devices.ok.pwr.type).toBe("cord");
		expect(normalized.devices.ok.pwr.w).toBe(15);
		expect(normalized.slots).toHaveLength(normalized.rackSize);
		expect(normalized.slots[0].items).toEqual([{ id: "ok", u: 6 }]);
		expect(normalized.slots[1]).toEqual(mkSlot());
		expect(normalized.selId).toBeNull();
	});

	it("drops impossible duplicate and over-capacity slot topology", () => {
		const normalized = normalizeState({
			rackSize: 12,
			devices: {
				first: { ...oneU, id: "first" },
				second: { ...oneU, id: "second" },
				multi: { ...twoU, id: "multi" },
			},
			slots: [
				{
					items: [
						{ id: "first", u: 6 },
						{ id: "second", u: 6 },
					],
					spanOf: null,
				},
				{ items: [{ id: "first", u: 6 }], spanOf: null },
				{ items: [{ id: "multi", u: 6 }], spanOf: null },
				{ items: [], spanOf: { id: "other", offset: 1 } },
			],
		});

		expect(normalized.slots[0].items).toEqual([{ id: "first", u: 6 }]);
		expect(normalized.slots[1]).toEqual(mkSlot());
		expect(normalized.slots[2]).toEqual(mkSlot());
		expect(normalized.slots[3]).toEqual(mkSlot());
		expect(Object.keys(normalized.devices)).toEqual(["first"]);
	});

	it("normalizes shelf contents to valid unique single-U items within capacity", () => {
		const normalized = normalizeState({
			rackSize: 12,
			devices: {
				shelf: {
					...shelfLib,
					id: "shelf",
					shelved: [
						{ ...oneU, id: "first", u: 3 },
						{ ...oneU, id: "first", u: 3, name: "Duplicate" },
						{ ...twoU, id: "multi" },
						{ ...shelfLib, id: "nested" },
						{ ...oneU, id: "second", u: 4 },
					],
				},
			},
			slots: [{ items: [{ id: "shelf", u: 6 }], spanOf: null }],
		});

		expect(Object.keys(normalized.devices)).toEqual(["shelf"]);
		expect(normalized.devices.shelf.shelved.map((it) => it.id)).toEqual([
			"first",
		]);
	});

	it("enforces globally unique IDs across placed devices and all shelf contents", () => {
		const normalized = normalizeState({
			rackSize: 12,
			devices: {
				placed: { ...oneU, id: "placed" },
				shelfA: {
					...shelfLib,
					id: "shelfA",
					shelved: [
						{ ...oneU, id: "placed", name: "Duplicate of placed", u: 3 },
						{ ...oneU, id: "shared", u: 3 },
					],
				},
				shelfB: {
					...shelfLib,
					id: "shelfB",
					shelved: [{ ...oneU, id: "shared", u: 3 }],
				},
			},
			slots: [
				{ items: [{ id: "placed", u: 6 }], spanOf: null },
				{ items: [{ id: "shelfA", u: 6 }], spanOf: null },
				{ items: [{ id: "shelfB", u: 6 }], spanOf: null },
			],
		});

		expect(normalized.devices.shelfA.shelved.map((it) => it.id)).toEqual([
			"shared",
		]);
		expect(normalized.devices.shelfB.shelved).toEqual([]);
	});
});

describe("reducer placement invariants", () => {
	it("ignores invalid placement instead of throwing or corrupting slots", () => {
		const device = deviceFromLib(twoU);

		expect(() =>
			reducer(INIT, { type: "PLACE_DEVICE", device, rowIndex: INIT.rackSize }),
		).not.toThrow();
		expect(
			reducer(INIT, { type: "PLACE_DEVICE", device, rowIndex: INIT.rackSize }),
		).toEqual(INIT);
	});

	it("moves devices between rows atomically and rejects invalid moves", () => {
		const withDevice = place(INIT, twoU, 0);
		const deviceId = Object.keys(withDevice.devices)[0];

		const moved = reducer(withDevice, {
			type: "MOVE_DEVICE_TO_RACK",
			deviceId,
			rowIndex: 3,
		});
		expect(findRow(moved.slots, deviceId)).toBe(3);
		expect(moved.slots[0]).toEqual(mkSlot());
		expect(moved.slots[4].spanOf).toEqual({ id: deviceId, offset: 1 });

		const rejected = reducer(moved, {
			type: "MOVE_DEVICE_TO_RACK",
			deviceId,
			rowIndex: INIT.rackSize,
		});
		expect(rejected).toEqual(moved);
	});

	it("rejects invalid direct shelf placement and cleans slots for valid direct shelf placement", () => {
		const withShelf = place(INIT, shelfLib, 0);
		const shelfId = Object.keys(withShelf.devices)[0];
		const withDevice = place(withShelf, oneU, 1);
		const deviceId = Object.keys(withDevice.devices).find(
			(id) => id !== shelfId,
		);

		expect(
			reducer(withShelf, {
				type: "PLACE_ON_SHELF",
				shelfId,
				device: deviceFromLib(twoU),
			}),
		).toEqual(withShelf);

		const shelved = reducer(withDevice, {
			type: "PLACE_ON_SHELF",
			shelfId,
			device: withDevice.devices[deviceId],
		});
		expect(shelved.devices[deviceId]).toBeUndefined();
		expect(shelved.devices[shelfId].shelved).toHaveLength(1);
		expect(shelved.slots[1]).toEqual(mkSlot());
	});

	it("moves rack devices to shelves and shelf items back to the rack atomically", () => {
		const withShelf = place(INIT, shelfLib, 0);
		const shelfId = Object.keys(withShelf.devices)[0];
		const withDevice = place(withShelf, oneU, 1);
		const deviceId = Object.keys(withDevice.devices).find(
			(id) => id !== shelfId,
		);

		const shelved = reducer(withDevice, {
			type: "MOVE_DEVICE_TO_SHELF",
			shelfId,
			deviceId,
		});
		expect(shelved.devices[deviceId]).toBeUndefined();
		expect(shelved.devices[shelfId].shelved).toHaveLength(1);
		expect(shelved.slots[1]).toEqual(mkSlot());

		const unshelved = reducer(shelved, {
			type: "MOVE_SHELF_ITEM_TO_RACK",
			shelfId,
			deviceId,
			rowIndex: 2,
		});
		expect(unshelved.devices[deviceId].name).toBe(oneU.name);
		expect(unshelved.devices[shelfId].shelved).toEqual([]);
		expect(findRow(unshelved.slots, deviceId)).toBe(2);
	});

	it("moves shelf items between shelves atomically and rejects full targets", () => {
		const source = deviceFromLib(shelfLib);
		const target = deviceFromLib(shelfLib);
		target.shelved = [{ ...deviceFromLib(oneU), id: "full", u: 6 }];
		const item = { ...deviceFromLib(oneU), id: "item", u: 3 };
		source.shelved = [item];
		const state = reducer(
			reducer(INIT, { type: "PLACE_DEVICE", device: source, rowIndex: 0 }),
			{ type: "PLACE_DEVICE", device: target, rowIndex: 1 },
		);

		expect(
			reducer(state, {
				type: "MOVE_SHELF_ITEM",
				deviceId: item.id,
				fromShelfId: source.id,
				toShelfId: target.id,
			}),
		).toEqual(state);

		const withRoom = reducer(state, {
			type: "REMOVE_FROM_SHELF",
			shelfId: target.id,
			deviceId: "full",
		});
		const moved = reducer(withRoom, {
			type: "MOVE_SHELF_ITEM",
			deviceId: item.id,
			fromShelfId: source.id,
			toShelfId: target.id,
		});
		expect(moved.devices[source.id].shelved).toEqual([]);
		expect(moved.devices[target.id].shelved.map((it) => it.id)).toEqual([
			item.id,
		]);
	});

	it("ignores updates for missing devices", () => {
		expect(
			reducer(INIT, {
				type: "UPDATE_DEVICE",
				deviceId: "missing",
				fields: { name: "Ghost" },
			}),
		).toEqual(INIT);
	});

	it("ignores device geometry fields in instance updates", () => {
		const withDevice = place(INIT, oneU, 0);
		const deviceId = Object.keys(withDevice.devices)[0];
		const updated = reducer(withDevice, {
			type: "UPDATE_DEVICE",
			deviceId,
			fields: { name: "Renamed", u: 3, uH: 4 },
		});

		expect(updated.devices[deviceId].name).toBe("Renamed");
		expect(updated.devices[deviceId].u).toBe(6);
		expect(updated.devices[deviceId].uH).toBe(1);
		expect(updated.slots[0].items).toEqual([{ id: deviceId, u: 6 }]);
	});

	it("removes devices that no longer fit after direct rack resize", () => {
		const withDevice = place(INIT, twoU, 10);
		const deviceId = Object.keys(withDevice.devices)[0];
		const selected = reducer(withDevice, {
			type: "SELECT_DEVICE",
			deviceId,
		});
		const resized = reducer(selected, { type: "SET_RACK_SIZE", newSize: 8 });

		expect(resized.rackSize).toBe(8);
		expect(resized.devices[deviceId]).toBeUndefined();
		expect(resized.slots).toHaveLength(8);
		expect(resized.selId).toBeNull();
	});
});

describe("library size edit invariant", () => {
	it("does not mutate placed device size or slot occupancy when editing a library template", () => {
		const withDevice = place(INIT, oneU, 0);
		const deviceId = Object.keys(withDevice.devices)[0];

		const updated = reducer(withDevice, {
			type: "UPDATE_LIB",
			libId: oneU.libId,
			isBuiltin: true,
			fields: {
				name: "Bigger template",
				cat: "compute",
				u: 6,
				uH: 4,
				pwr: { type: "cord", conn: "C13", w: 200 },
				ports: [],
			},
		});

		expect(updated.devices[deviceId].name).toBe("Bigger template");
		expect(updated.devices[deviceId].u).toBe(6);
		expect(updated.devices[deviceId].uH).toBe(1);
		expect(updated.slots[0].items).toEqual([{ id: deviceId, u: 6 }]);
		expect(updated.slots[1]).toEqual(mkSlot());
	});
});
