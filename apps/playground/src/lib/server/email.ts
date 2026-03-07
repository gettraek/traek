import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let _resend: Resend | null = null;
function resend(): Resend {
	if (!_resend) {
		if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
		_resend = new Resend(env.RESEND_API_KEY);
	}
	return _resend;
}

const EMAIL_STYLES = `
	body{margin:0;padding:0;background:#0b0b0b;font-family:'Helvetica Neue',Arial,sans-serif}
	.wrap{max-width:520px;margin:0 auto;padding:40px 24px}
	.logo{font-size:22px;font-weight:700;letter-spacing:-0.04em;color:#f0f0f0;margin-bottom:32px}
	.logo span{color:#a0a0a0;font-weight:400;font-size:14px;margin-left:6px}
	.card{background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px}
	h1{font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 12px;letter-spacing:-0.02em}
	p{font-size:14px;color:#a0a0a0;line-height:1.6;margin:0 0 20px}
	.btn{display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00d8ff,#00ffa3);color:#000;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px}
	.url{font-size:12px;font-family:monospace;color:#666;word-break:break-all;margin-top:16px}
	.footer{margin-top:28px;font-size:12px;color:#444;text-align:center}
	.footer a{color:#666;text-decoration:none}
`;

export async function sendMagicLink(email: string, token: string, appUrl: string): Promise<void> {
	const link = `${appUrl}/api/auth/verify?token=${token}`;
	const from = env.RESEND_FROM ?? 'noreply@gettraek.com';
	const { error } = await resend().emails.send({
		from,
		to: email,
		subject: 'Your sign-in link for træk Playground',
		html: `<!doctype html><html><head><meta charset="utf-8"><style>${EMAIL_STYLES}</style></head>
<body><div class="wrap">
  <div class="logo">tr&#230;k <span>Playground</span></div>
  <div class="card">
    <h1>Sign in to Playground</h1>
    <p>Click the button below to sign in. This link expires in 15&nbsp;minutes and can only be used once.</p>
    <a href="${link}" class="btn">Sign in to Playground</a>
    <p class="url">Or copy this URL:<br>${link}</p>
  </div>
  <div class="footer">
    If you didn&apos;t request this, you can safely ignore this email.<br>
    <a href="https://gettraek.com">gettraek.com</a>
  </div>
</div></body></html>`
	});
	if (error) throw new Error(`Failed to send magic link: ${error.message}`);
}

export async function sendWaitlistConfirmation(email: string): Promise<void> {
	const from = env.RESEND_FROM ?? 'noreply@gettraek.com';
	const { error } = await resend().emails.send({
		from,
		to: email,
		subject: "You're on the træk Playground waitlist",
		html: `<!doctype html><html><head><meta charset="utf-8"><style>${EMAIL_STYLES}</style></head>
<body><div class="wrap">
  <div class="logo">tr&#230;k <span>Playground</span></div>
  <div class="card">
    <h1>You&apos;re on the list.</h1>
    <p>Thanks for joining the tr&#230;k Playground waitlist. We&apos;ll reach out as soon as early access opens.</p>
    <p>In the meantime, you can explore the open-source library &mdash; no account needed.</p>
    <a href="https://gettraek.com/demo/explore" class="btn">Try the canvas demo</a>
  </div>
  <div class="footer">
    You&apos;re receiving this because you joined the waitlist at
    <a href="https://gettraek.com/playground">gettraek.com/playground</a>.<br>
    <a href="https://gettraek.com">gettraek.com</a>
  </div>
</div></body></html>`
	});
	if (error) throw new Error(`Failed to send waitlist confirmation: ${error.message}`);
}
