import {
	createContext,
	useContext,
	useState,
	useRef,
	useCallback,
} from "react";

// ── Drag context (live drag state shared across the tree) ─────────────────────
const DragCtx = createContext(null);

export function DragProvider({ children }) {
	const [drag, setDrag] = useState(null);
	// drag shape: { src:'lib'|'rack', libId?, devId?, fromRow? }
	return (
		<DragCtx.Provider value={{ drag, setDrag }}>{children}</DragCtx.Provider>
	);
}

export function useDrag() {
	return useContext(DragCtx);
}

// ── Modal context ─────────────────────────────────────────────────────────────
const ModalCtx = createContext(null);

export function ModalProvider({ children }) {
	const [devModal, setDevModal] = useState(null); // null | { prefill, mode: 'lib'|'instance' }
	const [confirmModal, setConfirmModal] = useState(null); // null | { msg, cb }

	// mode='lib'      → create/edit library entry (default)
	// mode='instance' → edit only this placed device, don't touch the library
	const openDevModal = useCallback(
		(prefill, mode = "lib") => setDevModal({ prefill: prefill ?? null, mode }),
		[],
	);
	const closeDevModal = useCallback(() => setDevModal(null), []);

	const openConfirm = useCallback(
		(msg, cb) => setConfirmModal({ msg, cb }),
		[],
	);
	const closeConfirm = useCallback(() => setConfirmModal(null), []);
	const doConfirm = useCallback(() => {
		confirmModal?.cb();
		setConfirmModal(null);
	}, [confirmModal]);

	return (
		<ModalCtx.Provider
			value={{
				devModal,
				openDevModal,
				closeDevModal,
				confirmModal,
				openConfirm,
				closeConfirm,
				doConfirm,
			}}
		>
			{children}
		</ModalCtx.Provider>
	);
}

export function useModal() {
	return useContext(ModalCtx);
}

// ── Toast context ─────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
	const [msg, setMsg] = useState(null);
	const timer = useRef(null);

	const toast = useCallback((message) => {
		setMsg(message);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setMsg(null), 2600);
	}, []);

	return (
		<ToastCtx.Provider value={toast}>
			{children}
			{msg && (
				<div className="toast show" aria-live="polite">
					{msg}
				</div>
			)}
		</ToastCtx.Provider>
	);
}

export function useToast() {
	return useContext(ToastCtx);
}
