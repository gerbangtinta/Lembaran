import { useState } from 'react';
import {
  cloudConfig,
  rememberClientId,
  rememberTenant,
  storedClientId,
  storedTenant,
} from '@lembaran/framework';

interface Props {
  onClose(): void;
  /** the id is saved: carry on to the sign-in */
  onReady(): void;
}

/**
 * OneDrive needs one value that only the account owner can create: the application (client) id of an Entra app
 * registration. This asks for it once and keeps it on this device, so a build that shipped without one is not a
 * dead end. A client id is public — a single-page app has no secret.
 */
export function OneDriveSetup({ onClose, onReady }: Props) {
  const [clientId, setClientId] = useState(storedClientId());
  const [tenant, setTenant] = useState(storedTenant());
  const ready = clientId.trim().length > 0;
  /** the address MSAL will actually return to: localhost in development, the site's own URL in a build */
  const redirectUri = cloudConfig().redirectUri || `${window.location.origin}/`;
  const local = redirectUri.includes('localhost');

  return (
    <div
      className="hub-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="hub-overlay-panel hub-setup-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Set up OneDrive"
      >
        <header className="hub-overlay-head">
          <div>
            <h2 className="lb-label">OneDrive</h2>
            <span className="hub-overlay-title">Set it up once</span>
          </div>
          <button type="button" className="lb-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="hub-overlay-body">
          <p className="hub-note">
            A drive is reached through an app registration, and <strong>one registration serves everyone who uses a
            copy of this app</strong>: each person signs in with their own Microsoft account, and nothing of theirs
            is copied anywhere. Whoever hosts the app creates it once — Lembaran never sees a password. Five steps
            in the Entra admin centre:
          </p>
          <ol className="hub-setup-steps">
            <li>
              <strong>App registrations → New registration</strong>, supported account types{' '}
              <em>Accounts in any organizational directory … and personal Microsoft accounts</em> — that one lets both
              a personal and a work OneDrive sign in.
            </li>
            <li>
              Platform <strong>Single-page application</strong>, redirect URI <code>{redirectUri}</code> — this very
              page. The registration form holds only one URI: register, then{' '}
              <strong>Authentication → Add a platform → Single-page application → Add URI</strong> as many times as
              you have addresses (this one, <code>http://localhost:5173/</code> for development, your deployed
              origin). Leave the token boxes unchecked; the library uses the authorisation-code flow.
            </li>
            <li>
              API permissions (delegated): <code>Files.ReadWrite</code> and <code>User.Read</code>, then{' '}
              <em>Grant admin consent</em> if the organisation requires it.
            </li>
            <li>
              Copy the <strong>Application (client) id</strong> from Overview — not the secret, a SPA has none.
            </li>
            <li>Paste it here.</li>
          </ol>

          <label className="lb-field hub-setup-field">
            <span>Application (client) id</span>
            <input
              type="text"
              value={clientId}
              placeholder="00000000-0000-0000-0000-000000000000"
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setClientId(event.target.value)}
              aria-label="OneDrive application client id"
            />
          </label>
          <label className="lb-field hub-setup-field">
            <span>Tenant (optional)</span>
            <input
              type="text"
              value={tenant}
              placeholder="common"
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setTenant(event.target.value)}
              aria-label="OneDrive tenant"
            />
          </label>
          <p className="hub-note hub-note-tight">
            <code>common</code> matches the registration above. Use <code>consumers</code> if it was created as{' '}
            <em>Personal Microsoft accounts only</em>, and your directory id (or <code>you.onmicrosoft.com</code>) if
            it was created as <em>this organizational directory only</em> — a work-only registration answers{' '}
            <code>unauthorized_client … not enabled for consumers</code> through <code>common</code>. Both values stay
            on this device; a whole build can carry them as <code>VITE_MS_CLIENT_ID</code> and{' '}
            <code>VITE_MS_TENANT</code> in <code>.env.local</code>.
          </p>
          {!local && (
            <p className="hub-note hub-note-tight">
              This is a hosted copy, so the id entered here applies to this browser only. The site's maintainer can
              set <code>VITE_MS_CLIENT_ID</code> and rebuild once, and OneDrive then works for every visitor without
              this step.
            </p>
          )}

          <div className="hub-invite-actions">
            <button type="button" className="lb-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="lb-primary"
              disabled={!ready}
              onClick={() => {
                rememberClientId(clientId);
                rememberTenant(tenant);
                onReady();
              }}
            >
              Save and sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
