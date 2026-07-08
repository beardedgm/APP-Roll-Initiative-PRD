import { Link } from 'react-router-dom';
import CombatantForm from './CombatantForm';

// f8: what free users see in the Characters tab. They can add their own party to
// the current encounter (persisted locally with the encounter) via the reused
// CombatantForm; the upsell strip points at the paid value — a reusable,
// cross-device Character Library.
export default function FreePartyPanel() {
  return (
    <div className="free-party">
      <CombatantForm />
      <div className="panel free-party__upsell">
        <p className="free-party__upsell-text">
          Characters you add here stay on this device. Save a reusable party
          library and sync it across your devices with Premium.
        </p>
        <Link to="/pricing" className="btn btn--primary btn--sm">Upgrade</Link>
      </div>
    </div>
  );
}
