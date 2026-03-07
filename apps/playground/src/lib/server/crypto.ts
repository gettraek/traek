import { env } from '$env/dynamic/private';

function getEncryptionKey(): ArrayBuffer {
	const secret = env.ENCRYPTION_SECRET;
	if (!secret || secret.length < 32) throw new Error('ENCRYPTION_SECRET must be at least 32 chars');
	return new TextEncoder().encode(secret.slice(0, 32)).buffer as ArrayBuffer;
}

async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptApiKey(
	plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
	const key = await importKey(getEncryptionKey());
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(plaintext);
	const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
	return {
		ciphertext: Buffer.from(encrypted).toString('base64'),
		iv: Buffer.from(iv).toString('base64')
	};
}

export async function decryptApiKey(ciphertext: string, iv: string): Promise<string> {
	const key = await importKey(getEncryptionKey());
	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
		key,
		Buffer.from(ciphertext, 'base64')
	);
	return new TextDecoder().decode(decrypted);
}
