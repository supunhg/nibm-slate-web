import { createECDH } from 'crypto';
import { NextResponse } from 'next/server';
import { isWebPushConfigured } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

/**
 * Yes/no checks on the Web Push (VAPID) configuration, without revealing any
 * key material: are the variables present, does the private key actually
 * belong to the public key, and is the subject a mailto:/https: URL.
 */
export function GET() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  let keyPairMatches = false;
  if (pub && priv) {
    try {
      const ecdh = createECDH('prime256v1');
      ecdh.setPrivateKey(Buffer.from(priv, 'base64url'));
      keyPairMatches = ecdh.getPublicKey().toString('base64url') === pub;
    } catch {
      keyPairMatches = false;
    }
  }

  return NextResponse.json(
    {
      publicKeySet: Boolean(pub),
      privateKeySet: Boolean(priv),
      subjectSet: Boolean(subject),
      subjectValid: Boolean(subject && /^(mailto:[^@\s]+@[^@\s]+\.[^@\s]+|https:\/\/\S+)$/.test(subject)),
      keyPairMatches,
      webPushEnabled: isWebPushConfigured(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
