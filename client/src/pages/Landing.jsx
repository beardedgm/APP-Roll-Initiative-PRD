import { Link } from 'react-router-dom';
import { Swords, Monitor, Heart, Dices, BookOpen, Scroll, Check } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

const APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Roll Initiative',
  description: 'Free online initiative tracker for D&D 5e and Pathfinder 2e with 5,700+ monsters, 3,600+ spells, dice roller, and real-time player view.',
  url: 'https://rollinitiative.app',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '6',
    priceCurrency: 'USD',
    offerCount: 2,
  },
};

export default function Landing() {
  useScrollReveal();

  return (
    <div className="marketing">
      <SEO
        title="Roll Initiative — Free D&D 5e & Pathfinder 2e Initiative Tracker"
        description="Free online initiative tracker for D&D 5e and Pathfinder 2e. Manage combat with 5,700+ monsters, 3,600+ spells, built-in dice roller, and real-time player view. No sign-up required."
        path="/"
        jsonLd={APP_SCHEMA}
      />
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero__particles" aria-hidden="true">
          <span className="hero__mote hero__mote--diamond" style={{ top: '15%', left: '7%', animationDelay: '-5s' }} />
          <span className="hero__mote hero__mote--dot hero__mote--gold" style={{ top: '22%', left: '25%', animationDelay: '-12s' }} />
          <span className="hero__mote hero__mote--hex hero__mote--lg" style={{ top: '18%', right: '10%', animationDelay: '-20s' }} />
          <span className="hero__mote hero__mote--diamond hero__mote--blue hero__mote--sm" style={{ top: '55%', left: '5%', animationDelay: '-8s' }} />
          <span className="hero__mote hero__mote--dot hero__mote--blue" style={{ top: '35%', left: '40%', animationDelay: '-30s' }} />
          <span className="hero__mote hero__mote--hex hero__mote--sm" style={{ top: '70%', right: '20%', animationDelay: '-15s' }} />
          <span className="hero__mote hero__mote--diamond hero__mote--lg" style={{ top: '45%', right: '6%', animationDelay: '-25s' }} />
          <span className="hero__mote hero__mote--dot hero__mote--red" style={{ top: '75%', left: '30%', animationDelay: '-3s' }} />
          <span className="hero__mote hero__mote--hex hero__mote--blue" style={{ top: '80%', left: '12%', animationDelay: '-18s' }} />
          <span className="hero__mote hero__mote--diamond hero__mote--red hero__mote--sm" style={{ top: '30%', right: '30%', animationDelay: '-35s' }} />
          <span className="hero__mote hero__mote--dot" style={{ top: '65%', right: '35%', animationDelay: '-22s' }} />
          <span className="hero__mote hero__mote--hex hero__mote--lg hero__mote--gold" style={{ top: '50%', left: '50%', animationDelay: '-40s' }} />
        </div>
        <div className="hero__content">
          <span className="hero__eyebrow reveal">D&amp;D 5e &amp; Pathfinder 2e Combat Tracker</span>
          <h1 className="hero__title reveal">
            Command the<br /><span className="hero__title-accent">Battlefield</span>
          </h1>
          <p className="hero__subtitle reveal">
            The D&amp;D encounter tracker built for speed. Try the demo free
            with 20 iconic monsters and 3,600+ spells &mdash; or unlock all
            5,700+ creatures with Full Access.
          </p>
          <div className="hero__actions reveal">
            <Link to="/tracker" className="btn btn--lg btn--primary">Launch App</Link>
            <Link to="/features" className="btn btn--lg btn--ghost">See Features</Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="section section--bordered">
        <div className="section__header">
          <div className="section__eyebrow reveal">Core Features</div>
          <h2 className="section__title reveal">Everything You Need at the Table</h2>
          <p className="section__subtitle reveal">
            Built by a DM, for DMs. A fast, focused D&amp;D initiative tracker
            with full Pathfinder 2e support &mdash; no accounts, no installs, no bloat.
          </p>
        </div>

        <div className="features-grid features-grid--five reveal-stagger">
          <div className="feature-card feature-card--blue reveal">
            <div className="feature-card__icon"><Monitor size={28} /></div>
            <h3 className="feature-card__title">Real-Time Player Display</h3>
            <p className="feature-card__desc">
              Open the player view on a TV or second monitor. Initiative order,
              active turn, and status updates sync instantly &mdash; no login required.
            </p>
          </div>

          <div className="feature-card reveal">
            <div className="feature-card__icon"><Heart size={28} /></div>
            <h3 className="feature-card__title">HP &amp; Status Tracking</h3>
            <p className="feature-card__desc">
              Track hit points with color-coded health indicators. Apply damage,
              heal, and watch status badges update in real time on both DM and
              player views.
            </p>
          </div>

          <div className="feature-card feature-card--red reveal">
            <div className="feature-card__icon"><Dices size={28} /></div>
            <h3 className="feature-card__title">Built-In Dice Roller</h3>
            <p className="feature-card__desc">
              Roll any die from d4 to d100 with advantage, disadvantage, and
              modifiers. Full roll history keeps everything transparent.
            </p>
          </div>

          <div className="feature-card feature-card--green reveal">
            <div className="feature-card__icon"><BookOpen size={28} /></div>
            <h3 className="feature-card__title">5,700+ Monsters</h3>
            <p className="feature-card__desc">
              Try 20 iconic creatures free. Subscribe for the full library &mdash;
              5,700+ monsters from D&amp;D 5e and Pathfinder 2e with full stat
              blocks and clickable dice.
            </p>
          </div>

          <div className="feature-card feature-card--purple reveal">
            <div className="feature-card__icon"><Scroll size={28} /></div>
            <h3 className="feature-card__title">3,600+ Spells</h3>
            <p className="feature-card__desc">
              Browse spells from D&amp;D 5e and Pathfinder 2e. Filter by level,
              school, tradition, or category. Spell names in stat blocks are
              clickable &mdash; tap to view full descriptions mid-combat.
            </p>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="section section--alt">
        <div className="showcase">
          <div className="showcase__text reveal">
            <div className="section__eyebrow">Designed for the DM Screen</div>
            <h2 className="showcase__title">Your Command Center for Combat</h2>
            <p className="showcase__desc">
              The DM view gives you full control. Add combatants on the fly,
              drag to reorder initiative, deal damage with a click, and advance
              turns without breaking the narrative flow.
            </p>
            <ul className="showcase__list">
              <li>
                <span className="showcase__list-icon"><Check size={16} /></span>
                Drag-and-drop initiative reordering
              </li>
              <li>
                <span className="showcase__list-icon"><Check size={16} /></span>
                One-click damage, healing, and status changes
              </li>
              <li>
                <span className="showcase__list-icon"><Check size={16} /></span>
                20 demo monsters free, 5,700+ with Full Access
              </li>
              <li>
                <span className="showcase__list-icon"><Check size={16} /></span>
                Save and load encounters for recurring sessions
              </li>
              <li>
                <span className="showcase__list-icon"><Check size={16} /></span>
                Full undo/redo with keyboard shortcuts
              </li>
            </ul>
          </div>

          <div className="showcase__visual reveal">
            <div className="showcase__mockup">
              <div className="mockup-list">
                <div className="mockup-item mockup-item--active">
                  <span className="mockup-item__name">&#9654; Aragorn</span>
                  <span className="mockup-item__score">18</span>
                </div>
                <div className="mockup-item mockup-item--monster">
                  <span className="mockup-item__name">Goblin Chief</span>
                  <span className="mockup-item__score">14</span>
                </div>
                <div className="mockup-item">
                  <span className="mockup-item__name">Legolas</span>
                  <span className="mockup-item__score">12</span>
                </div>
                <div className="mockup-item mockup-item--npc">
                  <span className="mockup-item__name">Elrond</span>
                  <span className="mockup-item__score">9</span>
                </div>
                <div className="mockup-item mockup-item--monster">
                  <span className="mockup-item__name">Orc Warrior</span>
                  <span className="mockup-item__score">7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner section--bordered">
        <h2 className="cta-banner__title reveal">Ready to Roll Initiative?</h2>
        <p className="cta-banner__subtitle reveal">
          Whether you run D&amp;D 5e or Pathfinder 2e, your next encounter is
          seconds away. No sign-up, no download &mdash; just open and play.
        </p>
        <div className="hero__actions reveal">
          <Link to="/tracker" className="btn btn--lg btn--primary">Launch App</Link>
          <Link to="/pricing" className="btn btn--lg btn--ghost">See Pricing</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
