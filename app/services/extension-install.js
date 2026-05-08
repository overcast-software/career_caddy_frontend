import Service from '@ember/service';

// Single source of truth for the install CTA shown on /get-started and
// elsewhere. Detects the browser from userAgent and returns the right
// store URL + label. Firefox AMO listing isn't live yet (per Operations
// notes — submission checklist exists but the .xpi hasn't shipped),
// so Firefox returns `available: false` and routes to the Chrome
// fallback copy.
const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/pjdajamkhjkemoaogohehcdpfkocofhd';

function detectBrowser(ua) {
  if (typeof ua !== 'string') return 'other';
  // Order matters — Edge/Opera/Brave include "Chrome" too, but they
  // accept Chrome Web Store extensions, so coalescing them under
  // 'chrome' is the right call.
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua)) return 'chrome'; // Edge — uses CWS
  if (/OPR\//.test(ua)) return 'chrome'; // Opera — uses CWS
  if (/Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  return 'other';
}

export default class ExtensionInstallService extends Service {
  get browser() {
    if (typeof navigator === 'undefined') return 'other';
    return detectBrowser(navigator.userAgent || '');
  }

  /** Install link descriptor for the current browser.
   *
   * Shape: { url, label, available }
   * - `available: false` means we don't have a published listing for
   *   this browser yet — UI should show fallback copy rather than a
   *   primary install button. */
  get installLink() {
    switch (this.browser) {
      case 'chrome':
        return {
          url: CHROME_STORE_URL,
          label: 'Install the Chrome extension',
          available: true,
        };
      case 'firefox':
        return {
          url: CHROME_STORE_URL,
          label: 'Firefox add-on — coming soon',
          available: false,
        };
      case 'safari':
        return {
          url: CHROME_STORE_URL,
          label: 'Safari extension — not yet supported',
          available: false,
        };
      default:
        return {
          url: CHROME_STORE_URL,
          label: 'Install on a Chromium browser',
          available: false,
        };
    }
  }
}
