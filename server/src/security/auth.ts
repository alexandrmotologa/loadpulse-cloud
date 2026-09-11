import crypto from 'node:crypto';

/**
 * Validates Telegram Mini App initData string using HMAC-SHA256.
 * In development or when botToken is absent, gracefully accepts requests.
 */
export function validateTelegramInitData(initData: string, botToken?: string): boolean {
  if (!botToken || botToken === 'mock_token' || process.env.DEMO_MODE === 'true') {
    return true;
  }

  if (!initData) {
    return false;
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const params: string[] = [];
    urlParams.forEach((val, key) => {
      params.push(`${key}=${val}`);
    });
    params.sort();
    const dataCheckString = params.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return computedHash === hash;
  } catch {
    return false;
  }
}
