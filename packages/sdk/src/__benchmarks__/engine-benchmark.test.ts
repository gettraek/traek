import { describe, it, expect, beforeEach } from 'vitest';
import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from '../lib/TraekEngine.svelte';
import { ViewportTracker } from '../lib/canvas/ViewportTracker.svelte';

/**
 * Performance benchmark suite for TraekEngine and ViewportTracker.
 * Measures execution time of critical operations and ensures they stay within acceptable thresholds.
 */

interface BenchmarkResult {
	operation: string;
	nodeCount: number;
	durationMs: number;
	thresholdMs: number;
	passed: boolean;
}

const results: BenchmarkResult[] = [];

function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
	const start = performance.now();
	const result = fn();
	const duration = performance.now() - start;
	return { result, duration };
}

function recordBenchmark(
	operation: string,
	nodeCount: number,
	durationMs: number,
	thresholdMs: number
) {
	const passed = durationMs < thresholdMs;
	results.push({ operation, nodeCount, durationMs, thresholdMs, passed });
	console.log(
		`[${passed ? 'PASS' : 'FAIL'}] ${operation} (${nodeCount} nodes): ${durationMs.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
	);
}

function createEngine(): TraekEngine {
	return new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
}

function populateEngineWithNodes(engine: TraekEngine, count: number): string[] {
	const nodeIds: string[] = [];

	// Create a balanced tree structure for realistic testing
	// Root node
	const root = engine.addNode('Root node', 'user', { deferLayout: true });
	nodeIds.push(root.id);

	// Add nodes in batches to create a tree structure
	let currentLevel = [root.id];
	let remainingNodes = count - 1;

	while (remainingNodes > 0) {
		const nextLevel: string[] = [];
		const childrenPerNode = Math.min(3, Math.ceil(remainingNodes / currentLevel.length));

		for (const parentId of currentLevel) {
			const childrenToAdd = Math.min(childrenPerNode, remainingNodes);

			for (let i = 0; i < childrenToAdd; i++) {
				const node = engine.addNode(`Node ${nodeIds.length}`, 'assistant', {
					parentIds: [parentId],
					deferLayout: true
				});
				nodeIds.push(node.id);
				nextLevel.push(node.id);
				remainingNodes--;

				if (remainingNodes === 0) break;
			}

			if (remainingNodes === 0) break;
		}

		currentLevel = nextLevel;
	}

	return nodeIds;
}

describe('TraekEngine Performance Benchmarks', () => {
	beforeEach(() => {
		// Clear results at start of each test suite
		if (results.length === 0) {
			console.log('\n=== TraekEngine Performance Benchmarks ===\n');
		}
	});

	describe('addNode performance', () => {
		it('should add 100 nodes within threshold', () => {
			const engine = createEngine();
			const nodeCount = 100;
			const threshold = 100; // 100ms for 100 nodes

			const { duration } = measurePerformance(() => {
				populateEngineWithNodes(engine, nodeCount);
			});

			recordBenchmark('addNode', nodeCount, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should add 500 nodes within threshold', () => {
			const engine = createEngine();
			const nodeCount = 500;
			const threshold = 300; // 300ms for 500 nodes

			const { duration } = measurePerformance(() => {
				populateEngineWithNodes(engine, nodeCount);
			});

			recordBenchmark('addNode', nodeCount, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should add 1000 nodes within threshold', () => {
			const engine = createEngine();
			const nodeCount = 1000;
			const threshold = 500; // 500ms for 1000 nodes

			const { duration } = measurePerformance(() => {
				populateEngineWithNodes(engine, nodeCount);
			});

			recordBenchmark('addNode', nodeCount, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});
	});

	describe('deleteNode performance', () => {
		it('should delete node from 100-node tree within threshold', () => {
			const engine = createEngine();
			const nodeIds = populateEngineWithNodes(engine, 100);
			engine.flushLayoutFromRoot();
			const threshold = 50; // 50ms

			// Delete a middle node
			const nodeToDelete = nodeIds[Math.floor(nodeIds.length / 2)];
			const { duration } = measurePerformance(() => {
				engine.deleteNode(nodeToDelete);
			});

			recordBenchmark('deleteNode', 100, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should delete node from 500-node tree within threshold', () => {
			const engine = createEngine();
			const nodeIds = populateEngineWithNodes(engine, 500);
			engine.flushLayoutFromRoot();
			const threshold = 100; // 100ms

			const nodeToDelete = nodeIds[Math.floor(nodeIds.length / 2)];
			const { duration } = measurePerformance(() => {
				engine.deleteNode(nodeToDelete);
			});

			recordBenchmark('deleteNode', 500, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should delete node from 1000-node tree within threshold', () => {
			const engine = createEngine();
			const nodeIds = populateEngineWithNodes(engine, 1000);
			engine.flushLayoutFromRoot();
			const threshold = 150; // 150ms

			const nodeToDelete = nodeIds[Math.floor(nodeIds.length / 2)];
			const { duration } = measurePerformance(() => {
				engine.deleteNode(nodeToDelete);
			});

			recordBenchmark('deleteNode', 1000, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});
	});

	describe('flushLayoutFromRoot performance', () => {
		it('should layout 100 nodes within threshold', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 100);
			const threshold = 100; // 100ms

			const { duration } = measurePerformance(() => {
				engine.flushLayoutFromRoot();
			});

			recordBenchmark('flushLayoutFromRoot', 100, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should layout 500 nodes within threshold', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 500);
			const threshold = 200; // 200ms

			const { duration } = measurePerformance(() => {
				engine.flushLayoutFromRoot();
			});

			recordBenchmark('flushLayoutFromRoot', 500, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});

		it('should layout 1000 nodes within threshold', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 1000);
			const threshold = 300; // 300ms

			const { duration } = measurePerformance(() => {
				engine.flushLayoutFromRoot();
			});

			recordBenchmark('flushLayoutFromRoot', 1000, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});
	});

	describe('searchNodes performance', () => {
		it('should search 1000 nodes within threshold', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 1000);
			engine.flushLayoutFromRoot();
			const threshold = 100; // 100ms

			const { duration } = measurePerformance(() => {
				engine.searchNodesMethod('Node 500');
			});

			recordBenchmark('searchNodes', 1000, duration, threshold);
			expect(duration).toBeLessThan(threshold);
			expect(engine.searchMatches.length).toBeGreaterThan(0);
		});

		it('should handle complex search patterns efficiently', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 1000);
			engine.flushLayoutFromRoot();
			const threshold = 150; // 150ms

			const { duration } = measurePerformance(() => {
				engine.searchNodesMethod('assistant');
			});

			recordBenchmark('searchNodes (pattern)', 1000, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});
	});

	describe('ViewportTracker performance', () => {
		it('should calculate visible nodes for 1000 nodes within threshold', () => {
			const engine = createEngine();
			populateEngineWithNodes(engine, 1000);
			engine.flushLayoutFromRoot();

			const tracker = new ViewportTracker(DEFAULT_TRACK_ENGINE_CONFIG, 200);
			const threshold = 50; // 50ms

			// Mock viewport element
			const mockViewport = {
				clientWidth: 1920,
				clientHeight: 1080
			} as HTMLElement;

			const scale = 1;
			const offset = { x: 0, y: 0 };

			const { duration, result } = measurePerformance(() => {
				return tracker.getVisibleNodeIds(
					engine.nodes,
					engine.collapsedNodes,
					mockViewport,
					scale,
					offset
				);
			});

			recordBenchmark('ViewportTracker.getVisibleNodeIds', 1000, duration, threshold);
			expect(duration).toBeLessThan(threshold);
			expect(result.size).toBeGreaterThan(0);
		});

		it('should handle viewport bounds calculation efficiently', () => {
			const tracker = new ViewportTracker(DEFAULT_TRACK_ENGINE_CONFIG, 200);
			const threshold = 1; // 1ms - should be very fast

			const mockViewport = {
				clientWidth: 1920,
				clientHeight: 1080
			} as HTMLElement;

			const scale = 1;
			const offset = { x: 100, y: 100 };

			const iterations = 1000;
			const { duration } = measurePerformance(() => {
				for (let i = 0; i < iterations; i++) {
					tracker.getViewportBounds(mockViewport, scale, offset);
				}
			});

			const avgDuration = duration / iterations;
			recordBenchmark(
				'ViewportTracker.getViewportBounds (avg)',
				iterations,
				avgDuration,
				threshold
			);
			expect(avgDuration).toBeLessThan(threshold);
		});
	});

	describe('Bulk operations performance', () => {
		it('should handle addNodes (bulk) efficiently', () => {
			const engine = createEngine();
			const nodeCount = 1000;
			const threshold = 400; // 400ms

			// Create payloads for bulk add
			const payloads = Array.from({ length: nodeCount }, (_, i) => ({
				content: `Bulk node ${i}`,
				role: 'user' as const,
				parentIds: i === 0 ? [] : [`bulk-${i - 1}`],
				id: `bulk-${i}`
			}));

			const { duration } = measurePerformance(() => {
				engine.addNodes(payloads);
			});

			recordBenchmark('addNodes (bulk)', nodeCount, duration, threshold);
			expect(duration).toBeLessThan(threshold);
			expect(engine.nodes.length).toBe(nodeCount);
		});

		it('should handle deleteNodeAndDescendants efficiently', () => {
			const engine = createEngine();
			const nodeIds = populateEngineWithNodes(engine, 500);
			engine.flushLayoutFromRoot();
			const threshold = 200; // 200ms

			// Delete a node near the top of the tree (will cascade to many descendants)
			const nodeToDelete = nodeIds[10]; // Near the root
			const { duration } = measurePerformance(() => {
				engine.deleteNodeAndDescendants(nodeToDelete);
			});

			recordBenchmark('deleteNodeAndDescendants', 500, duration, threshold);
			expect(duration).toBeLessThan(threshold);
		});
	});
});

describe('Performance Summary', () => {
	it('should pass all performance benchmarks', () => {
		console.log('\n=== Performance Benchmark Summary ===\n');

		const passed = results.filter((r) => r.passed).length;
		const failed = results.filter((r) => !r.passed).length;
		const total = results.length;

		console.log(`Total Benchmarks: ${total}`);
		console.log(`Passed: ${passed} ✓`);
		console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);

		if (failed > 0) {
			console.log('\nFailed Benchmarks:');
			results
				.filter((r) => !r.passed)
				.forEach((r) => {
					console.log(
						`  - ${r.operation} (${r.nodeCount} nodes): ${r.durationMs.toFixed(2)}ms (exceeded ${r.thresholdMs}ms)`
					);
				});
		}

		console.log('\n=====================================\n');

		expect(failed).toBe(0);
	});
});
