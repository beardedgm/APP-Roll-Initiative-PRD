import { useState } from 'react';
import { Copy, Check, Unlink, Link2 } from 'lucide-react';
import Modal from '../ui/Modal';
import SubscriptionGate from '../layout/SubscriptionGate';
import useCombatStore from '../../store/useCombatStore';
import { useShareEncounter, useUnshareEncounter } from '../../api/useEncounters';

export default function ShareLinkModal() {
  const [copied, setCopied] = useState(false);

  const cloudId = useCombatStore(s => s.cloudId);
  const shareCode = useCombatStore(s => s.shareCode);
  const setShareCode = useCombatStore(s => s.setShareCode);

  const shareMutation = useShareEncounter();
  const unshareMutation = useUnshareEncounter();

  const shareUrl = shareCode
    ? `${window.location.origin}/play/${shareCode}`
    : '';

  async function handleGenerate() {
    if (!cloudId) return;
    const result = await shareMutation.mutateAsync(cloudId);
    setShareCode(result.shareCode);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUnshare() {
    if (!cloudId) return;
    await unshareMutation.mutateAsync(cloudId);
    setShareCode(null);
  }

  return (
    <Modal id="share-link" title="Share Player View">
      <SubscriptionGate>
        {!cloudId ? (
          <p className="share-modal__message">
            Your encounter needs to be saved to the cloud before sharing.
            Add some combatants and it will sync automatically.
          </p>
        ) : !shareCode ? (
          <div className="share-modal__generate">
            <p className="share-modal__message">
              Generate a link your players can open on any device to see the
              initiative order and turn status in real time.
            </p>
            <button
              className="btn btn--primary"
              onClick={handleGenerate}
              disabled={shareMutation.isPending}
            >
              <Link2 size={16} />
              {shareMutation.isPending ? 'Generating...' : 'Generate Link'}
            </button>
          </div>
        ) : (
          <div className="share-modal__active">
            <p className="share-modal__message">
              Share this link with your players. They can open it on any device
              to follow along in real time.
            </p>
            <div className="share-modal__url-row">
              <input
                type="text"
                className="share-modal__url"
                value={shareUrl}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button
                className="btn btn--primary share-modal__copy-btn"
                onClick={handleCopy}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              className="btn btn--ghost share-modal__unshare-btn"
              onClick={handleUnshare}
              disabled={unshareMutation.isPending}
            >
              <Unlink size={16} />
              {unshareMutation.isPending ? 'Revoking...' : 'Stop Sharing'}
            </button>
          </div>
        )}
      </SubscriptionGate>
    </Modal>
  );
}
