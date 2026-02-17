<script lang="ts">
	import type { ConversationStore } from './ConversationStore.svelte.js';
	import type { ConversationListItem } from './types.js';

	interface Props {
		store: ConversationStore;
		onSelect: (id: string) => void;
		class?: string;
	}

	let { store, onSelect, class: className = '' }: Props = $props();

	const conversations = $derived(store.conversations);
	let editingId = $state<string | null>(null);
	let editingTitle = $state('');

	// Group conversations by date
	const grouped = $derived.by(() => {
		const now = Date.now();
		const day = 24 * 60 * 60 * 1000;

		const today: ConversationListItem[] = [];
		const yesterday: ConversationListItem[] = [];
		const lastWeek: ConversationListItem[] = [];
		const older: ConversationListItem[] = [];

		for (const conv of conversations) {
			const age = now - conv.updatedAt;

			if (age < day) {
				today.push(conv);
			} else if (age < 2 * day) {
				yesterday.push(conv);
			} else if (age < 7 * day) {
				lastWeek.push(conv);
			} else {
				older.push(conv);
			}
		}

		return { today, yesterday, lastWeek, older };
	});

	function handleSelect(id: string) {
		if (editingId === id) return; // Don't select while editing
		onSelect(id);
	}

	function handleKeydown(id: string, event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect(id);
		}
	}

	function handleDelete(id: string, event: Event) {
		event.stopPropagation();

		const conv = conversations.find((c) => c.id === id);
		const confirmed = confirm(`Delete "${conv?.title ?? 'this conversation'}"?`);

		if (confirmed) {
			store.delete(id);
		}
	}

	function startEdit(id: string, currentTitle: string, event: Event) {
		event.stopPropagation();
		editingId = id;
		editingTitle = currentTitle;
	}

	function saveEdit() {
		if (editingId && editingTitle.trim()) {
			store.rename(editingId, editingTitle.trim());
		}
		editingId = null;
		editingTitle = '';
	}

	function cancelEdit() {
		editingId = null;
		editingTitle = '';
	}

	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minute = 60 * 1000;
		const hour = 60 * minute;
		const day = 24 * hour;

		if (diff < minute) return 'Just now';
		if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
		if (diff < day) return `${Math.floor(diff / hour)}h ago`;
		if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

		return new Date(timestamp).toLocaleDateString();
	}
</script>

