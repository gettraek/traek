import { describe, it, expect, beforeEach } from 'vitest';
import { VersionHistoryManager } from '../VersionHistoryManager';
import { MemoryAdapter } from '../adapters/MemoryAdapter';
import type { ConversationSnapshot } from '../../persistence/schemas';

function makeSnapshot(nodeCount = 2): ConversationSnapshot {
	return {
		version: 2,
		createdAt: Date.now(),
		activeNodeId: null,
		nodes: Array.from({ length: nodeCount }, (_, i) => ({
			id: `node-${i}`,
			parentIds: [],
			content: `message ${i}`,
			role: 'user' as const,
			type: 'TEXT',
			status: 'done' as const,
			createdAt: Date.now(),
			metadata: { x: i * 10, y: 0 }
		})),
		customTags: []
	};
}

describe('VersionHistoryManager', () => {
	let manager: VersionHistoryManager;
	const CONV_ID = 'conv-001';

	beforeEach(() => {
		manager = new VersionHistoryManager(new MemoryAdapter(), {
			maxAutoSnapshots: 3,
			maxVersions: 5
		});
	});

	it('saves and lists versions', async () => {
		await manager.saveVersion(CONV_ID, makeSnapshot(), 'v1');
		const list = await manager.listVersions(CONV_ID);
		expect(list).toHaveLength(1);
		expect(list[0].label).toBe('v1');
		expect(list[0].isAuto).toBe(false);
	});

	it('getVersion retrieves by id', async () => {
		await manager.saveVersion(CONV_ID, makeSnapshot(), 'v1');
		const list = await manager.listVersions(CONV_ID);
		const entry = await manager.getVersion(list[0].id);
		expect(entry).not.toBeNull();
		expect(entry!.label).toBe('v1');
	});

	it('deleteVersion removes entry', async () => {
		await manager.saveVersion(CONV_ID, makeSnapshot(), 'v1');
		const list = await manager.listVersions(CONV_ID);
		await manager.deleteVersion(list[0].id);
		expect(await manager.listVersions(CONV_ID)).toHaveLength(0);
	});

	it('saveAutoSnapshot marks isAuto=true', async () => {
		await manager.saveAutoSnapshot(CONV_ID, makeSnapshot());
		const list = await manager.listVersions(CONV_ID);
		expect(list[0].isAuto).toBe(true);
	});

	it('prunes oldest auto snapshots beyond maxAutoSnapshots', async () => {
		for (let i = 0; i < 5; i++) {
			await manager.saveAutoSnapshot(CONV_ID, makeSnapshot(i + 1));
		}
		const list = await manager.listVersions(CONV_ID);
		const autoOnly = list.filter((e) => e.isAuto);
		expect(autoOnly.length).toBeLessThanOrEqual(3);
	});

	it('export/import round-trip', async () => {
		await manager.saveVersion(CONV_ID, makeSnapshot(3), 'exported');
		const list = await manager.listVersions(CONV_ID);
		const json = await manager.exportVersion(list[0].id);
		expect(typeof json).toBe('string');

		const imported = await manager.importVersion(CONV_ID, json);
		expect(imported.snapshot.nodes).toHaveLength(3);
	});

	it('diffVersions returns structural diff', async () => {
		const snap1 = makeSnapshot(2);
		const snap2 = makeSnapshot(4);
		await manager.saveVersion(CONV_ID, snap1, 'v1');
		await manager.saveVersion(CONV_ID, snap2, 'v2');
		const list = await manager.listVersions(CONV_ID);
		// list is sorted newest-first
		const diff = await manager.diffVersions(list[1].id, list[0].id);
		expect(diff.addedNodeIds).toHaveLength(2);
		expect(diff.nodeCountBefore).toBe(2);
		expect(diff.nodeCountAfter).toBe(4);
	});
});
