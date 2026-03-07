import React, { useCallback, useEffect, useRef } from 'react';
import type { TraekEngine } from '@traek/core';
import { useTraekEngine } from '../hooks/useTraekEngine.js';

export interface SearchBarProps {
	engine: TraekEngine;
	placeholder?: string;
	onClose?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Search bar that integrates with TraekEngine's built-in search.
 * Renders an input and prev/next controls.
 */
export function SearchBar({
	engine,
	placeholder = 'Search...',
	onClose,
	className,
	style
}: SearchBarProps) {
	const state = useTraekEngine(engine);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Escape') {
				engine.clearSearch();
				onClose?.();
			} else if (e.key === 'Enter') {
				if (e.shiftKey) {
					engine.previousSearchMatch();
				} else {
					engine.nextSearchMatch();
				}
				e.preventDefault();
			}
		},
		[engine, onClose]
	);

	const matchCount = state.searchMatches.length;
	const currentIdx = state.currentSearchIndex;

	return (
		<div
			className={className}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 6,
				padding: '6px 10px',
				background: 'var(--traek-node-bg, #1a1a1a)',
				border: '1px solid var(--traek-node-border, #333)',
				borderRadius: 8,
				boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
				...style
			}}
		>
			<input
				ref={inputRef}
				value={state.searchQuery}
				onChange={(e) => engine.searchNodesMethod(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				aria-label="Search conversation"
				style={{
					background: 'transparent',
					border: 'none',
					color: 'var(--traek-node-text, #ddd)',
					fontSize: 13,
					outline: 'none',
					flex: 1,
					minWidth: 120
				}}
			/>
			{matchCount > 0 && (
				<span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
					{currentIdx + 1}/{matchCount}
				</span>
			)}
			{state.searchQuery && matchCount === 0 && (
				<span style={{ fontSize: 11, color: '#ff6b4a' }}>No matches</span>
			)}
			<button
				onClick={() => engine.previousSearchMatch()}
				disabled={matchCount === 0}
				title="Previous match (Shift+Enter)"
				aria-label="Previous match"
				style={navBtnStyle}
			>
				↑
			</button>
			<button
				onClick={() => engine.nextSearchMatch()}
				disabled={matchCount === 0}
				title="Next match (Enter)"
				aria-label="Next match"
				style={navBtnStyle}
			>
				↓
			</button>
			<button
				onClick={() => {
					engine.clearSearch();
					onClose?.();
				}}
				title="Close search (Escape)"
				aria-label="Close search"
				style={{ ...navBtnStyle, opacity: 0.6 }}
			>
				×
			</button>
		</div>
	);
}

const navBtnStyle: React.CSSProperties = {
	background: 'transparent',
	border: 'none',
	color: 'var(--traek-node-text, #ddd)',
	cursor: 'pointer',
	fontSize: 14,
	padding: '2px 4px',
	borderRadius: 4,
	lineHeight: 1
};
