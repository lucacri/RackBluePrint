import { useEffect, useRef } from "react";
import { useModal } from "../state/UIContext";

export default function ConfirmModal() {
	const { confirmModal, closeConfirm, doConfirm } = useModal();
	const dialogRef = useRef(null);

	useEffect(() => {
		if (confirmModal) {
			dialogRef.current?.showModal();
		} else {
			dialogRef.current?.close();
		}
	}, [confirmModal]);

	function handleBackdrop(e) {
		if (e.target === dialogRef.current) closeConfirm();
	}

	return (
		<dialog
			ref={dialogRef}
			className="modal confirm-modal"
			onClick={handleBackdrop}
			onClose={closeConfirm}
		>
			<div className="modal-form" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Confirm</h2>
				</div>
				<div className="modal-body">
					<p className="confirm-msg">{confirmModal?.msg}</p>
				</div>
				<div className="modal-footer">
					<button className="btn" onClick={closeConfirm}>
						Cancel
					</button>
					<button className="btn btn-danger" onClick={doConfirm}>
						Confirm
					</button>
				</div>
			</div>
		</dialog>
	);
}
