const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let scriptPromises = {};
let tokenClient;
let accessToken = '';

function loadScript(src) {
  if (!scriptPromises[src]) {
    scriptPromises[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.append(script);
    });
  }
  return scriptPromises[src];
}

export async function connectGoogleDrive(clientId) {
  if (!clientId) {
    throw new Error('Add a Google OAuth client ID in Settings first.');
  }
  await loadScript('https://accounts.google.com/gsi/client');
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  });
  await new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      accessToken = response.access_token;
      resolve(response);
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
  return true;
}

export async function listDriveBackups({ clientId, folder = 'appDataFolder' }) {
  await connectGoogleDrive(clientId);
  if (!accessToken) {
    throw new Error('Google Drive authentication failed.');
  }
  const spaces = folder === 'appDataFolder' ? 'appDataFolder' : 'drive';
  const query = encodeURIComponent(`mimeType='application/json' and name contains 'receipt'`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc`,
    { headers: { Authorization: 'Bearer ' + accessToken } },
  );
  if (!response.ok) {
    throw new Error(`Drive listing failed with status ${response.status}.`);
  }
  const data = await response.json();
  return data.files ?? [];
}

export async function downloadDriveFile(fileId) {
  if (!accessToken) {
    throw new Error('Not connected to Google Drive. Connect first.');
  }
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: 'Bearer ' + accessToken } },
  );
  if (!response.ok) {
    throw new Error(`Drive download failed with status ${response.status}.`);
  }
  return response.json();
}

export async function uploadBackupToDrive({ clientId, content, fileName, folder = 'appDataFolder' }) {
  await connectGoogleDrive(clientId);
  if (!accessToken) {
    throw new Error('Google Drive authentication failed.');
  }
  const metadata = {
    name: fileName || 'receipt-backup.json',
    parents: folder === 'appDataFolder' ? ['appDataFolder'] : undefined,
    mimeType: 'application/json',
  };
  const boundary = 'receipt-platform-boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    typeof content === 'string' ? content : JSON.stringify(content),
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Drive backup failed with status ${response.status}.`);
  }

  return response.json();
}
