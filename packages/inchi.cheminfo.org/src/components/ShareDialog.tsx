import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  H6,
} from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { useState } from 'react';

import { state } from '../state/index.ts';
import type { HideKey, ShareConfig } from '../state/shareConfig.ts';
import {
  applyShareConfig,
  isShareConfigured,
  shareConfig,
  stringifyParams,
} from '../state/shareConfig.ts';
import { defaultShareConfig, shareOptionsOf } from '../state/shareOptions.ts';

/**
 * Build a link to the page as it is set up now, and the iframe that frames it
 * in another site. What the page is working on comes from the address; what a
 * visitor may change comes from this dialog.
 * @param props - Component props.
 * @param props.isOpen - Whether the dialog is on screen.
 * @param props.onClose - Called when the dialog is dismissed.
 * @returns The share dialog.
 */
export function ShareDialog(props: { isOpen: boolean; onClose: () => void }) {
  useSignals();
  const options = shareOptionsOf(state.view.tab.value);
  // The dialog opens on the link one actually hands out — a tile inside
  // another page, without the parts that page has no use for. A playground
  // already running a configuration shows that one instead of resetting it.
  const [draft, setDraft] = useState<ShareConfig>(() =>
    isShareConfigured(shareConfig) ? shareConfig : defaultShareConfig(options),
  );

  function setHidden(key: HideKey, hidden: boolean): void {
    setDraft((previous) => {
      const rest = previous.hidden.filter((entry) => entry !== key);
      return { ...previous, hidden: hidden ? [...rest, key] : rest };
    });
  }

  const hidden = new Set(draft.hidden);
  const url = buildUrl(draft);

  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Share or embed"
      icon="share"
      className="share-dialog"
    >
      <div className="share-link">
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          A link to <b>{options.title}</b> as you have it set up now.
        </p>
        <pre className="mono share-url">{url}</pre>
        <div className="share-link-actions">
          <CopyTextButton text="Copy the link" value={url} />
          <CopyTextButton
            text="Copy the iframe"
            value={buildIframe(url, options.title)}
          />
          <Button
            icon="share"
            onClick={() => globalThis.open(url, '_blank', 'noopener')}
          >
            Open in a new tab
          </Button>
        </div>
      </div>

      <DialogBody>
        <section className="share-section">
          <H6>Layout</H6>
          <Checkbox
            checked={draft.embed}
            label="Frame it: no title, no header"
            onChange={(event) => {
              const embed = event.currentTarget.checked;
              setDraft((previous) => ({ ...previous, embed }));
            }}
          />
        </section>

        <section className="share-section">
          <H6>Show on the page</H6>
          {options.features.map((feature) => (
            <div key={feature.key} className="share-feature">
              <Checkbox
                checked={!hidden.has(feature.key)}
                disabled={feature.needsHeader && draft.embed}
                label={feature.label}
                onChange={(event) =>
                  setHidden(feature.key, !event.currentTarget.checked)
                }
              />
              <div className="muted share-feature-description">
                {feature.description}
              </div>
            </div>
          ))}
        </section>
      </DialogBody>

      <DialogFooter
        actions={
          <Button intent="primary" text="Done" onClick={props.onClose} />
        }
      />
    </Dialog>
  );
}

function CopyTextButton(props: { text: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      icon={copied ? 'tick' : 'duplicate'}
      onClick={() => {
        void navigator.clipboard?.writeText(props.value).then(() => {
          setCopied(true);
          globalThis.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {props.text}
    </Button>
  );
}

/**
 * The address of the playground as it stands, with the share configuration
 * written into its query. The hash is kept as it is: that is where the tab and
 * the step or exercise on show already live.
 * @param config - What the link switches off.
 * @returns The address to hand out.
 */
function buildUrl(config: ShareConfig): string {
  const { origin, pathname, search, hash } = globalThis.location;
  const params = new URLSearchParams(search);
  applyShareConfig(params, config);
  const query = stringifyParams(params);
  return `${origin}${pathname}${query ? `?${query}` : ''}${hash}`;
}

function buildIframe(url: string, title: string): string {
  return `<iframe src="${url}" title="InChI playground — ${title}" width="100%" height="800" style="border: 1px solid #d1d5db; border-radius: 6px"></iframe>`;
}
