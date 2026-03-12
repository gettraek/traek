<script lang="ts">
	import RevenueChart from '$lib/marketplace/RevenueChart.svelte';

	type DashboardTab = 'overview' | 'payouts' | 'items' | 'audience';

	let activeTab = $state<DashboardTab>('overview');
	let chartRange = $state<'30d' | '90d' | '1yr' | 'all'>('30d');

	// Mock data
	const stats = {
		thisMonth: 1240,
		thisMonthTrend: 18,
		allTime: 28470,
		avgRating: 4.8,
		activeItems: 3
	};

	function generateChartData(days: number): Array<{ date: string; revenue: number }> {
		const result = [];
		const nowMs = Date.now();
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date(nowMs - i * 86400000);
			const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			// Simulate revenue curve
			const base = 30 + Math.sin(i * 0.3) * 15 + Math.random() * 20;
			result.push({ date: label, revenue: Math.max(0, base) });
		}
		return result;
	}

	const chartData = $derived(
		chartRange === '30d'
			? generateChartData(30)
			: chartRange === '90d'
				? generateChartData(90)
				: generateChartData(180)
	);

	const topItems = [
		{ name: 'Midnight Pro', revenue: 880, installs: 8421 },
		{ name: 'Neon Canvas', revenue: 240, installs: 3200 },
		{ name: 'Code Review Workflow', revenue: 0, installs: 6780 }
	];

	const transactions = [
		{ date: 'Mar 07', item: 'Midnight Pro', gross: 9, net: 6.3, status: 'completed' },
		{ date: 'Mar 07', item: 'Neon Canvas', gross: 7, net: 4.9, status: 'completed' },
		{ date: 'Mar 06', item: 'Midnight Pro', gross: 9, net: 6.3, status: 'completed' },
		{ date: 'Mar 05', item: 'Midnight Pro', gross: 9, net: 6.3, status: 'processing' },
		{ date: 'Mar 04', item: 'Neon Canvas', gross: 7, net: 4.9, status: 'completed' }
	];

	const items = [
		{
			name: 'Midnight Pro',
			type: 'theme',
			status: 'live',
			installs: 8421,
			revenue: 880,
			rating: 4.7
		},
		{
			name: 'Neon Canvas',
			type: 'theme',
			status: 'live',
			installs: 3200,
			revenue: 240,
			rating: 4.4
		},
		{
			name: 'Code Review Workflow',
			type: 'template',
			status: 'live',
			installs: 6780,
			revenue: 0,
			rating: 4.8
		},
		{
			name: 'Forest Dark',
			type: 'theme',
			status: 'under_review',
			installs: 0,
			revenue: 0,
			rating: 0
		}
	];

	type TxStatus = 'completed' | 'processing' | 'pending' | 'failed';
	const statusConfig: Record<TxStatus, { label: string; color: string }> = {
		completed: { label: 'Paid', color: '#00ffa3' },
		processing: { label: 'Processing', color: '#00d8ff' },
		pending: { label: 'Pending', color: '#f5a623' },
		failed: { label: 'Failed', color: '#ff6b6b' }
	};

	type ItemStatus = 'live' | 'under_review' | 'draft' | 'rejected' | 'archived';
	const itemStatusConfig: Record<ItemStatus, { label: string; color: string }> = {
		live: { label: 'Live', color: '#00ffa3' },
		under_review: { label: 'Under Review', color: '#f5a623' },
		draft: { label: 'Draft', color: '#666' },
		rejected: { label: 'Rejected', color: '#ff6b6b' },
		archived: { label: 'Archived', color: '#666' }
	};
</script>

