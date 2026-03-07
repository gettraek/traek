import React, { useCallback, useRef, useState } from 'react';
import type { TraekEngine } from '@traek/core';
import { getNodeTags, getTagConfig, PREDEFINED_TAGS } from './tagUtils.js';

export { getNodeTags, getTagConfig, matchesTagFilter, PREDEFINED_TAGS } from './tagUtils.js';
export type { TagConfig } from './tagUtils.js';

// ---------------------------------------------------------------------------
// TagBadges
// ---------------------------------------------------------------------------

export interface TagBadgesProps {
	nodeId: string;
	engine: TraekEngine;
	editable?: boolean;
}

/** Display tags attached to a node as colored badges. */
export function TagBadges({ nodeId, engine, editable = false }: TagBadgesProps) {
	const node = engine.getNode(nodeId);
	const tags = node ? getNodeTags(node) : [];

	const removeTag = useCallback(
		(tag: string) => {
			const n = engine.getNode(nodeId);
			if (!n) return;
			const current = getNodeTags(n).filter((t) => t !== tag);
			engine.updateNode(nodeId, { metadata: { x: 0, y: 0, ...n.metadata, tags: current } });
		},
		[nodeId, engine]
	);

	if (tags.length === 0) return null;

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
			{tags.map((tag) => {
				const cfg = getTagConfig(tag);
				return (
					<span
						key={tag}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 4,
							padding: '2px 8px',
							borderRadius: 12,
							fontSize: 11,
							fontWeight: 500,
							color: cfg.color,
							background: cfg.bgColor,
							border: `1px solid ${cfg.color}33`
						}}
					>
						{cfg.label}
						{editable && (
							<button
								onClick={() => removeTag(tag)}
								aria-label={`Remove ${cfg.label} tag`}
								style={{
									background: 'transparent',
									border: 'none',
									color: 'inherit',
									cursor: 'pointer',
									padding: 0,
									lineHeight: 1,
									fontSize: 12,
									opacity: 0.7
								}}
							>
								×
							</button>
						)}
					</span>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// TagDropdown
// ---------------------------------------------------------------------------

export interface TagDropdownProps {
	nodeId: string;
	engine: TraekEngine;
	onClose?: () => void;
}

/** Dropdown for adding/removing tags on a node. */
export function TagDropdown({ nodeId, engine, onClose }: TagDropdownProps) {
	const node = engine.getNode(nodeId);
	const currentTags = node ? getNodeTags(node) : [];
	const [customInput, setCustomInput] = useState('');

	const toggleTag = useCallback(
		(tag: string) => {
			const n = engine.getNode(nodeId);
			if (!n) return;
			const tags = getNodeTags(n);
			const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
			engine.updateNode(nodeId, { metadata: { x: 0, y: 0, ...n.metadata, tags: next } });
		},
		[nodeId, engine]
	);

	const addCustom = useCallback(() => {
		const val = customInput.trim().toLowerCase().replace(/\s+/g, '-');
		if (!val) return;
		const n = engine.getNode(nodeId);
		if (!n) return;
		const tags = getNodeTags(n);
		if (!tags.includes(val)) {
			engine.updateNode(nodeId, { metadata: { x: 0, y: 0, ...n.metadata, tags: [...tags, val] } });
		}
		setCustomInput('');
	}, [customInput, nodeId, engine]);

	return (
		<div
			style={{
				background: 'var(--traek-node-bg, #1a1a1a)',
				border: '1px solid var(--traek-node-border, #333)',
				borderRadius: 8,
				padding: 12,
				minWidth: 180,
				boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
			}}
		>
			<div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontWeight: 600 }}>Tags</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
				{Object.entries(PREDEFINED_TAGS).map(([key, cfg]) => {
					const active = currentTags.includes(key);
					return (
						<button
							key={key}
							onClick={() => toggleTag(key)}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: '4px 8px',
								borderRadius: 6,
								border: 'none',
								background: active ? cfg.bgColor : 'transparent',
								color: active ? cfg.color : '#aaa',
								cursor: 'pointer',
								textAlign: 'left',
								fontSize: 12
							}}
						>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: '50%',
									background: cfg.color,
									flexShrink: 0
								}}
							/>
							{cfg.label}
							{active && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>✓</span>}
						</button>
					);
				})}
			</div>
			<div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
				<input
					value={customInput}
					onChange={(e) => setCustomInput(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && addCustom()}
					placeholder="Custom tag..."
					style={{
						flex: 1,
						padding: '4px 8px',
						borderRadius: 6,
						border: '1px solid #444',
						background: '#111',
						color: '#ddd',
						fontSize: 12,
						outline: 'none'
					}}
				/>
				<button
					onClick={addCustom}
					style={{
						padding: '4px 8px',
						borderRadius: 6,
						border: 'none',
						background: '#333',
						color: '#ddd',
						cursor: 'pointer',
						fontSize: 12
					}}
				>
					Add
				</button>
			</div>
			{onClose && (
				<button
					onClick={onClose}
					style={{
						display: 'block',
						width: '100%',
						marginTop: 8,
						padding: '4px',
						borderRadius: 6,
						border: '1px solid #333',
						background: 'transparent',
						color: '#666',
						cursor: 'pointer',
						fontSize: 11
					}}
				>
					Close
				</button>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// TagFilter
// ---------------------------------------------------------------------------

export interface TagFilterProps {
	activeTags: string[];
	onChange: (tags: string[]) => void;
}

/** Filter bar for selecting which tags to show. */
export function TagFilter({ activeTags, onChange }: TagFilterProps) {
	const toggle = (tag: string) => {
		onChange(activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag]);
	};

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
			<span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Filter:</span>
			{Object.entries(PREDEFINED_TAGS).map(([key, cfg]) => {
				const active = activeTags.includes(key);
				return (
					<button
						key={key}
						onClick={() => toggle(key)}
						style={{
							padding: '3px 10px',
							borderRadius: 12,
							border: `1px solid ${active ? cfg.color : '#333'}`,
							background: active ? cfg.bgColor : 'transparent',
							color: active ? cfg.color : '#666',
							cursor: 'pointer',
							fontSize: 11,
							fontWeight: 500
						}}
					>
						{cfg.label}
					</button>
				);
			})}
			{activeTags.length > 0 && (
				<button
					onClick={() => onChange([])}
					style={{
						padding: '3px 10px',
						borderRadius: 12,
						border: '1px solid #555',
						background: 'transparent',
						color: '#888',
						cursor: 'pointer',
						fontSize: 11
					}}
				>
					Clear
				</button>
			)}
		</div>
	);
}
