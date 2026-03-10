import { Link } from 'react-router-dom';
import useScrollReveal from '../hooks/useScrollReveal';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Features() {
  useScrollReveal();

  return (
    <div className="marketing">
      <Navbar />

      {/* Hero */}
      <section className="hero" style={{ minHeight: '60vh' }}>
        <div className="hero__content">
          <span className="hero__eyebrow reveal">Feature Overview</span>
          <h1 className="hero__title reveal" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            Every Tool a <span className="hero__title-accent">DM Needs</span>
          </h1>
          <p className="hero__subtitle reveal">
            From initiative rolls to the final blow &mdash; manage every moment
            of combat with precision and speed.
          </p>
        </div>
      </section>

      {/* Feature Details */}
      <section className="section section--bordered">

        {/* Initiative Management */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap">&#9876;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Initiative Management</h2>
            <p className="feature-detail__desc">
              Add players, monsters, and NPCs with a single form. When combat
              starts, the app auto-rolls initiative for monsters and NPCs while
              you enter player rolls. Drag-and-drop to reorder at any time.
              The turn tracker advances automatically with Next/Previous controls.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Auto-Roll</span>
              <span className="feature-tag">Drag &amp; Drop</span>
              <span className="feature-tag">Turn Tracking</span>
            </div>
          </div>
        </div>

        {/* HP & Status Tracking */}
        <div className="feature-detail feature-detail--reverse feature-detail--red reveal">
          <div className="feature-detail__icon-wrap">&#9829;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">HP &amp; Status Tracking</h2>
            <p className="feature-detail__desc">
              Every combatant has a visual health bar that updates in real time.
              Apply damage or healing with a quick input. Set status conditions
              &mdash; hurt, bloody, or unconscious &mdash; that display as
              badges on both the DM and player views.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Health Bars</span>
              <span className="feature-tag">Damage &amp; Heal</span>
              <span className="feature-tag">Status Badges</span>
            </div>
          </div>
        </div>

        {/* Real-Time Player View */}
        <div className="feature-detail feature-detail--blue reveal">
          <div className="feature-detail__icon-wrap">&#128250;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Real-Time Player View</h2>
            <p className="feature-detail__desc">
              Open the player view in a separate browser tab on a TV or second
              monitor. It auto-syncs with the DM view via localStorage &mdash;
              no server, no login, no delay. The display is TV-optimized with
              large, readable text and auto-scaling for any number of combatants.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">TV-Optimized</span>
              <span className="feature-tag">Auto-Sync</span>
              <span className="feature-tag">No Login</span>
            </div>
          </div>
        </div>

        {/* Dice Roller */}
        <div className="feature-detail feature-detail--reverse feature-detail--purple reveal">
          <div className="feature-detail__icon-wrap">&#127922;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Built-In Dice Roller</h2>
            <p className="feature-detail__desc">
              Roll any standard die from d4 to d100 without leaving the
              tracker. Support for advantage, disadvantage, multiple dice,
              and modifiers. A full roll history panel keeps every result
              visible and auditable.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">d4 &ndash; d100</span>
              <span className="feature-tag">Advantage / Disadvantage</span>
              <span className="feature-tag">Roll History</span>
            </div>
          </div>
        </div>

        {/* Encounter Management */}
        <div className="feature-detail feature-detail--green reveal">
          <div className="feature-detail__icon-wrap">&#128190;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Encounter Management</h2>
            <p className="feature-detail__desc">
              Save encounters to your browser&rsquo;s local storage and reload
              them in future sessions. Export encounters as portable JSON files
              to share with other DMs or back up your data. Import files to
              instantly restore a full encounter state.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Save &amp; Load</span>
              <span className="feature-tag">JSON Export</span>
              <span className="feature-tag">Import</span>
            </div>
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="feature-detail feature-detail--reverse feature-detail--amber reveal">
          <div className="feature-detail__icon-wrap">&#8634;</div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Full Undo &amp; Redo</h2>
            <p className="feature-detail__desc">
              Made a mistake? Every action is tracked in a history stack.
              Undo and redo with toolbar buttons or keyboard shortcuts
              (Ctrl+Z / Ctrl+Y). Never lose progress because of a misclick.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">History Stack</span>
              <span className="feature-tag">Keyboard Shortcuts</span>
              <span className="feature-tag">Instant Revert</span>
            </div>
          </div>
        </div>

      </section>

      {/* CTA Banner */}
      <section className="cta-banner section--bordered">
        <h2 className="cta-banner__title reveal">Start Your Encounter</h2>
        <p className="cta-banner__subtitle reveal">
          No sign-up. No download. Open the app and roll initiative in seconds.
        </p>
        <Link to="/tracker" className="btn btn--lg btn--primary reveal">Launch App</Link>
      </section>

      <Footer />
    </div>
  );
}
