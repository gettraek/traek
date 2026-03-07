export type Database = {
	public: {
		Tables: {
			users: {
				Row: { id: string; email: string; created_at: string };
				Insert: { id?: string; email: string; created_at?: string };
				Update: { id?: string; email?: string; created_at?: string };
				Relationships: [];
			};
			sessions: {
				Row: { id: string; user_id: string; expires_at: string; users?: { id: string } };
				Insert: { id: string; user_id: string; expires_at: string };
				Update: { expires_at?: string };
				Relationships: [
					{
						foreignKeyName: 'sessions_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			magic_link_tokens: {
				Row: {
					id: string;
					user_id: string;
					token_hash: string;
					expires_at: string;
					used_at: string | null;
				};
				Insert: {
					id?: string;
					user_id: string;
					token_hash: string;
					expires_at: string;
					used_at?: string | null;
				};
				Update: { used_at?: string | null };
				Relationships: [];
			};
			user_profiles: {
				Row: {
					user_id: string;
					encrypted_api_keys: Record<string, { ciphertext: string; iv: string }> | null;
					stripe_customer_id: string | null;
					stripe_subscription_id: string | null;
					tier: 'free' | 'pro' | 'team';
				};
				Insert: {
					user_id: string;
					encrypted_api_keys?: Record<string, { ciphertext: string; iv: string }> | null;
					stripe_customer_id?: string | null;
					stripe_subscription_id?: string | null;
					tier?: 'free' | 'pro' | 'team';
				};
				Update: {
					encrypted_api_keys?: Record<string, { ciphertext: string; iv: string }> | null;
					stripe_customer_id?: string | null;
					stripe_subscription_id?: string | null;
					tier?: 'free' | 'pro' | 'team';
				};
				Relationships: [];
			};
			shares: {
				Row: {
					id: string;
					token: string;
					conversation_id: string;
					user_id: string;
					snapshot: unknown;
					created_at: string;
				};
				Insert: {
					id?: string;
					token: string;
					conversation_id: string;
					user_id: string;
					snapshot: unknown;
					created_at?: string;
				};
				Update: { token?: string; conversation_id?: string; snapshot?: unknown };
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
};
