import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoSnapshotTimer } from '../AutoSnapshotTimer';
import { MemoryAdapter } from '../adapters/MemoryAdapter';
import { VersionHistoryManager } from '../VersionHistoryManager';
import type { ConversationSnapshot } from '../../persistence/schemas';

function makeSnapshot(): ConversationSnapshot {
	return {
		version: 2,
		createdAt: Date.now(),
		activeNodeId: null,
		nodes: [],
		customTags: []
	};
}

describe('AutoSnapshotTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires callback after interval', async () => {
		const manager = new VersionHistoryManager(new MemoryAdapter());
		let callCount = 0;
		const timer = new AutoSnapshotTimer(manager, 'conv-1', () => makeSnapshot(), {
			intervalMs: 5000
		});
		timer.onSnapshot = async () => {
			callCount++;
		};
		timer.start();
		await vi.advanceTimersByTimeAsync(5001);
		timer.stop();
		expect(callCount).toBe(1);
	});

	it('fires multiple times', async () => {
		const manager = new VersionHistoryManager(new MemoryAdapter());
		let callCount = 0;
		const timer = new AutoSnapshotTimer(manager, 'conv-1', () => makeSnapshot(), {
			intervalMs: 1000
		});
		timer.onSnapshot = async () => {
			callCount++;
		};
		timer.start();
		await vi.advanceTimersByTimeAsync(3500);
		timer.stop();
		expect(callCount).toBe(3);
	});

	it('stop prevents further fires', async () => {
		const manager = new VersionHistoryManager(new MemoryAdapter());
		let callCount = 0;
		const timer = new AutoSnapshotTimer(manager, 'conv-1', () => makeSnapshot(), {
			intervalMs: 1000
		});
		timer.onSnapshot = async () => {
			callCount++;
		};
		timer.start();
		await vi.advanceTimersByTimeAsync(1001);
		timer.stop();
		await vi.advanceTimersByTimeAsync(2000);
		expect(callCount).toBe(1);
	});

	it('saves snapshot to manager on fire', async () => {
		const adapter = new MemoryAdapter();
		const manager = new VersionHistoryManager(adapter);
		const timer = new AutoSnapshotTimer(manager, 'conv-test', () => makeSnapshot(), {
			intervalMs: 1000
		});
		timer.start();
		await vi.advanceTimersByTimeAsync(1001);
		timer.stop();
		const versions = await manager.listVersions('conv-test');
		expect(versions).toHaveLength(1);
		expect(versions[0].isAuto).toBe(true);
	});
});