<svelte:head>
	<title>Creator Dashboard — træk Marketplace</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<h1 class="page-title">Creator Dashboard</h1>
		<p class="page-sub">Track your marketplace performance and earnings.</p>
	</header>

	<!-- Tab nav -->
	<nav class="tab-nav" aria-label="Dashboard sections">
		{#each ['overview', 'payouts', 'items', 'audience'] as DashboardTab[] as tab (tab)}
			<button
				class="tab-btn"
				class:tab-btn--active={activeTab === tab}
				onclick={() => (activeTab = tab)}
				aria-selected={activeTab === tab}
				role="tab"
			>
				{tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
			</button>
		{/each}
	</nav>

	{#if activeTab === 'overview'}
		<!-- Stats row -->
		<div class="stats-row">
			<div class="stat-card">
				<span class="stat-label">This Month</span>
				<span class="stat-value">${stats.thisMonth.toLocaleString()}</span>
				<span class="stat-trend stat-trend--up" aria-label="{stats.thisMonthTrend}% increase">
					▲ {stats.thisMonthTrend}%
				</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">All Time</span>
				<span class="stat-value">${stats.allTime.toLocaleString()}</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Avg Rating</span>
				<span class="stat-value">★ {stats.avgRating}</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Active Items</span>
				<span class="stat-value">{stats.activeItems}</span>
			</div>
		</div>

		<!-- Chart + top items -->
		<div class="main-row">
			<div class="chart-panel">
				<div class="chart-header">
					<h2 class="panel-title">Revenue</h2>
					<div class="range-pills" role="group" aria-label="Time range">
						{#each ['30d', '90d', '1yr', 'all'] as const as range (range)}
							<button
								class="range-pill"
								class:range-pill--active={chartRange === range}
								onclick={() => (chartRange = range)}
								aria-pressed={chartRange === range}
							>
								{range}
							</button>
						{/each}
					</div>
				</div>
				<RevenueChart data={chartData} />
			</div>

			<div class="top-items-panel">
				<h2 class="panel-title">Top Items</h2>
				<ol class="top-items">
					{#each topItems as item, i (item.name)}
						<li class="top-item">
							<span class="top-item__rank" aria-hidden="true">{i + 1}</span>
							<span class="top-item__name">{item.name}</span>
							<span class="top-item__revenue">
								{item.revenue > 0 ? `$${item.revenue}/mo` : 'Free'}
							</span>
						</li>
					{/each}
				</ol>
			</div>
		</div>

		<!-- Transactions -->
		<div class="transactions-panel">
			<h2 class="panel-title">Recent Transactions</h2>
			<table class="table" aria-label="Recent transactions">
				<thead>
					<tr>
						<th>Date</th>
						<th>Item</th>
						<th>Gross</th>
						<th>Your cut (70%)</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each transactions as tx, ti (ti)}
						<tr>
							<td class="td--muted">{tx.date}</td>
							<td>{tx.item}</td>
							<td>${tx.gross.toFixed(2)}</td>
							<td class="td--lime">${tx.net.toFixed(2)}</td>
							<td>
								<span
									class="status-chip"
									style="--chip-color: {statusConfig[tx.status as TxStatus]?.color ?? '#666'}"
								>
									{statusConfig[tx.status as TxStatus]?.label ?? tx.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if activeTab === 'payouts'}
		<div class="section">
			<div class="balance-card">
				<span class="balance-label">Available balance</span>
				<span class="balance-amount">$0.00</span>
				<p class="balance-note">Minimum payout: $50 · Monthly, net-30</p>
				<button class="btn btn--primary" disabled>Request payout</button>
			</div>

			<h2 class="panel-title" style="margin-top: 40px">Payment method</h2>
			<div class="empty-state">
				<p>No payment method connected.</p>
				<button class="btn btn--ghost">Connect Stripe</button>
			</div>
		</div>
	{:else if activeTab === 'items'}
		<div class="section">
			<div class="items-header">
				<h2 class="panel-title">Your items</h2>
				<a href="/marketplace/submit" class="btn btn--primary">+ Submit new</a>
			</div>
			<table class="table" aria-label="Your marketplace items">
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Status</th>
						<th>Installs</th>
						<th>Revenue</th>
						<th>Rating</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.name)}
						<tr>
							<td><strong>{item.name}</strong></td>
							<td class="td--muted">{item.type}</td>
							<td>
								<span
									class="status-chip"
									style="--chip-color: {itemStatusConfig[item.status as ItemStatus]?.color ??
										'#666'}"
								>
									{itemStatusConfig[item.status as ItemStatus]?.label ?? item.status}
								</span>
							</td>
							<td>{item.installs.toLocaleString()}</td>
							<td class="td--lime">{item.revenue > 0 ? `$${item.revenue}/mo` : '—'}</td>
							<td>{item.rating > 0 ? `★ ${item.rating}` : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if activeTab === 'audience'}
		<div class="section">
			<h2 class="panel-title">Install breakdown by plan</h2>
			<!-- Simple donut representation -->
			<div class="donut-legend">
				{#each [{ label: 'Free users', pct: 62, color: '#666' }, { label: 'Pro', pct: 31, color: '#00d8ff' }, { label: 'Enterprise', pct: 7, color: '#00ffa3' }] as segment (segment.label)}
					<div class="donut-row">
						<span class="donut-swatch" style="background: {segment.color}"></span>
						<span class="donut-label">{segment.label}</span>
						<div class="donut-bar-wrap">
							<div
								class="donut-bar"
								style="width: {segment.pct}%; background: {segment.color}"
							></div>
						</div>
						<span class="donut-pct">{segment.pct}%</span>
					</div>
				{/each}
			</div>

			<h2 class="panel-title" style="margin-top: 40px">Top countries</h2>
			<table class="table" aria-label="Installs by country">
				<thead><tr><th>Country</th><th>Installs</th></tr></thead>
				<tbody>
					{#each [{ flag: '🇺🇸', name: 'United States', count: 4210 }, { flag: '🇩🇪', name: 'Germany', count: 1840 }, { flag: '🇬🇧', name: 'United Kingdom', count: 1320 }, { flag: '🇫🇷', name: 'France', count: 890 }, { flag: '🇯🇵', name: 'Japan', count: 654 }] as row (row.name)}
						<tr>
							<td>{row.flag} {row.name}</td>
							<td>{row.count.toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.page {
		padding: 40px max(5vw, 20px);
		max-width: 1100px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 28px;
	}

	.page-title {
		font-size: 26px;
		font-weight: 700;
		margin: 0 0 6px;
	}

	.page-sub {
		color: var(--pg-text-secondary, #a8a8a8);
		margin: 0;
		font-size: 15px;
	}

	/* Tab nav */
	.tab-nav {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		margin-bottom: 32px;
	}

	.tab-btn {
		padding: 10px 18px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--pg-text-secondary, #a8a8a8);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
		margin-bottom: -1px;
	}

	.tab-btn:hover {
		color: var(--pg-text, #f0f0f0);
	}

	.tab-btn--active {
		color: var(--pg-cyan, #00d8ff);
		border-bottom-color: var(--pg-cyan, #00d8ff);
	}

	/* Stats row */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 28px;
	}

	.stat-card {
		padding: 20px;
		background: var(--pg-bg-card, #161616);
		border: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		transition: border-color 0.15s;
	}

	.stat-card:hover {
		border-color: var(--pg-border-strong, rgba(255, 255, 255, 0.14));
	}

	.stat-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--pg-text-muted, #666);
	}

	.stat-value {
		font-size: 26px;
		font-weight: 700;
		color: var(--pg-text, #f0f0f0);
		line-height: 1;
	}

	.stat-trend {
		font-size: 12px;
		font-weight: 500;
	}

	.stat-trend--up {
		color: #00ffa3;
	}

	/* Main row (chart + top items) */
	.main-row {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 20px;
		margin-bottom: 28px;
	}

	.chart-panel,
	.top-items-panel,
	.transactions-panel {
		background: var(--pg-bg-card, #161616);
		border: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		padding: 20px;
	}

	.chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.panel-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: var(--pg-text, #f0f0f0);
	}

	/* Range pills */
	.range-pills {
		display: flex;
		gap: 4px;
	}

	.range-pill {
		padding: 3px 10px;
		border-radius: 12px;
		border: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		background: transparent;
		color: var(--pg-text-muted, #666);
		font-size: 11px;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
	}

	.range-pill:hover {
		color: var(--pg-text, #f0f0f0);
	}

	.range-pill--active {
		background: linear-gradient(135deg, #00d8ff, #00ffa3);
		border-color: transparent;
		color: #080808;
		font-weight: 600;
	}

	/* Top items */
	.top-items {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.top-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
	}

	.top-item:last-child {
		border-bottom: none;
	}

	.top-item__rank {
		width: 20px;
		font-size: 12px;
		font-weight: 700;
		color: var(--pg-text-muted, #666);
		text-align: center;
	}

	.top-item__name {
		flex: 1;
		font-size: 13px;
	}

	.top-item__revenue {
		font-size: 12px;
		color: var(--pg-lime, #00ffa3);
		font-weight: 600;
	}

	/* Table */
	.transactions-panel {
		margin-bottom: 0;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.table th {
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--pg-text-muted, #666);
		padding: 8px 0 12px;
		border-bottom: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
	}

	.table td {
		padding: 10px 0;
		border-bottom: 1px solid var(--pg-border, rgba(255, 255, 255, 0.06));
		color: var(--pg-text, #f0f0f0);
	}

	.table tr:last-child td {
		border-bottom: none;
	}

	.td--muted {
		color: var(--pg-text-muted, #666) !important;
	}

	.td--lime {
		color: var(--pg-lime, #00ffa3) !important;
		font-weight: 600;
	}

	/* Status chips */
	.status-chip {
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 11px;
		font-weight: 600;
		color: var(--chip-color);
		background: color-mix(in srgb, var(--chip-color) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
	}

	/* Section */
	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Balance card */
	.balance-card {
		padding: 32px;
		background: var(--pg-bg-card, #161616);
		border: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		max-width: 400px;
	}

	.balance-label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--pg-text-muted, #666);
		margin-bottom: 8px;
	}

	.balance-amount {
		display: block;
		font-size: 40px;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.balance-note {
		font-size: 13px;
		color: var(--pg-text-muted, #666);
		margin: 0 0 20px;
	}

	/* Items header */
	.items-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* Donut / bar chart */
	.donut-legend {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 480px;
	}

	.donut-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
	}

	.donut-swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.donut-label {
		width: 120px;
		flex-shrink: 0;
		color: var(--pg-text-secondary, #a8a8a8);
	}

	.donut-bar-wrap {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}

	.donut-bar {
		height: 100%;
		border-radius: 3px;
		transition: width 0.4s ease;
	}

	.donut-pct {
		width: 36px;
		text-align: right;
		font-size: 12px;
		color: var(--pg-text-secondary, #a8a8a8);
	}

	/* Empty state */
	.empty-state {
		padding: 40px;
		background: var(--pg-bg-card, #161616);
		border: 1px solid var(--pg-border, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		text-align: center;
		color: var(--pg-text-secondary, #a8a8a8);
		display: flex;
		flex-direction: column;
		gap: 16px;
		align-items: center;
		max-width: 400px;
	}

	/* Buttons */
	.btn {
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	.btn--primary {
		background: linear-gradient(135deg, #00d8ff, #00ffa3);
		color: #080808;
		border: none;
	}

	.btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn--ghost {
		background: transparent;
		border: 1px solid var(--pg-border-strong, rgba(255, 255, 255, 0.14));
		color: var(--pg-text-secondary, #a8a8a8);
	}

	.btn--ghost:hover {
		border-color: var(--pg-border-cyan, rgba(0, 216, 255, 0.28));
		color: var(--pg-cyan, #00d8ff);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}

		.main-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.stats-row {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
