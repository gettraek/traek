# Analytics API Reference

The `@traek/analytics` package provides conversation intelligence: flow analysis, branch heatmaps, engagement scoring, and exportable reports. It runs entirely client-side — no data leaves the browser unless you explicitly send it to your own backend.

---

## Installation

```bash
npm install @traek/analytics
```

> **License note:** `@traek/analytics` is licensed under BSL-1.1 and is part of the Træk Pro tier. Production use requires a valid Pro license. See [pricing.gettraek.com](https://pricing.gettraek.com) for details.

---

## Quick Start

```ts
import { analyzeFlow, analyzeEngagement, generateReport } from '@traek/analytics'

const snapshot = engine.serialize()

// Analyse conversation structure
const flow = analyzeFlow(snapshot)
console.log(`${flow.branchCount} branches, max depth ${flow.maxDepth}`)

// Score engagement quality
const engagement = analyzeEngagement(snapshot, flow)
console.log(`Engagement score: ${engagement.score}/100`)

// Generate a full report
const report = generateReport(snapshot)
console.log(reportToMarkdown(report))
```

---

## `analyzeFlow(snapshot)`

Computes structural metrics for the conversation tree.

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `snapshot` | `ConversationSnapshot` | Output of `engine.serialize()` |

**Returns** `FlowMetrics`

### `FlowMetrics`

```ts
interface FlowMetrics {
  nodeCount: number               // Total nodes
  rootCount: number               // Nodes with no parent
  leafCount: number               // Nodes with no children
  branchingNodeCount: number      // Nodes with 2+ children
  branchCount: number             // Root-to-leaf paths
  maxDepth: number                // Deepest level (root = 0)
  avgDepth: number                // Mean depth across all nodes
  avgBranchingFactor: number      // Avg children of branching nodes
  avgResponseTimeMs: number|null  // Mean parent→child time (ms)
  medianResponseTimeMs: number|null
  countByRole: {
    user: number
    assistant: number
    system: number
  }
  branches: BranchMetrics[]       // Per-branch breakdown
  nodes: NodeFlowMetrics[]        // Per-node metrics
}
```

### `BranchMetrics`

```ts
interface BranchMetrics {
  index: number           // Branch index (0-based)
  length: number          // Number of nodes in this branch
  depth: number           // Deepest level in branch
  durationMs: number|null // First to last node creation time
  userTurns: number
  assistantTurns: number
  nodeIds: string[]       // Ordered root → leaf
}
```

### `NodeFlowMetrics`

```ts
interface NodeFlowMetrics {
  nodeId: string
  role: 'user' | 'assistant' | 'system'
  childCount: number
  depth: number
  responseTimeMs: number|null  // Time since parent's createdAt
  contentLength: number        // Characters
}
```

### Example

```ts
const flow = analyzeFlow(snapshot)

// Find the most-explored branch
const longest = flow.branches.sort((a, b) => b.length - a.length)[0]
console.log(`Longest branch: ${longest.length} nodes, ${longest.userTurns} user turns`)

// Identify branching points
const branchPoints = flow.nodes.filter(n => n.childCount >= 2)
```

---

## `buildHeatmap(snapshot, flow?)`

Generates intensity data for visualising which nodes and branches are most active.

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `snapshot` | `ConversationSnapshot` | Conversation data |
| `flow` | `FlowMetrics` (optional) | Pass pre-computed flow to avoid re-analysis |

**Returns** `HeatmapData`

```ts
interface HeatmapData {
  nodes: NodeHeatCell[]
  branches: BranchHeatCell[]
}

interface NodeHeatCell {
  nodeId: string
  intensity: HeatIntensity  // 'cold' | 'warm' | 'hot' | 'critical'
  score: number             // 0–100
}

interface BranchHeatCell {
  branchIndex: number
  intensity: HeatIntensity
  score: number
}

type HeatIntensity = 'cold' | 'warm' | 'hot' | 'critical'
```

### Example

```ts
const heatmap = buildHeatmap(snapshot)

// Apply CSS classes based on intensity
heatmap.nodes.forEach(({ nodeId, intensity }) => {
  const el = document.querySelector(`[data-node-id="${nodeId}"]`)
  el?.classList.add(`heat-${intensity}`)
})
```

---

## `analyzeEngagement(snapshot, flow?)`

Scores the overall engagement quality of a conversation.

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `snapshot` | `ConversationSnapshot` | Conversation data |
| `flow` | `FlowMetrics` (optional) | Pre-computed flow |

**Returns** `EngagementMetrics`

```ts
interface EngagementMetrics {
  score: number                    // 0–100, higher = richer conversation

  contentByRole: {
    user: ContentStats
    assistant: ContentStats
    system: ContentStats
  }

  responseElaborationRatio: number // assistant chars / user chars
  branchingRate: number            // branching nodes / total nodes
  explorationDiversity: number     // branchCount / maxDepth
  nodesPerMinute: number|null      // conversation velocity

  uniqueTags: string[]
  codeNodeCount: number
  deepAnswerRate: number           // fraction of long assistant responses
}

interface ContentStats {
  avgLength: number
  medianLength: number
  maxLength: number
  minLength: number
  totalChars: number
}
```

### Interpreting the score

| Score | Interpretation |
|-------|---------------|
| 0–30 | Shallow — few turns, minimal branching |
| 31–60 | Moderate — typical single-branch session |
| 61–80 | Rich — good branching, detailed responses |
| 81–100 | Excellent — deep exploration, high elaboration |

---

## `generateReport(snapshot, flow?, engagement?)`

Creates a combined analytics report.

**Returns** `AnalyticsReport`

```ts
interface AnalyticsReport {
  generatedAt: string
  flow: FlowMetrics
  engagement: EngagementMetrics
  heatmap: HeatmapData
}
```

### Export formats

```ts
import {
  generateReport,
  reportToJson,
  reportToMarkdown,
  reportToCsv
} from '@traek/analytics'

const report = generateReport(snapshot)

// JSON string (for storage or API)
const json = reportToJson(report)

// Human-readable Markdown
const md = reportToMarkdown(report)

// CSV (nodes table)
const csv = reportToCsv(report)
```

---

## Full example — post-session analytics

```ts
import {
  analyzeFlow,
  analyzeEngagement,
  buildHeatmap,
  generateReport,
  reportToMarkdown
} from '@traek/analytics'

async function onSessionEnd(engine: TraekEngine) {
  const snapshot = engine.serialize()

  // Run analysis
  const flow       = analyzeFlow(snapshot)
  const engagement = analyzeEngagement(snapshot, flow)
  const heatmap    = buildHeatmap(snapshot, flow)

  // Log key metrics
  console.log({
    branches:        flow.branchCount,
    depth:           flow.maxDepth,
    engagementScore: engagement.score,
    velocity:        engagement.nodesPerMinute
  })

  // Save report to cloud
  const report = generateReport(snapshot, flow, engagement)
  await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: reportToJson(report)
  })
}
```

---

## TypeScript types

All types are exported from the package root:

```ts
import type {
  FlowMetrics,
  BranchMetrics,
  NodeFlowMetrics,
  HeatmapData,
  NodeHeatCell,
  BranchHeatCell,
  HeatIntensity,
  EngagementMetrics,
  ContentStats,
  AnalyticsReport
} from '@traek/analytics'
```
