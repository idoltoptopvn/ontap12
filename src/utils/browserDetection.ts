// Detection and helper utilities for Facebook / Messenger In-App Browser (IAB)

export function isFacebookBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Allow URL override for testing/debugging: ?test_fb=1
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_fb') === '1') {
      return true;
    }
  } catch {
    // ignore
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  // Facebook app, Messenger, Orca (Android Messenger), FB_IAB, Instagram Meta WebKit
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger|Orca|FBSS|Instagram/i.test(ua);
}

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function getRecommendedBrowserName(): string {
  if (isIOS()) return 'Safari';
  if (isAndroid()) return 'Chrome';
  return 'Safari hoặc Chrome';
}

export function buildExternalUrl(params: {
  key?: string;
  transferToken?: string;
}): string {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.href);

  // Remove test_fb if present to not re-trigger banner on Safari/Chrome
  url.searchParams.delete('test_fb');

  if (params.key) {
    url.searchParams.set('key', params.key);
  }
  if (params.transferToken) {
    url.searchParams.set('transfer_token', params.transferToken);
  }

  return url.toString();
}

export function createAndroidIntentUrl(targetUrl: string): string {
  const urlWithoutProtocol = targetUrl.replace(/^https?:\/\//i, '');
  return `intent://${urlWithoutProtocol}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
}
