import { Link } from 'react-router-dom';
import useScrollReveal from '../hooks/useScrollReveal';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Landing() {
  useScrollReveal();

  return (
    <div className="marketing">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero__content">
          <span className="hero__eyebrow reveal">D&amp;D 5e Combat Manager</span>
          <h1 className="hero__title reveal">
            Command the<br /><span className="hero__title-accent">Battlefield</span>
          </h1>
          <p className="hero__subtitle reveal">
            A refined initiative tracker that keeps combat fast, organized, and
            immersive. Manage HP, roll dice, and share the turn order with your
            players in real time.
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
            Built by a DM, for DMs. No accounts, no installs, no bloat &mdash;
            just fast, focused combat management.
          </p>
        </div>

        <div className="features-grid reveal-stagger">
          <div className="feature-card feature-card--blue reveal">
            <div className="feature-card__icon">&#128250;</div>
            <h3 className="feature-card__title">Real-Time Player Display</h3>
            <p className="feature-card__desc">
              Open the player view on a TV or second monitor. Initiative order,
              active turn, and status updates sync instantly &mdash; no login required.
            </p>
          </div>

          <div className="feature-card reveal">
            <div className="feature-card__icon">&#9829;</div>
            <h3 className="feature-card__title">HP &amp; Status Tracking</h3>
            <p className="feature-card__desc">
              Track hit points with visual health bars. Apply damage, heal, and
              set status conditions. Players see who&rsquo;s hurt, bloody, or down.
            </p>
          </div>

          <div className="feature-card feature-card--red reveal">
            <div className="feature-card__icon">&#127922;</div>
            <h3 className="feature-card__title">Built-In Dice Roller</h3>
            <p className="feature-card__desc">
              Roll any die from d4 to d100 with advantage, disadvantage, and
              modifiers. Full roll history keeps everything transparent.
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
                <span className="showcase__list-icon">&#10003;</span>
                Drag-and-drop initiative reordering
              </li>
              <li>
                <span className="showcase__list-icon">&#10003;</span>
                One-click damage, healing, and status changes
              </li>
              <li>
                <span className="showcase__list-icon">&#10003;</span>
                Save and load encounters for recurring sessions
              </li>
              <li>
                <span className="showcase__list-icon">&#10003;</span>
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
          No sign-up. No download. Open the app and start your encounter in
          seconds.
        </p>
        <Link to="/tracker" className="btn btn--lg btn--primary reveal">Launch App</Link>
      </section>

      <Footer />
    </div>
  );
}
