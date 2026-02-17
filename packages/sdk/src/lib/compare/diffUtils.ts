export type DiffType = 'same' | 'added' | 'removed';

export interface DiffSegment {
	type: DiffType;
	text: string;
}

/**
 * Computes word-level diff between two texts using Longest Common Subsequence (LCS).
 * Returns an array of diff segments with type 'same', 'added', or 'removed'.
 */
export function wordDiff(textA: string, textB: string): DiffSegment[] {
	const wordsA = tokenize(textA);
	const wordsB = tokenize(textB);

	const lcs = computeLCS(wordsA, wordsB);
	const segments: DiffSegment[] = [];

	let i = 0;
	let j = 0;
	let lcsIndex = 0;

	while (i < wordsA.length || j < wordsB.length) {
		const currentLCS = lcs[lcsIndex];

		if (lcsIndex < lcs.length && wordsA[i] === currentLCS && wordsB[j] === currentLCS) {
			// Both match the LCS: common word
			segments.push({ type: 'same', text: wordsA[i] });
			i++;
			j++;
			lcsIndex++;
		} else if (i < wordsA.length && (lcsIndex >= lcs.length || wordsA[i] !== currentLCS)) {
			// Word only in A: removed
			segments.push({ type: 'removed', text: wordsA[i] });
			i++;
		} else if (j < wordsB.length && (lcsIndex >= lcs.length || wordsB[j] !== currentLCS)) {
			// Word only in B: added
			segments.push({ type: 'added', text: wordsB[j] });
			j++;
		}
	}

	return segments;
}

/**
 * Tokenizes text into words and whitespace/punctuation.
 * Preserves whitespace as separate tokens for accurate reconstruction.
 */
function tokenize(text: string): string[] {
	// Match words (alphanumeric + apostrophes) OR whitespace OR punctuation
	const pattern = /\w+(?:'\w+)*|\s+|[^\w\s]+/g;
	return text.match(pattern) ?? [];
}

/**
 * Computes the Longest Common Subsequence (LCS) of two token arrays.
 * Uses dynamic programming with O(m*n) time and O(m*n) space.
 */
function computeLCS(tokensA: string[], tokensB: string[]): string[] {
	const m = tokensA.length;
	const n = tokensB.length;

	// DP table: dp[i][j] = length of LCS for tokensA[0..i-1] and tokensB[0..j-1]
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	// Fill DP table
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (tokensA[i - 1] === tokensB[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Backtrack to build LCS
	const lcs: string[] = [];
	let i = m;
	let j = n;

	while (i > 0 && j > 0) {
		if (tokensA[i - 1] === tokensB[j - 1]) {
			lcs.unshift(tokensA[i - 1]);
			i--;
			j--;
		} else if (dp[i - 1][j] > dp[i][j - 1]) {
			i--;
		} else {
			j--;
		}
	}

	return lcs;
}
