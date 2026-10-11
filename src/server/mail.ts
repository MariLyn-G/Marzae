import { configLine, getProduct } from '@/lib/catalog';
import { type Order, STAGE_LABELS, type Stage } from '@/lib/orders';
import { env } from './env';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends through Resend when RESEND_API_KEY is set, otherwise logs to the server console.
 * Never throws: a failed email must not undo an order or a stage change.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const key = env.resendApiKey();
  if (!key) {
    console.info(`[mail] to=${mail.to} subject=${JSON.stringify(mail.subject)}\n${mail.text}\n`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.mailFrom(), to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) console.error(`[mail] Resend returned ${res.status}: ${await res.text()}`);
    return res.ok;
  } catch (err) {
    console.error('[mail] send failed', err);
    return false;
  }
}

export function mailConfigured(): boolean {
  return !!env.resendApiKey();
}

function lines(o: Order): string {
  return o.lines.map((l) => `  ${getProduct(l.productId)?.name ?? l.productId} × ${l.qty} — ${configLine(l)}`).join('\n');
}

export function signInMail(to: string, link: string): Mail {
  return {
    to,
    subject: 'Your Marzae sign-in link',
    text: `Sign in to Marzae:\n\n${link}\n\nThe link works once and expires in 15 minutes. If you did not ask for it, ignore this email.`,
  };
}

export function confirmationMail(o: Order): Mail {
  return {
    to: o.customer.email,
    subject: `Order ${o.id} — on the bench`,
    text: `${o.customer.name},\n\nWe have your order ${o.id}:\n\n${lines(o)}\n\nTotal €${o.totalEur}. Made to order in six to eight weeks. We write again when the panels are stitched and when the box ships.\n\nTrack it at ${env.appUrl()}/orders`,
  };
}

/** Emails sent when an order reaches a stage. Other stages are silent. */
export function stageMail(o: Order, stage: Stage): Mail | null {
  if (stage === 'stitching') {
    return {
      to: o.customer.email,
      subject: `Order ${o.id} — ${STAGE_LABELS.stitching.toLowerCase()}`,
      text: `${o.customer.name},\n\nThe panels for ${o.id} are cut and the stitching has started.\n\n${lines(o)}\n\n${env.appUrl()}/orders`,
    };
  }
  if (stage === 'shipped') {
    const track = o.tracking ? `Tracking number: ${o.tracking}` : 'We send the tracking number as soon as the carrier assigns it.';
    return {
      to: o.customer.email,
      subject: `Order ${o.id} has shipped`,
      text: `${o.customer.name},\n\n${o.id} has left the atelier. ${track}\n\n${env.appUrl()}/orders`,
    };
  }
  return null;
}