<div class="chat-list {className}">
	<div class="list">
		{#if conversations.length === 0}
			<div class="empty">
				<p>No conversations yet.</p>
				<p class="empty-hint">Start your first chat!</p>
			</div>
		{:else}
			{#if grouped.today.length > 0}
				<div class="group">
					<h3 class="group-title">Today</h3>
					{#each grouped.today as conv (conv.id)}
						<div
							class="item"
							role="button"
							tabindex="0"
							onclick={() => handleSelect(conv.id)}
							onkeydown={(e) => handleKeydown(conv.id, e)}
						>
							{#if editingId === conv.id}
								<input
									type="text"
									class="edit-input"
									bind:value={editingTitle}
									onblur={saveEdit}
									onkeydown={(e) => {
										if (e.key === 'Enter') saveEdit();
										if (e.key === 'Escape') cancelEdit();
									}}
									onclick={(e) => e.stopPropagation()}
								/>
							{:else}
								<div class="item-content">
									<div class="item-title">{conv.title}</div>
									<div class="item-meta">
										<span>{conv.nodeCount} {conv.nodeCount === 1 ? 'node' : 'nodes'}</span>
										<span class="meta-sep">·</span>
										<span>{formatRelativeTime(conv.updatedAt)}</span>
									</div>
									{#if conv.preview}
										<div class="item-preview">{conv.preview}</div>
									{/if}
								</div>
								<div class="item-actions">
									<button
										type="button"
										class="action-btn"
										title="Rename"
										onclick={(e) => startEdit(conv.id, conv.title, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"
												fill="currentColor"
											/>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn delete"
										title="Delete"
										onclick={(e) => handleDelete(conv.id, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
												fill="currentColor"
											/>
											<path
												d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
												fill="currentColor"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if grouped.yesterday.length > 0}
				<div class="group">
					<h3 class="group-title">Yesterday</h3>
					{#each grouped.yesterday as conv (conv.id)}
						<div
							class="item"
							role="button"
							tabindex="0"
							onclick={() => handleSelect(conv.id)}
							onkeydown={(e) => handleKeydown(conv.id, e)}
						>
							{#if editingId === conv.id}
								<input
									type="text"
									class="edit-input"
									bind:value={editingTitle}
									onblur={saveEdit}
									onkeydown={(e) => {
										if (e.key === 'Enter') saveEdit();
										if (e.key === 'Escape') cancelEdit();
									}}
									onclick={(e) => e.stopPropagation()}
								/>
							{:else}
								<div class="item-content">
									<div class="item-title">{conv.title}</div>
									<div class="item-meta">
										<span>{conv.nodeCount} {conv.nodeCount === 1 ? 'node' : 'nodes'}</span>
										<span class="meta-sep">·</span>
										<span>{formatRelativeTime(conv.updatedAt)}</span>
									</div>
									{#if conv.preview}
										<div class="item-preview">{conv.preview}</div>
									{/if}
								</div>
								<div class="item-actions">
									<button
										type="button"
										class="action-btn"
										title="Rename"
										onclick={(e) => startEdit(conv.id, conv.title, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"
												fill="currentColor"
											/>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn delete"
										title="Delete"
										onclick={(e) => handleDelete(conv.id, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
												fill="currentColor"
											/>
											<path
												d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
												fill="currentColor"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if grouped.lastWeek.length > 0}
				<div class="group">
					<h3 class="group-title">Last 7 days</h3>
					{#each grouped.lastWeek as conv (conv.id)}
						<div
							class="item"
							role="button"
							tabindex="0"
							onclick={() => handleSelect(conv.id)}
							onkeydown={(e) => handleKeydown(conv.id, e)}
						>
							{#if editingId === conv.id}
								<input
									type="text"
									class="edit-input"
									bind:value={editingTitle}
									onblur={saveEdit}
									onkeydown={(e) => {
										if (e.key === 'Enter') saveEdit();
										if (e.key === 'Escape') cancelEdit();
									}}
									onclick={(e) => e.stopPropagation()}
								/>
							{:else}
								<div class="item-content">
									<div class="item-title">{conv.title}</div>
									<div class="item-meta">
										<span>{conv.nodeCount} {conv.nodeCount === 1 ? 'node' : 'nodes'}</span>
										<span class="meta-sep">·</span>
										<span>{formatRelativeTime(conv.updatedAt)}</span>
									</div>
									{#if conv.preview}
										<div class="item-preview">{conv.preview}</div>
									{/if}
								</div>
								<div class="item-actions">
									<button
										type="button"
										class="action-btn"
										title="Rename"
										onclick={(e) => startEdit(conv.id, conv.title, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"
												fill="currentColor"
											/>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn delete"
										title="Delete"
										onclick={(e) => handleDelete(conv.id, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
												fill="currentColor"
											/>
											<path
												d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
												fill="currentColor"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if grouped.older.length > 0}
				<div class="group">
					<h3 class="group-title">Older</h3>
					{#each grouped.older as conv (conv.id)}
						<div
							class="item"
							role="button"
							tabindex="0"
							onclick={() => handleSelect(conv.id)}
							onkeydown={(e) => handleKeydown(conv.id, e)}
						>
							{#if editingId === conv.id}
								<input
									type="text"
									class="edit-input"
									bind:value={editingTitle}
									onblur={saveEdit}
									onkeydown={(e) => {
										if (e.key === 'Enter') saveEdit();
										if (e.key === 'Escape') cancelEdit();
									}}
									onclick={(e) => e.stopPropagation()}
								/>
							{:else}
								<div class="item-content">
									<div class="item-title">{conv.title}</div>
									<div class="item-meta">
										<span>{conv.nodeCount} {conv.nodeCount === 1 ? 'node' : 'nodes'}</span>
										<span class="meta-sep">·</span>
										<span>{formatRelativeTime(conv.updatedAt)}</span>
									</div>
									{#if conv.preview}
										<div class="item-preview">{conv.preview}</div>
									{/if}
								</div>
								<div class="item-actions">
									<button
										type="button"
										class="action-btn"
										title="Rename"
										onclick={(e) => startEdit(conv.id, conv.title, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"
												fill="currentColor"
											/>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn delete"
										title="Delete"
										onclick={(e) => handleDelete(conv.id, e)}
									>
										<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
												fill="currentColor"
											/>
											<path
												d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
												fill="currentColor"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.chat-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--traek-chatlist-bg, #0b0b0b);
		color: var(--traek-chatlist-text, #e4e4e7);
		font-family: system-ui, sans-serif;
	}

	.header {
		padding: 1rem;
		border-bottom: 1px solid var(--traek-chatlist-border, rgba(255, 255, 255, 0.1));
	}

	.new-chat {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.65rem 1rem;
		background: var(--traek-chatlist-new-bg, rgba(255, 255, 255, 0.1));
		color: var(--traek-chatlist-new-text, #fafafa);
		border: 1px solid var(--traek-chatlist-new-border, rgba(255, 255, 255, 0.15));
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.new-chat:hover {
		background: var(--traek-chatlist-new-bg-hover, rgba(255, 255, 255, 0.16));
		border-color: var(--traek-chatlist-new-border-hover, rgba(255, 255, 255, 0.22));
	}

	.new-chat svg {
		width: 1rem;
		height: 1rem;
	}

	.list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.empty {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--traek-chatlist-empty-text, #71717a);
	}

	.empty p {
		margin: 0 0 0.5rem 0;
	}

	.empty-hint {
		font-size: 0.85rem;
		font-style: italic;
	}

	.group {
		margin-bottom: 1.5rem;
	}

	.group-title {
		margin: 0 0 0.5rem 0;
		padding: 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--traek-chatlist-group-title, #a1a1aa);
	}

	.item {
		display: flex;
		align-items: stretch;
		padding: 0.75rem 0.75rem;
		margin-bottom: 0.25rem;
		background: var(--traek-chatlist-item-bg, rgba(24, 24, 27, 0.6));
		border: 1px solid var(--traek-chatlist-item-border, rgba(255, 255, 255, 0.08));
		border-radius: 0.375rem;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.item:hover {
		background: var(--traek-chatlist-item-bg-hover, rgba(39, 39, 42, 0.8));
		border-color: var(--traek-chatlist-item-border-hover, rgba(255, 255, 255, 0.14));
	}

	.item:hover .item-actions {
		opacity: 1;
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--traek-chatlist-item-title, #fafafa);
		margin-bottom: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		font-size: 0.75rem;
		color: var(--traek-chatlist-item-meta, #a1a1aa);
		margin-bottom: 0.25rem;
	}

	.meta-sep {
		margin: 0 0.35em;
		opacity: 0.7;
	}

	.item-preview {
		font-size: 0.8rem;
		color: var(--traek-chatlist-item-preview, #d4d4d8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.5rem;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: none;
		color: var(--traek-chatlist-action-text, #a1a1aa);
		cursor: pointer;
		border-radius: 0.25rem;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.action-btn:hover {
		background: var(--traek-chatlist-action-bg-hover, rgba(255, 255, 255, 0.1));
		color: var(--traek-chatlist-action-text-hover, #fafafa);
	}

	.action-btn.delete:hover {
		background: var(--traek-chatlist-delete-bg-hover, rgba(239, 68, 68, 0.2));
		color: var(--traek-chatlist-delete-text-hover, #f87171);
	}

	.action-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.edit-input {
		flex: 1;
		padding: 0.4rem 0.5rem;
		background: var(--traek-chatlist-edit-bg, rgba(0, 0, 0, 0.4));
		color: var(--traek-chatlist-edit-text, #fafafa);
		border: 1px solid var(--traek-chatlist-edit-border, rgba(255, 255, 255, 0.2));
		border-radius: 0.25rem;
		font-size: 0.9rem;
		font-weight: 600;
		outline: none;
	}

	.edit-input:focus {
		border-color: var(--traek-chatlist-edit-border-focus, rgba(255, 255, 255, 0.4));
	}
</style>
