<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { ConversationSnapshot } from '@traek/core';
	import {
		generateReport,
		reportToJson,
		reportToMarkdown,
		reportToCsv,
		type AnalyticsReport
	} from '@traek/analytics';

	// ── Props ─────────────────────────────────────────────────────────────────

	let {
		snapshot,
		onClose
	}: {
		snapshot: ConversationSnapshot;
		onClose: () => void;
	} = $props();

	// ── Report computation ────────────────────────────────────────────────────

	const report = $derived<AnalyticsReport>(generateReport(snapshot));

	// ── Tab state ─────────────────────────────────────────────────────────────

	type Tab = 'overview' | 'topology' | 'heatmap' | 'flow' | 'content' | 'export';
	let activeTab = $state<Tab>('overview');

	const tabs: { id: Tab; label: string; icon: string }[] = [
		{ id: 'overview', label: 'Overview', icon: '◎' },
		{ id: 'topology', label: 'Topology', icon: '⌥' },
		{ id: 'heatmap', label: 'Heatmap', icon: '◈' },
		{ id: 'flow', label: 'Flow', icon: '⇌' },
		{ id: 'content', label: 'Content', icon: '≡' },
		{ id: 'export', label: 'Export', icon: '↓' }
	];

	// ── Derived analytics values ──────────────────────────────────────────────

	const engagementColor = $derived(
		report.engagement.score >= 70
			? '#22d3a0'
			: report.engagement.score >= 40
				? '#f59e0b'
				: '#f87171'
	);

	const engagementLabel = $derived(
		report.engagement.score >= 70 ? 'Rich' : report.engagement.score >= 40 ? 'Moderate' : 'Sparse'
	);

	// Topology tree: compute a simplified tree layout for visual representation
	const topologyBranches = $derived(
		report.flow.branches
			.slice()
			.sort((a, b) => b.length - a.length)
			.slice(0, 12)
	);

	const maxBranchLength = $derived(Math.max(1, ...topologyBranches.map((b) => b.length)));

	// Heatmap: top 10 hottest nodes
	const topHeatNodes = $derived(report.heatmap.nodes.slice(0, 10));
	const maxIntensity = $derived(Math.max(0.001, topHeatNodes[0]?.intensity ?? 1));

	// Flow paths: most-explored branches
	const topFlowBranches = $derived(
		report.flow.branches
			.slice()
			.sort((a, b) => {
				const ia = report.heatmap.branches.find((h) => h.branchIndex === a.index)?.intensity ?? 0;
				const ib = report.heatmap.branches.find((h) => h.branchIndex === b.index)?.intensity ?? 0;
				return ib - ia;
			})
			.slice(0, 6)
	);

	// Content by role
	const roleColors = { user: '#00d8ff', assistant: '#ff4400', system: '#a78bfa' };
	const totalChars = $derived(
		report.engagement.contentByRole.user.totalChars +
			report.engagement.contentByRole.assistant.totalChars +
			report.engagement.contentByRole.system.totalChars
	);

	// ── Export ────────────────────────────────────────────────────────────────

	let exportFormat = $state<'json' | 'markdown' | 'csv'>('markdown');

	function downloadReport() {
		let content: string;
		let filename: string;
		let mime: string;
		const title = report.snapshotTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();

		if (exportFormat === 'json') {
			content = reportToJson(report);
			filename = `traek-report-${title}.json`;
			mime = 'application/json';
		} else if (exportFormat === 'csv') {
			content = reportToCsv(report);
			filename = `traek-report-${title}.csv`;
			mime = 'text/csv';
		} else {
			content = reportToMarkdown(report);
			filename = `traek-report-${title}.md`;
			mime = 'text/markdown';
		}

		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Keyboard ──────────────────────────────────────────────────────────────

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const idx = tabs.findIndex((t) => t.id === activeTab);
			if (e.key === 'ArrowRight') activeTab = tabs[(idx + 1) % tabs.length].id;
			else activeTab = tabs[(idx - 1 + tabs.length) % tabs.length].id;
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function formatMs(ms: number | null): string {
		if (ms === null) return 'n/a';
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function pct(n: number): string {
		return `${Math.round(n * 100)}%`;
	}

	function heatColor(intensity: number): string {
		// cool → warm gradient: #00d8ff → #ff4400
		const r = Math.round(0 + intensity * 255);
		const g = Math.round(216 - intensity * 216);
		const b = Math.round(255 - intensity * 255);
		return `rgb(${r}, ${g}, ${b})`;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<div
	class="backdrop"
	role="presentation"
	transition:fade={{ duration: 180 }}
	onclick={onClose}
></div>

<!-- Dialog -->
<div
	class="dialog"
	role="dialog"
	aria-modal="true"
	aria-labelledby="insights-title"
	tabindex="-1"
	transition:fly={{ y: 24, duration: 260 }}
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => e.stopPropagation()}
>
	<!-- Header -->
	<div class="dialog-header">
		<div class="dialog-title-row">
			<span class="dialog-icon" aria-hidden="true">◎</span>
			<h2 id="insights-title" class="dialog-title">Conversation Insights</h2>
			<span class="dialog-subtitle">{report.snapshotTitle}</span>
		</div>
		<button type="button" class="close-btn" onclick={onClose} aria-label="Close insights dashboard">
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
				<path
					d="M4 4L14 14M14 4L4 14"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>

	<!-- Tab bar -->
	<div class="tab-bar" role="tablist" aria-label="Dashboard sections">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				class="tab-btn"
				class:active={activeTab === tab.id}
				aria-selected={activeTab === tab.id}
				aria-controls="panel-{tab.id}"
				id="tab-{tab.id}"
				onclick={() => (activeTab = tab.id)}
			>
				<span class="tab-icon" aria-hidden="true">{tab.icon}</span>
				<span class="tab-label">{tab.label}</span>
			</button>
		{/each}
	</div>

	<!-- Panel content -->
	<div class="panel" id="panel-{activeTab}" role="tabpanel" aria-labelledby="tab-{activeTab}">
		<!-- ── Overview ───────────────────────────────────────────────────────── -->
		{#if activeTab === 'overview'}
			<div class="overview-grid">
				<!-- Engagement score card -->
				<div class="score-card">
					<div
						class="score-ring"
						style="--score-pct: {report.engagement.score}%; --score-color: {engagementColor}"
					>
						<svg class="score-svg" viewBox="0 0 80 80" aria-hidden="true">
							<circle class="score-track" cx="40" cy="40" r="32" />
							<circle
								class="score-fill"
								cx="40"
								cy="40"
								r="32"
								stroke-dasharray="201.06"
								stroke-dashoffset={201.06 - (201.06 * report.engagement.score) / 100}
								style="stroke: {engagementColor}"
							/>
						</svg>
						<div class="score-inner">
							<span class="score-value">{report.engagement.score}</span>
							<span class="score-unit">/100</span>
						</div>
					</div>
					<div class="score-info">
						<span class="score-label" style="color: {engagementColor}">{engagementLabel}</span>
						<span class="score-desc">Engagement Score</span>
					</div>
				</div>

				<!-- Key stats grid -->
				<div class="stats-grid">
					{#each [{ label: 'Total nodes', value: report.flow.nodeCount, unit: '' }, { label: 'Branches', value: report.flow.branchCount, unit: '' }, { label: 'Max depth', value: report.flow.maxDepth, unit: '' }, { label: 'Avg response', value: formatMs(report.flow.avgResponseTimeMs), unit: '' }, { label: 'User turns', value: report.flow.countByRole.user, unit: '' }, { label: 'Asst turns', value: report.flow.countByRole.assistant, unit: '' }, { label: 'Deep answers', value: pct(report.engagement.deepAnswerRate), unit: '' }, { label: 'Code nodes', value: report.engagement.codeNodeCount, unit: '' }] as stat (stat.label)}
						<div class="stat-cell">
							<span class="stat-value">{stat.value}</span>
							<span class="stat-label">{stat.label}</span>
						</div>
					{/each}
				</div>

				<!-- Content role breakdown bar -->
				<div class="role-bar-section">
					<h3 class="section-heading">Content by role</h3>
					<div
						class="role-bar"
						role="img"
						aria-label="Content distribution: user {pct(
							report.engagement.contentByRole.user.totalChars / Math.max(1, totalChars)
						)}, assistant {pct(
							report.engagement.contentByRole.assistant.totalChars / Math.max(1, totalChars)
						)}"
					>
						{#each ['user', 'assistant', 'system'] as const as role (role)}
							{#if report.engagement.contentByRole[role].totalChars > 0}
								<div
									class="role-bar-segment"
									style="width: {pct(
										report.engagement.contentByRole[role].totalChars / Math.max(1, totalChars)
									)}; background: {roleColors[role]}"
									title="{role}: {report.engagement.contentByRole[role].totalChars} chars"
								></div>
							{/if}
						{/each}
					</div>
					<div class="role-legend">
						{#each ['user', 'assistant', 'system'] as const as role (role)}
							<span class="role-legend-item">
								<span class="role-dot" style="background: {roleColors[role]}"></span>
								{role}
								<span class="role-pct"
									>{pct(
										report.engagement.contentByRole[role].totalChars / Math.max(1, totalChars)
									)}</span
								>
							</span>
						{/each}
					</div>
				</div>

				<!-- Quick insights -->
				<div class="insights-list">
					<h3 class="section-heading">Key insights</h3>
					<ul class="insight-items" aria-label="Key insights">
						{#if report.engagement.branchingRate > 0.2}
							<li class="insight-item insight-item--positive">
								<span aria-hidden="true">◆</span> High exploration rate — {pct(
									report.engagement.branchingRate
								)} of nodes branch
							</li>
						{/if}
						{#if report.engagement.deepAnswerRate > 0.5}
							<li class="insight-item insight-item--positive">
								<span aria-hidden="true">◆</span>
								{pct(report.engagement.deepAnswerRate)} of assistant replies are in-depth
							</li>
						{/if}
						{#if report.engagement.codeNodeCount > 0}
							<li class="insight-item insight-item--neutral">
								<span aria-hidden="true">◇</span>
								{report.engagement.codeNodeCount} code block{report.engagement.codeNodeCount !== 1
									? 's'
									: ''} detected
							</li>
						{/if}
						{#if report.heatmap.hottestNodeId}
							<li class="insight-item insight-item--neutral">
								<span aria-hidden="true">◇</span> Hottest node:
								<code class="insight-code">{report.heatmap.hottestNodeId.slice(0, 8)}…</code>
							</li>
						{/if}
						{#if report.flow.avgResponseTimeMs !== null && report.flow.avgResponseTimeMs > 5000}
							<li class="insight-item insight-item--warning">
								<span aria-hidden="true">◈</span> Avg response time {formatMs(
									report.flow.avgResponseTimeMs
								)} — possibly slow model
							</li>
						{/if}
						{#if report.engagement.uniqueTags.length > 0}
							<li class="insight-item insight-item--neutral">
								<span aria-hidden="true">◇</span> Tags: {report.engagement.uniqueTags
									.slice(0, 5)
									.join(', ')}{report.engagement.uniqueTags.length > 5
									? ` +${report.engagement.uniqueTags.length - 5} more`
									: ''}
							</li>
						{/if}
					</ul>
				</div>
			</div>

			<!-- ── Topology ───────────────────────────────────────────────────────── -->
		{:else if activeTab === 'topology'}
			<div class="topology-view">
				<div class="topology-meta">
					<span class="topo-stat"><strong>{report.flow.nodeCount}</strong> nodes</span>
					<span class="topo-sep" aria-hidden="true">·</span>
					<span class="topo-stat"><strong>{report.flow.branchCount}</strong> branches</span>
					<span class="topo-sep" aria-hidden="true">·</span>
					<span class="topo-stat">depth <strong>{report.flow.maxDepth}</strong></span>
					<span class="topo-sep" aria-hidden="true">·</span>
					<span class="topo-stat"
						>avg branch factor <strong>{report.flow.avgBranchingFactor.toFixed(1)}</strong></span
					>
				</div>

				<!-- Branch length bar chart -->
				<div
					class="topo-chart"
					role="img"
					aria-label="Branch length chart showing {topologyBranches.length} branches"
				>
					<h3 class="section-heading">Branch lengths (top {topologyBranches.length})</h3>
					<div class="branch-bars">
						{#each topologyBranches as branch, i (branch.index)}
							<div class="branch-row">
								<span class="branch-label">B{branch.index + 1}</span>
								<div class="branch-track">
									<div
										class="branch-fill"
										style="width: {(branch.length / maxBranchLength) *
											100}%; --branch-color: {heatColor(branch.length / maxBranchLength)}"
										role="meter"
										aria-valuenow={branch.length}
										aria-valuemin={0}
										aria-valuemax={maxBranchLength}
										aria-label="Branch {i + 1} length: {branch.length} nodes"
									></div>
									<span class="branch-count">{branch.length} nodes</span>
								</div>
								<div class="branch-pills">
									<span class="branch-pill branch-pill--user" title="User turns"
										>{branch.userTurns}u</span
									>
									<span class="branch-pill branch-pill--asst" title="Assistant turns"
										>{branch.assistantTurns}a</span
									>
									{#if branch.durationMs !== null}
										<span class="branch-pill branch-pill--time" title="Duration"
											>{formatMs(branch.durationMs)}</span
										>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Depth distribution -->
				<div class="depth-section">
					<h3 class="section-heading">Depth distribution</h3>
					<div class="depth-stats">
						<div class="depth-stat">
							<span class="depth-value">{report.flow.maxDepth}</span>
							<span class="depth-desc">max depth</span>
						</div>
						<div class="depth-stat">
							<span class="depth-value">{report.flow.avgDepth.toFixed(1)}</span>
							<span class="depth-desc">avg depth</span>
						</div>
						<div class="depth-stat">
							<span class="depth-value">{report.flow.branchingNodeCount}</span>
							<span class="depth-desc">branching nodes</span>
						</div>
						<div class="depth-stat">
							<span class="depth-value">{report.flow.leafCount}</span>
							<span class="depth-desc">leaf nodes</span>
						</div>
					</div>
				</div>
			</div>

			<!-- ── Heatmap ────────────────────────────────────────────────────────── -->
		{:else if activeTab === 'heatmap'}
			<div class="heatmap-view">
				<p class="heatmap-intro">
					Node heat is based on branch coverage — how many conversation paths pass through each
					node. Hotter nodes are central junctions; cooler nodes are unique to a single branch.
				</p>

				<div class="heatmap-highlights">
					{#if report.heatmap.hottestNodeId}
						<div class="heat-highlight heat-highlight--hot">
							<span class="heat-highlight-icon" aria-hidden="true">◈</span>
							<div>
								<span class="heat-highlight-label">Hottest node</span>
								<code class="heat-highlight-id">{report.heatmap.hottestNodeId.slice(0, 8)}…</code>
							</div>
						</div>
					{/if}
					{#if report.heatmap.coldestLeafId}
						<div class="heat-highlight heat-highlight--cold">
							<span class="heat-highlight-icon" aria-hidden="true">◇</span>
							<div>
								<span class="heat-highlight-label">Least explored leaf</span>
								<code class="heat-highlight-id">{report.heatmap.coldestLeafId.slice(0, 8)}…</code>
							</div>
						</div>
					{/if}
				</div>

				<!-- Node heat grid -->
				<h3 class="section-heading">Top nodes by exploration intensity</h3>
				<div class="heat-grid" role="list" aria-label="Node heat cells">
					{#each topHeatNodes as cell (cell.nodeId)}
						<div
							class="heat-cell"
							role="listitem"
							style="--heat: {cell.intensity / maxIntensity}"
							title="Node {cell.nodeId.slice(0, 8)} · intensity {pct(
								cell.intensity
							)} · depth {cell.depth}"
						>
							<div
								class="heat-cell-bar"
								style="background: {heatColor(cell.intensity / maxIntensity)}; opacity: 0.85"
							></div>
							<div class="heat-cell-content">
								<code class="heat-cell-id">{cell.nodeId.slice(0, 8)}…</code>
								<div class="heat-cell-meta">
									<span class="heat-cell-role" style="color: {roleColors[cell.role]}"
										>{cell.role}</span
									>
									<span class="heat-cell-depth">d{cell.depth}</span>
									<span class="heat-cell-branches">{cell.branchCoverage}b</span>
								</div>
								<div
									class="heat-cell-intensity"
									style="color: {heatColor(cell.intensity / maxIntensity)}"
								>
									{pct(cell.intensity)}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Legend -->
				<div class="heat-legend" aria-label="Heatmap color legend">
					<div class="heat-gradient" aria-hidden="true"></div>
					<div class="heat-legend-labels">
						<span>Cold (unique)</span>
						<span>Warm</span>
						<span>Hot (shared)</span>
					</div>
				</div>
			</div>

			<!-- ── Flow ───────────────────────────────────────────────────────────── -->
		{:else if activeTab === 'flow'}
			<div class="flow-view">
				<p class="flow-intro">
					Conversation flow shows the paths users took through the tree. Each branch is a unique
					root-to-leaf path. Explore which paths were most traversed and their relative lengths.
				</p>

				{#if topFlowBranches.length === 0}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true">⌥</span>
						<p>No branches found in this conversation.</p>
					</div>
				{:else}
					<div class="flow-list" role="list" aria-label="Conversation branches">
						{#each topFlowBranches as branch, i (branch.index)}
							{@const heatCell = report.heatmap.branches.find(
								(h) => h.branchIndex === branch.index
							)}
							{@const intensity = heatCell?.intensity ?? 0}
							<div class="flow-branch" role="listitem">
								<div class="flow-branch-header">
									<span class="flow-branch-rank">#{i + 1}</span>
									<span class="flow-branch-id">Branch {branch.index + 1}</span>
									<div
										class="flow-intensity-badge"
										style="background: {heatColor(intensity)}22; color: {heatColor(
											intensity
										)}; border-color: {heatColor(intensity)}44"
									>
										{pct(intensity)} heat
									</div>
								</div>

								<!-- Node path visualization -->
								<div class="flow-path" aria-label="Branch path with {branch.nodeIds.length} nodes">
									{#each branch.nodeIds.slice(0, 20) as nodeId (nodeId)}
										{@const nf = report.flow.nodes.find((n) => n.nodeId === nodeId)}
										{@const hn = report.heatmap.nodes.find((n) => n.nodeId === nodeId)}
										<div
											class="flow-node"
											class:flow-node--user={nf?.role === 'user'}
											class:flow-node--asst={nf?.role === 'assistant'}
											class:flow-node--system={nf?.role === 'system'}
											style="opacity: {0.4 + (hn?.intensity ?? 0) * 0.6}"
											title="{nf?.role ?? 'node'} · {nf?.contentLength ?? 0} chars"
										></div>
									{/each}
									{#if branch.nodeIds.length > 20}
										<span class="flow-overflow">+{branch.nodeIds.length - 20}</span>
									{/if}
								</div>

								<div class="flow-branch-stats">
									<span class="flow-stat">{branch.length} nodes</span>
									<span class="flow-stat">{branch.userTurns}u / {branch.assistantTurns}a</span>
									{#if branch.durationMs !== null}
										<span class="flow-stat">{formatMs(branch.durationMs)}</span>
									{/if}
									{#if branch.depth > 0}
										<span class="flow-stat">depth {branch.depth}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ── Content ────────────────────────────────────────────────────────── -->
		{:else if activeTab === 'content'}
			<div class="content-view">
				<p class="content-intro">
					Content analysis breaks down message lengths, response elaboration, and conversation
					velocity.
				</p>

				<!-- Role content cards -->
				<div class="content-role-grid">
					{#each ['user', 'assistant'] as const as role (role)}
						{@const stats = report.engagement.contentByRole[role]}
						<div class="content-role-card">
							<div class="content-role-header">
								<span class="content-role-dot" style="background: {roleColors[role]}"></span>
								<span class="content-role-name">{role}</span>
							</div>
							<div class="content-role-stats">
								<div class="content-stat">
									<span class="content-stat-value">{stats.avgLength.toFixed(0)}</span>
									<span class="content-stat-label">avg chars</span>
								</div>
								<div class="content-stat">
									<span class="content-stat-value">{stats.medianLength.toFixed(0)}</span>
									<span class="content-stat-label">median chars</span>
								</div>
								<div class="content-stat">
									<span class="content-stat-value">{stats.maxLength}</span>
									<span class="content-stat-label">max chars</span>
								</div>
								<div class="content-stat">
									<span class="content-stat-value">{(stats.totalChars / 1000).toFixed(1)}k</span>
									<span class="content-stat-label">total</span>
								</div>
							</div>
							<!-- Length bar -->
							<div class="content-bar-track" title="Response length relative to max">
								<div
									class="content-bar-fill"
									style="width: {pct(
										stats.avgLength /
											Math.max(
												1,
												report.engagement.contentByRole.assistant.maxLength,
												report.engagement.contentByRole.user.maxLength
											)
									)}; background: {roleColors[role]}"
								></div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Elaboration & velocity -->
				<div class="metrics-row">
					<div class="metric-card">
						<span class="metric-value"
							>{report.engagement.responseElaborationRatio.toFixed(2)}×</span
						>
						<span class="metric-label">elaboration ratio</span>
						<span class="metric-desc">assistant / user content length</span>
					</div>
					<div class="metric-card">
						<span class="metric-value">{pct(report.engagement.deepAnswerRate)}</span>
						<span class="metric-label">deep answer rate</span>
						<span class="metric-desc">replies &gt; 500 chars</span>
					</div>
					<div class="metric-card">
						<span class="metric-value">
							{report.engagement.nodesPerMinute !== null
								? `${report.engagement.nodesPerMinute.toFixed(1)}/min`
								: 'n/a'}
						</span>
						<span class="metric-label">velocity</span>
						<span class="metric-desc">nodes per minute</span>
					</div>
					<div class="metric-card">
						<span class="metric-value">{report.engagement.codeNodeCount}</span>
						<span class="metric-label">code blocks</span>
						<span class="metric-desc">nodes with ``` code</span>
					</div>
				</div>

				<!-- Tags -->
				{#if report.engagement.uniqueTags.length > 0}
					<div class="tags-section">
						<h3 class="section-heading">Tags found</h3>
						<div class="tags-list">
							{#each report.engagement.uniqueTags as tag (tag)}
								<span class="tag-chip">{tag}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- ── Export ─────────────────────────────────────────────────────────── -->
		{:else if activeTab === 'export'}
			<div class="export-view">
				<p class="export-intro">
					Download a full analytics report for this conversation. Choose your preferred format.
				</p>

				<fieldset class="format-fieldset">
					<legend class="format-legend">Report format</legend>
					<div class="format-options">
						{#each [{ value: 'markdown', label: 'Markdown', desc: 'Human-readable .md — great for docs and sharing', ext: '.md' }, { value: 'json', label: 'JSON', desc: 'Machine-readable — use with custom tooling', ext: '.json' }, { value: 'csv', label: 'CSV', desc: 'Spreadsheet-compatible — import into Excel or Sheets', ext: '.csv' }] as const as fmt (fmt.value)}
							<label class="format-option" class:selected={exportFormat === fmt.value}>
								<input
									type="radio"
									name="format"
									value={fmt.value}
									bind:group={exportFormat}
									class="format-radio"
								/>
								<div class="format-option-content">
									<span class="format-name">{fmt.label}</span>
									<span class="format-ext">{fmt.ext}</span>
									<span class="format-desc">{fmt.desc}</span>
								</div>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="export-summary">
					<h3 class="section-heading">What's included</h3>
					<ul class="export-includes">
						<li>Flow metrics (node count, branches, depth, response times)</li>
						<li>Engagement score &amp; analysis</li>
						<li>Heatmap data (top nodes, branch intensities)</li>
						<li>Content statistics by role</li>
						<li>Generation timestamp &amp; conversation title</li>
					</ul>
				</div>

				<button type="button" class="export-btn" onclick={downloadReport}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path
							d="M8 2v8M5 7l3 3 3-3M3 12h10"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Download {exportFormat.toUpperCase()} report
				</button>
			</div>
		{/if}
	</div>

	<!-- Footer: generation info -->
	<div class="dialog-footer">
		<span class="footer-meta">
			Generated at {new Date(report.generatedAt).toLocaleTimeString()} · @traek/analytics
		</span>
	</div>
</div>

<style>
	/* ── Layout ─────────────────────────────────────────────────────────────── */

	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--traek-overlay-gradient-1, rgba(0, 0, 0, 0.65));
		backdrop-filter: blur(6px);
		z-index: 200;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(96vw, 900px);
		height: min(88vh, 680px);
		background: var(--traek-overlay-card-bg, rgba(14, 14, 16, 0.97));
		border: 1px solid var(--traek-overlay-card-border, rgba(255, 255, 255, 0.07));
		border-radius: 20px;
		box-shadow: 0 24px 64px var(--traek-overlay-card-shadow, rgba(0, 0, 0, 0.85));
		display: flex;
		flex-direction: column;
		z-index: 201;
		overflow: hidden;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 24px 14px;
		border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.dialog-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.dialog-icon {
		font-size: 16px;
		color: var(--traek-input-button-bg, #00d8ff);
		flex-shrink: 0;
	}

	.dialog-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--traek-overlay-text, #e4e4e7);
		flex-shrink: 0;
	}

	.dialog-subtitle {
		font-size: 12px;
		color: var(--traek-thought-row-muted-1, #71717a);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--traek-thought-row-muted-1, #71717a);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
		flex-shrink: 0;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--traek-overlay-text, #e4e4e7);
	}

	.close-btn:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	/* ── Tab bar ─────────────────────────────────────────────────────────────── */

	.tab-bar {
		display: flex;
		gap: 2px;
		padding: 10px 24px 0;
		border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tab-bar::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: transparent;
		border: none;
		border-radius: 8px 8px 0 0;
		color: var(--traek-thought-row-muted-1, #71717a);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition:
			color 0.15s,
			background 0.15s;
		position: relative;
	}

	.tab-btn:hover {
		color: var(--traek-overlay-text, #e4e4e7);
		background: rgba(255, 255, 255, 0.04);
	}

	.tab-btn.active {
		color: var(--traek-input-button-bg, #00d8ff);
	}

	.tab-btn.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--traek-input-button-bg, #00d8ff);
		border-radius: 1px 1px 0 0;
	}

	.tab-btn:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.tab-icon {
		font-size: 14px;
		opacity: 0.7;
	}

	/* ── Panel ───────────────────────────────────────────────────────────────── */

	.panel {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
		min-height: 0;
		scrollbar-width: thin;
		scrollbar-color: var(--traek-scrollbar-thumb, #27272a) transparent;
	}

	.panel::-webkit-scrollbar {
		width: 6px;
	}

	.panel::-webkit-scrollbar-track {
		background: transparent;
	}

	.panel::-webkit-scrollbar-thumb {
		background: var(--traek-scrollbar-thumb, #27272a);
		border-radius: 3px;
	}

	/* ── Section heading ─────────────────────────────────────────────────────── */

	.section-heading {
		margin: 0 0 12px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--traek-thought-header-accent, #52525b);
	}

	/* ── Overview ────────────────────────────────────────────────────────────── */

	.overview-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto auto;
		gap: 16px;
	}

	/* Score card */
	.score-card {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 20px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
	}

	.score-ring {
		position: relative;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
	}

	.score-svg {
		width: 80px;
		height: 80px;
		transform: rotate(-90deg);
	}

	.score-track {
		fill: none;
		stroke: rgba(255, 255, 255, 0.08);
		stroke-width: 6;
	}

	.score-fill {
		fill: none;
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.score-inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.score-value {
		font-size: 22px;
		font-weight: 700;
		line-height: 1;
		color: var(--traek-overlay-text, #e4e4e7);
	}

	.score-unit {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
	}

	.score-label {
		font-size: 16px;
		font-weight: 700;
		display: block;
	}

	.score-desc {
		font-size: 12px;
		color: var(--traek-thought-row-muted-1, #71717a);
		display: block;
		margin-top: 2px;
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.stat-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 8px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 10px;
		text-align: center;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--traek-overlay-text, #e4e4e7);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.stat-label {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
		margin-top: 3px;
		white-space: nowrap;
	}

	/* Role bar */
	.role-bar-section {
		padding: 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
	}

	.role-bar {
		display: flex;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
		margin-bottom: 10px;
	}

	.role-bar-segment {
		height: 100%;
		transition: width 0.5s ease;
	}

	.role-legend {
		display: flex;
		gap: 16px;
	}

	.role-legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
		text-transform: capitalize;
	}

	.role-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.role-pct {
		font-weight: 600;
		color: var(--traek-overlay-text, #e4e4e7);
	}

	/* Insights list */
	.insights-list {
		padding: 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
		grid-column: 1 / -1;
	}

	.insight-items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.insight-item {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 13px;
		line-height: 1.4;
		padding: 6px 10px;
		border-radius: 8px;
	}

	.insight-item--positive {
		color: #22d3a0;
		background: rgba(34, 211, 160, 0.06);
	}

	.insight-item--warning {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.06);
	}

	.insight-item--neutral {
		color: var(--traek-thought-row-muted-2, #a1a1aa);
		background: rgba(255, 255, 255, 0.03);
	}

	.insight-code {
		font-family: var(--traek-font-mono, monospace);
		font-size: 11px;
		background: rgba(255, 255, 255, 0.08);
		padding: 1px 5px;
		border-radius: 4px;
	}

	/* ── Topology ────────────────────────────────────────────────────────────── */

	.topology-view {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.topology-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 13px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.topo-stat strong {
		color: var(--traek-overlay-text, #e4e4e7);
	}

	.topo-sep {
		color: var(--traek-thought-row-muted-4, #52525b);
	}

	.topo-chart {
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
		padding: 16px;
	}

	.branch-bars {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.branch-row {
		display: grid;
		grid-template-columns: 32px 1fr auto;
		align-items: center;
		gap: 10px;
	}

	.branch-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--traek-thought-row-muted-1, #71717a);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.branch-track {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 4px;
		height: 24px;
		overflow: hidden;
		position: relative;
	}

	.branch-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease;
		background: var(--branch-color, #00d8ff);
		opacity: 0.75;
	}

	.branch-count {
		position: absolute;
		right: 8px;
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
	}

	.branch-pills {
		display: flex;
		gap: 4px;
	}

	.branch-pill {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 7px;
		border-radius: 20px;
	}

	.branch-pill--user {
		background: rgba(0, 216, 255, 0.12);
		color: #00d8ff;
	}
	.branch-pill--asst {
		background: rgba(255, 68, 0, 0.12);
		color: #ff4400;
	}
	.branch-pill--time {
		background: rgba(255, 255, 255, 0.06);
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.depth-section {
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
		padding: 16px;
	}

	.depth-stats {
		display: flex;
		gap: 16px;
	}

	.depth-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 10px;
	}

	.depth-value {
		font-size: 22px;
		font-weight: 700;
		color: var(--traek-overlay-text, #e4e4e7);
		line-height: 1;
	}

	.depth-desc {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
		margin-top: 4px;
		text-align: center;
	}

	/* ── Heatmap ─────────────────────────────────────────────────────────────── */

	.heatmap-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.heatmap-intro {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.heatmap-highlights {
		display: flex;
		gap: 12px;
	}

	.heat-highlight {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 12px;
		flex: 1;
	}

	.heat-highlight--hot {
		background: rgba(255, 68, 0, 0.08);
		border: 1px solid rgba(255, 68, 0, 0.2);
	}

	.heat-highlight--cold {
		background: rgba(0, 216, 255, 0.06);
		border: 1px solid rgba(0, 216, 255, 0.15);
	}

	.heat-highlight-icon {
		font-size: 18px;
	}

	.heat-highlight-label {
		display: block;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		color: var(--traek-thought-row-muted-1, #71717a);
	}

	.heat-highlight-id {
		font-family: var(--traek-font-mono, monospace);
		font-size: 12px;
		color: var(--traek-overlay-text, #e4e4e7);
	}

	.heat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 8px;
	}

	.heat-cell {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		padding: 10px;
	}

	.heat-cell-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: calc(var(--heat, 0) * 100%);
		pointer-events: none;
		z-index: 0;
	}

	.heat-cell-content {
		position: relative;
		z-index: 1;
	}

	.heat-cell-id {
		display: block;
		font-family: var(--traek-font-mono, monospace);
		font-size: 10px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
		margin-bottom: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.heat-cell-meta {
		display: flex;
		gap: 5px;
		align-items: center;
		margin-bottom: 6px;
	}

	.heat-cell-role {
		font-size: 10px;
		font-weight: 600;
		text-transform: capitalize;
	}

	.heat-cell-depth,
	.heat-cell-branches {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
	}

	.heat-cell-intensity {
		font-size: 14px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.heat-legend {
		margin-top: 4px;
	}

	.heat-gradient {
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(to right, #00d8ff, #00ff88, #ffcc00, #ff4400);
		margin-bottom: 6px;
	}

	.heat-legend-labels {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
	}

	/* ── Flow ────────────────────────────────────────────────────────────────── */

	.flow-view {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.flow-intro {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px;
		color: var(--traek-thought-row-muted-1, #71717a);
		font-size: 14px;
	}

	.empty-icon {
		font-size: 32px;
		opacity: 0.4;
	}

	.flow-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.flow-branch {
		padding: 14px 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 12px;
	}

	.flow-branch-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.flow-branch-rank {
		font-size: 11px;
		font-weight: 700;
		color: var(--traek-input-button-bg, #00d8ff);
	}

	.flow-branch-id {
		font-size: 13px;
		font-weight: 600;
		color: var(--traek-overlay-text, #e4e4e7);
		flex: 1;
	}

	.flow-intensity-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 20px;
		border: 1px solid;
	}

	/* Node path visualization */
	.flow-path {
		display: flex;
		align-items: center;
		gap: 3px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}

	.flow-node {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.flow-node--user {
		background: #00d8ff;
	}
	.flow-node--asst {
		background: #ff4400;
	}
	.flow-node--system {
		background: #a78bfa;
	}

	.flow-overflow {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
		margin-left: 4px;
	}

	.flow-branch-stats {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.flow-stat {
		font-size: 11px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
		font-variant-numeric: tabular-nums;
	}

	/* ── Content ─────────────────────────────────────────────────────────────── */

	.content-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.content-intro {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.content-role-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.content-role-card {
		padding: 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
	}

	.content-role-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.content-role-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.content-role-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--traek-overlay-text, #e4e4e7);
		text-transform: capitalize;
	}

	.content-role-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 12px;
	}

	.content-stat {
		display: flex;
		flex-direction: column;
	}

	.content-stat-value {
		font-size: 16px;
		font-weight: 700;
		color: var(--traek-overlay-text, #e4e4e7);
		font-variant-numeric: tabular-nums;
	}

	.content-stat-label {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
		margin-top: 1px;
	}

	.content-bar-track {
		height: 4px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
		overflow: hidden;
	}

	.content-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.5s ease;
	}

	.metrics-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		padding: 14px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 12px;
	}

	.metric-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--traek-overlay-text, #e4e4e7);
		font-variant-numeric: tabular-nums;
		line-height: 1;
		margin-bottom: 4px;
	}

	.metric-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--traek-thought-header-accent, #52525b);
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}

	.metric-desc {
		font-size: 10px;
		color: var(--traek-thought-row-muted-1, #71717a);
		margin-top: 3px;
	}

	.tags-section {
		padding: 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 12px;
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag-chip {
		padding: 3px 10px;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 500;
		background: rgba(0, 216, 255, 0.1);
		color: var(--traek-input-button-bg, #00d8ff);
		border: 1px solid rgba(0, 216, 255, 0.2);
	}

	/* ── Export ──────────────────────────────────────────────────────────────── */

	.export-view {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.export-intro {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.format-fieldset {
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 14px;
		padding: 16px;
		margin: 0;
	}

	.format-legend {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--traek-thought-header-accent, #52525b);
		padding: 0 6px;
	}

	.format-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 10px;
	}

	.format-option {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 10px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.format-option:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.format-option.selected {
		border-color: var(--traek-input-button-bg, #00d8ff);
		background: rgba(0, 216, 255, 0.05);
	}

	.format-radio {
		margin: 3px 0 0;
		accent-color: var(--traek-input-button-bg, #00d8ff);
		flex-shrink: 0;
	}

	.format-option-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.format-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--traek-overlay-text, #e4e4e7);
	}

	.format-ext {
		font-family: var(--traek-font-mono, monospace);
		font-size: 11px;
		color: var(--traek-input-button-bg, #00d8ff);
	}

	.format-desc {
		font-size: 12px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
	}

	.export-summary {
		padding: 16px;
		background: var(--traek-thought-row-bg, rgba(255, 255, 255, 0.025));
		border: 1px solid var(--traek-node-border, #1f1f24);
		border-radius: 12px;
	}

	.export-includes {
		margin: 0;
		padding: 0 0 0 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.export-includes li {
		font-size: 13px;
		color: var(--traek-thought-row-muted-2, #a1a1aa);
		line-height: 1.5;
	}

	.export-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background: var(--traek-input-button-bg, #00d8ff);
		border: none;
		border-radius: 10px;
		color: var(--traek-input-button-text, #000000);
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.15s;
		align-self: flex-start;
	}

	.export-btn:hover {
		opacity: 0.9;
	}

	.export-btn:active {
		transform: scale(0.98);
	}

	.export-btn:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 3px;
	}

	/* ── Footer ──────────────────────────────────────────────────────────────── */

	.dialog-footer {
		padding: 10px 24px;
		border-top: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.footer-meta {
		font-size: 10px;
		color: var(--traek-thought-row-muted-4, #52525b);
	}

	/* ── Responsive ──────────────────────────────────────────────────────────── */

	@media (max-width: 640px) {
		.dialog {
			width: 100vw;
			height: 100dvh;
			top: 0;
			left: 0;
			transform: none;
			border-radius: 0;
		}

		.overview-grid {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.content-role-grid,
		.metrics-row {
			grid-template-columns: 1fr;
		}

		.heatmap-highlights {
			flex-direction: column;
		}

		.depth-stats {
			flex-wrap: wrap;
		}

		.tab-label {
			display: none;
		}

		.tab-btn {
			padding: 8px 12px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.score-fill,
		.branch-fill,
		.content-bar-fill,
		.role-bar-segment {
			transition: none;
		}
	}
</style>
