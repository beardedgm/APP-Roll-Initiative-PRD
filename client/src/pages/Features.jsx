import { Link } from 'react-router-dom';
import { Swords, Heart, Monitor, Dices, Save, RotateCcw, BookOpen, Scroll } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

export default function Features() {
  useScrollReveal();

  return (
    <div className="marketing">
      <SEO
        title="Features — Monsters, Spells, Dice Roller & More | Roll Initiative"
        description="Explore Roll Initiative's combat tools: 5,700+ D&D 5e and Pathfinder 2e monsters with full stat blocks, 3,600+ spells, built-in dice roller, real-time player view, and cloud encounter saves."
        path="/features"
      />
      <Navbar />

      {/* Hero */}
      <section className="hero" style={{ minHeight: '60vh' }}>
        <div className="hero__content">
          <span className="hero__eyebrow reveal">Feature Overview</span>
          <h1 className="hero__title reveal" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            Every Tool a <span className="hero__title-accent">DM Needs</span>
          </h1>
          <p className="hero__subtitle reveal">
            A complete D&amp;D encounter tracker and Pathfinder 2e initiative
            tracker &mdash; manage every moment of combat with precision and speed.
          </p>
        </div>
      </section>

      {/* Feature Details */}
      <section className="section section--bordered">

        {/* Initiative Management */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap"><Swords size={32} /></div>
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

        {/* Monster Database */}
        <div className="feature-detail feature-detail--reverse reveal">
          <div className="feature-detail__icon-wrap"><BookOpen size={32} /></div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">5,700+ Pre-Loaded Monsters</h2>
            <p className="feature-detail__desc">
              Try 20 iconic creatures in the free demo &mdash; from goblins to
              dragons. Full Access subscribers unlock the complete library of
              5,700+ monsters spanning D&amp;D 5e and Pathfinder 2e. Every
              creature includes a full stat block with clickable dice notation.
            </p>
            <p className="feature-detail__sources">
              <strong>D&amp;D 5e sources:</strong> SRD 5.1, SRD 5.2, Level Up:
              Advanced 5e, Black Flag Reference Document, Creature Codex, Tome
              of Beasts 1, 2, &amp; 3
            </p>
            <p className="feature-detail__sources">
              <strong>Pathfinder 2e sources:</strong> Bestiary 1&ndash;3,
              Gamemastery Guide, Advanced Player&rsquo;s Guide, Book of the Dead,
              Secrets of Magic, and 70+ adventure path bestiaries
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Free Demo</span>
              <span className="feature-tag">5e &amp; PF2e</span>
              <span className="feature-tag">Full Stat Blocks</span>
              <span className="feature-tag">Clickable Dice</span>
              <span className="feature-tag">Custom Monsters</span>
            </div>
          </div>
        </div>

        {/* Spell Library */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap"><Scroll size={32} /></div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">3,600+ Spells</h2>
            <p className="feature-detail__desc">
              Browse and search a complete spell library for D&amp;D 5e and
              Pathfinder 2e. Filter by level, school, tradition, or category
              to find the spell you need in seconds. Every spell includes a full
              description with clickable dice notation. Spell names in creature
              stat blocks are clickable &mdash; tap any spell to view its full
              description without leaving the encounter.
            </p>
            <p className="feature-detail__sources">
              <strong>D&amp;D 5e sources:</strong> SRD 5.1, SRD 5.2, Deep
              Magic, Level Up: Advanced 5e
            </p>
            <p className="feature-detail__sources">
              <strong>Pathfinder 2e sources:</strong> Core Rulebook, Advanced
              Player&rsquo;s Guide, Secrets of Magic, Gods &amp; Magic, Book of
              the Dead, Dark Archive, Rage of Elements, and 50+ adventure path
              supplements
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">5e &amp; PF2e</span>
              <span className="feature-tag">Full Descriptions</span>
              <span className="feature-tag">Clickable in Stat Blocks</span>
              <span className="feature-tag">Filter &amp; Search</span>
            </div>
          </div>
        </div>

        {/* HP & Status Tracking */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap"><Heart size={32} /></div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">HP &amp; Status Tracking</h2>
            <p className="feature-detail__desc">
              Every combatant&rsquo;s hit points are tracked with color-coded
              health indicators &mdash; green for healthy, yellow for hurt, red
              for bloody, and gray for unconscious. Apply damage or healing with
              a quick input. Status badges display on both the DM and player views
              so everyone knows who&rsquo;s still standing.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Color-Coded HP</span>
              <span className="feature-tag">Damage &amp; Heal</span>
              <span className="feature-tag">Status Badges</span>
            </div>
          </div>
        </div>

        {/* Real-Time Player View */}
        <div className="feature-detail feature-detail--reverse reveal">
          <div className="feature-detail__icon-wrap"><Monitor size={32} /></div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Real-Time Player View</h2>
            <p className="feature-detail__desc">
              Open the player view in a separate browser tab on a TV or second
              monitor. It syncs instantly with the DM view &mdash; no delay,
              no server required for local play. The display is TV-optimized
              with large, readable text and auto-scaling for any number of
              combatants. Premium users can generate shareable links for
              remote players on any device.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">TV-Optimized</span>
              <span className="feature-tag">Instant Sync</span>
              <span className="feature-tag">Shareable Links</span>
            </div>
          </div>
        </div>

        {/* Dice Roller */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap"><Dices size={32} /></div>
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
        <div className="feature-detail feature-detail--reverse reveal">
          <div className="feature-detail__icon-wrap"><Save size={32} /></div>
          <div className="feature-detail__text">
            <h2 className="feature-detail__title">Encounter Management</h2>
            <p className="feature-detail__desc">
              Save encounters to your browser&rsquo;s local storage and reload
              them in future sessions. Export your full account &mdash; encounters,
              characters, and custom monsters &mdash; as a portable JSON file from
              Settings. Premium users get cloud saves with cross-device sync and
              an encounter dashboard.
            </p>
            <div className="feature-detail__tags">
              <span className="feature-tag">Save &amp; Load</span>
              <span className="feature-tag">JSON Export</span>
              <span className="feature-tag">Cloud Sync</span>
            </div>
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="feature-detail reveal">
          <div className="feature-detail__icon-wrap"><RotateCcw size={32} /></div>
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
          The fastest D&amp;D initiative tracker online &mdash; with full
          Pathfinder 2e support. No sign-up, no download. Just open and play.
        </p>
        <Link to="/tracker" className="btn btn--lg btn--primary reveal">Launch App</Link>
      </section>

      <Footer />
    </div>
  );
}
