import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toastStore } from './toastStore.js';
import type { ToastData } from './toastStore.js';

export { toastStore, toast, toastUndo } from './toastStore.js';
export type { ToastType, ToastData } from './toastStore.js';

/** React hook that subscribes to the global toast store. */
export function useToasts(): ToastData[] {
	return useSyncExternalStore(
		(cb) => toastStore.subscribe(cb),
		() => toastStore.getToasts(),
		() => []
	);
}

interface ToastItemProps {
	toast: ToastData;
	onDismiss: (id: string) => void;
}

function ToastItem({ toast: t, onDismiss }: ToastItemProps) {
	const [visible, setVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	useEffect(() => {
		// Animate in
		const raf = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(raf);
	}, []);

	const bgColor =
		t.type === 'error'
			? '#ff3e00'
			: t.type === 'success'
				? '#22c55e'
				: t.type === 'undo'
					? '#00d8ff'
					: '#444444';

	return (
		<div
			role="status"
			aria-live="polite"
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '10px 14px',
				borderRadius: 8,
				background: bgColor,
				color: t.type === 'undo' || t.type === 'success' ? '#000' : '#fff',
				fontSize: 13,
				fontWeight: 500,
				boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
				transform: visible ? 'translateY(0)' : 'translateY(16px)',
				opacity: visible ? 1 : 0,
				transition: 'transform 200ms ease, opacity 200ms ease',
				maxWidth: 320
			}}
		>
			<span style={{ flex: 1 }}>{t.message}</span>
			{t.type === 'undo' && t.onUndo && (
				<button
					onClick={() => {
						t.onUndo?.();
						onDismiss(t.id);
					}}
					style={{
						background: 'rgba(0,0,0,0.2)',
						border: 'none',
						color: 'inherit',
						fontWeight: 600,
						padding: '2px 8px',
						borderRadius: 4,
						cursor: 'pointer',
						fontSize: 12
					}}
				>
					Undo
				</button>
			)}
			<button
				onClick={() => onDismiss(t.id)}
				aria-label="Dismiss"
				style={{
					background: 'transparent',
					border: 'none',
					color: 'inherit',
					opacity: 0.7,
					cursor: 'pointer',
					padding: '0 2px',
					fontSize: 16,
					lineHeight: 1
				}}
			>
				×
			</button>
		</div>
	);
}

/**
 * Renders active toasts. Mount once near your app root.
 *
 * @example
 * ```tsx
 * <ToastContainer />
 * ```
 */
export function ToastContainer() {
	const toasts = useToasts();

	if (toasts.length === 0) return null;

	return (
		<div
			aria-label="Notifications"
			style={{
				position: 'fixed',
				bottom: 24,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				zIndex: 9999,
				pointerEvents: 'none'
			}}
		>
			{toasts.map((t) => (
				<div key={t.id} style={{ pointerEvents: 'all' }}>
					<ToastItem toast={t} onDismiss={(id) => toastStore.removeToast(id)} />
				</div>
			))}
		</div>
	);
}
