import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';
import '../styles/help.css';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'running-combat', label: 'Running Combat' },
  { id: 'monsters', label: 'Monsters & Creatures' },
  { id: 'spells', label: 'Spells' },
  { id: 'custom-monsters', label: 'Custom Monsters' },
  { id: 'player-view', label: 'Player View' },
  { id: 'sharing', label: 'Sharing with Players' },
  { id: 'cloud-sync', label: 'Cloud Saves & Sync' },
  { id: 'pricing', label: 'Accounts & Pricing' },
  { id: 'faq', label: 'FAQ' },
];

export default function Help() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');
  const contentRef = useRef(null);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className="marketing">
      <Navbar />

      <div className="help-page">
        {/* Mobile toggle */}
        <button
          className="help-sidebar__toggle"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle help navigation"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          {sidebarOpen ? 'Close' : 'Topics'}
        </button>

        {/* Sidebar */}
        <aside className={`help-sidebar${sidebarOpen ? ' help-sidebar--open' : ''}`}>
          <div className="help-sidebar__title">User Guide</div>
          <ul className="help-sidebar__nav">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`help-sidebar__link${activeSection === s.id ? ' help-sidebar__link--active' : ''}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(s.id); }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <main className="help-content" ref={contentRef}>

          {/* 1. Getting Started */}
          <section className="help-section" id="getting-started">
            <h2>Getting Started</h2>
            <p>
              Roll Initiative is a free initiative tracker built for Dungeon Masters running
              D&amp;D 5th Edition or Pathfinder 2nd Edition. It handles turn order, hit points,
              stat blocks, spells, and dice rolls so you can focus on the story instead of
              bookkeeping.
            </p>
            <h3>Try the Demo</h3>
            <p>
              You do not need an account to start using Roll Initiative. Click{' '}
              <Link to="/tracker">Launch App</Link> to open the tracker immediately. The free
              demo includes 20 iconic monsters (10 from each game system), the complete spell
              library, a built-in dice roller, and a local player view for your TV or second
              monitor.
            </p>
            <h3>Interface Overview</h3>
            <p>
              The tracker is divided into three areas:
            </p>
            <ul>
              <li>
                <strong>Left panel</strong> &mdash; Four tabs for browsing Creatures, Spells,
                Characters, and saved Encounters. Each tab has a system toggle to switch
                between 5E and PF2E content.
              </li>
              <li>
                <strong>Center panel</strong> &mdash; The initiative list. This is where you
                add combatants, roll initiative, and track turns during combat.
              </li>
              <li>
                <strong>Right panel</strong> &mdash; Stat blocks and spell descriptions
                appear here when you click a creature or spell. A collapsible dice roller
                sits at the top of this panel.
              </li>
            </ul>
          </section>

          {/* 2. Running Combat */}
          <section className="help-section" id="running-combat">
            <h2>Running Combat</h2>
            <h3>Adding Combatants</h3>
            <p>
              Use the form at the top of the initiative list to add combatants. Type a name,
              set HP and AC, and choose a type: Player, Monster, or NPC. Each type gets a
              distinct color badge so you can tell them apart at a glance.
            </p>
            <h3>Rolling Initiative</h3>
            <p>
              When you click <strong>Start Combat</strong>, the tracker auto-rolls initiative
              for all monsters and NPCs using their initiative modifier. Player initiative is
              entered manually &mdash; ask your players for their rolls and type them in.
            </p>
            <h3>Advancing Turns</h3>
            <p>
              Use the <strong>Next</strong> and <strong>Previous</strong> buttons to move
              through the turn order. The active combatant is highlighted so everyone knows
              whose turn it is. Round count updates automatically.
            </p>
            <h3>Tracking Hit Points</h3>
            <p>
              Every combatant card displays a color-coded health bar:
            </p>
            <ul>
              <li><strong>Green</strong> &mdash; Healthy (above 50% HP)</li>
              <li><strong>Yellow</strong> &mdash; Hurt (25&ndash;50% HP)</li>
              <li><strong>Red</strong> &mdash; Bloodied (below 25% HP)</li>
              <li><strong>Gray</strong> &mdash; Unconscious (0 HP)</li>
            </ul>
            <p>
              Click the damage/heal input on any combatant card to apply damage or healing.
              Type a number and press Enter (or click the apply button) to update their HP.
            </p>
            <h3>Undo and Redo</h3>
            <p>
              Every action is tracked in a history stack. Press <code>Ctrl+Z</code> to undo
              or <code>Ctrl+Y</code> to redo. You can also use the undo/redo buttons in the
              toolbar. This covers HP changes, initiative reordering, adding or removing
              combatants, and turn advancement.
            </p>
            <h3>Reordering Initiative</h3>
            <p>
              Drag and drop any combatant card to change their position in the initiative
              order. This is useful for readied actions or when a player wants to delay
              their turn.
            </p>
          </section>

          {/* 3. Monsters & Creatures */}
          <section className="help-section" id="monsters">
            <h2>Monsters &amp; Creatures</h2>
            <p>
              The Creatures tab in the left panel gives you access to a library of pre-loaded
              monsters. Full Access subscribers can browse over 5,700 creatures spanning D&amp;D
              5e and Pathfinder 2e. The free demo tier includes 20 iconic monsters (10 from each
              system) so you can try the tracker before subscribing.
            </p>
            <h3>Browsing and Filtering</h3>
            <p>
              Use the system toggle at the top of the tab to switch between <strong>5E</strong> and
              <strong> PF2E</strong> content. Then narrow your search with the available filters:
            </p>
            <ul>
              <li><strong>Source</strong> &mdash; Filter by book or supplement (e.g., SRD 5.1, Bestiary 1)</li>
              <li><strong>CR / Level</strong> &mdash; Filter by Challenge Rating (5e) or creature Level (PF2e)</li>
              <li><strong>Search</strong> &mdash; Type any part of a creature name to find it</li>
            </ul>
            <h3>Viewing Stat Blocks</h3>
            <p>
              Click any creature in the list to load its full stat block in the right panel.
              Stat blocks include all standard information &mdash; abilities, defenses, actions,
              and special traits. Dice notation in stat blocks is clickable: click any roll
              (like <code>2d6+5</code>) to roll it in the built-in dice roller.
            </p>
            <h3>Adding to an Encounter</h3>
            <p>
              Click the <strong>+</strong> button next to any creature to add it to the current
              encounter. The creature&rsquo;s name, HP, AC, and initiative modifier are
              populated automatically from the stat block.
            </p>
          </section>

          {/* 4. Spells */}
          <section className="help-section" id="spells">
            <h2>Spells</h2>
            <p>
              The Spells tab provides access to over 3,600 spells from D&amp;D 5e and
              Pathfinder 2e. All spells are available on both the free demo and Full Access tiers.
            </p>
            <h3>5E Spell Filters</h3>
            <ul>
              <li><strong>Source</strong> &mdash; Filter by book (SRD 5.1, SRD 5.2, Deep Magic, etc.)</li>
              <li><strong>Level</strong> &mdash; Filter by spell level (0 for cantrips through 9)</li>
              <li><strong>School</strong> &mdash; Filter by school of magic (Evocation, Conjuration, etc.)</li>
              <li><strong>Search</strong> &mdash; Search by spell name</li>
            </ul>
            <h3>PF2E Spell Filters</h3>
            <ul>
              <li><strong>Source</strong> &mdash; Filter by book (Core Rulebook, Secrets of Magic, etc.)</li>
              <li><strong>Rank</strong> &mdash; Filter by spell rank (0 for cantrips through 10)</li>
              <li><strong>Category</strong> &mdash; Filter by tradition (Arcane, Divine, Occult, Primal, Elemental) or spell type (Focus Spells, Ritual Spells)</li>
              <li><strong>Search</strong> &mdash; Search by spell name</li>
            </ul>
            <h3>Viewing Spell Descriptions</h3>
            <p>
              Click any spell to view its full description in the right panel. Descriptions
              include casting time, range, components, duration, and the full spell text.
              Dice notation in spell descriptions is clickable, just like in stat blocks.
            </p>
            <h3>Spells in Stat Blocks</h3>
            <p>
              Spell names that appear inside creature stat blocks are clickable &mdash; they
              display with a gold dotted underline. Click any spell name to view that
              spell&rsquo;s description without leaving the stat block. Use the back button
              at the top of the right panel to return to the creature&rsquo;s stat block.
            </p>
          </section>

          {/* 5. Custom Monsters */}
          <section className="help-section" id="custom-monsters">
            <h2>Custom Monsters <span className="help-badge">Full Access</span></h2>
            <p>
              Full Access subscribers can create and import custom homebrew creatures.
              Custom monsters are saved to your account and available across all your
              encounters.
            </p>
            <h3>Creating a Custom Monster</h3>
            <p>
              In the Creatures tab, click <strong>Create Monster</strong> (or <strong>Create
              Creature</strong> when using PF2E). A form opens where you can enter all the
              details for your homebrew creature: name, type, size, HP, AC, abilities, actions,
              and more.
            </p>
            <h3>Importing via JSON</h3>
            <p>
              Click <strong>Import JSON</strong> to import a creature from a JSON file. You
              can paste JSON directly or upload a <code>.json</code> file. Use the{' '}
              <strong>Template</strong> button to load a pre-filled example for the currently
              selected game system (5E or PF2E) so you can see the expected format.
            </p>
            <h3>5E JSON Format</h3>
            <p>
              The 5e format uses ability scores (values from 1 to 30), Challenge Rating as
              a string (e.g., <code>&quot;1/2&quot;</code> or <code>&quot;5&quot;</code>), and actions and
              traits as arrays of name and description pairs.
            </p>
            <h3>PF2E JSON Format</h3>
            <p>
              The PF2e format uses ability modifiers (values from -5 to +10), creature Level
              as an integer, and structured data for defenses, attacks, and spellcasting.
              Abilities are split into three sections:
            </p>
            <ul>
              <li>
                <strong>top</strong> &mdash; Passive abilities and auras that appear before
                defenses (e.g., Frightful Presence, Coven)
              </li>
              <li>
                <strong>mid</strong> &mdash; Reactive and defensive abilities between defenses
                and offense (e.g., Attack of Opportunity, Shield Block)
              </li>
              <li>
                <strong>bot</strong> &mdash; Offensive actions after attacks (e.g., Breath
                Weapon, Pounce, Change Shape)
              </li>
            </ul>
            <p>
              Detailed schema documentation is available for developers building tools or
              integrations.
            </p>
          </section>

          {/* 6. Player View */}
          <section className="help-section" id="player-view">
            <h2>Player View</h2>
            <p>
              The player view is a second window that displays the initiative order in a
              format designed for your players. It is useful for projecting onto a TV or
              dragging to a second monitor at the table.
            </p>
            <h3>Opening the Player View</h3>
            <p>
              Click the <strong>monitor icon</strong> in the tracker header bar to open the
              player view in a new browser window. Drag the window to your TV or external
              monitor and make it full screen for the best experience.
            </p>
            <h3>What Players See</h3>
            <p>
              The player view shows the initiative order, whose turn it is (highlighted),
              and a color-coded health status for each combatant. It does not display exact
              HP numbers &mdash; players see whether a creature is healthy, hurt, bloodied,
              or unconscious, but not the specific values.
            </p>
            <h3>Instant Sync</h3>
            <p>
              Changes in the DM view are reflected instantly in the player view with no
              delay. This works entirely in the browser &mdash; no account or internet
              connection is required for local player view.
            </p>
          </section>

          {/* 7. Sharing with Remote Players */}
          <section className="help-section" id="sharing">
            <h2>Sharing with Remote Players <span className="help-badge">Full Access</span></h2>
            <p>
              Full Access subscribers can generate shareable links so remote players can
              follow along from any device.
            </p>
            <h3>Generating a Share Link</h3>
            <p>
              Click the <strong>share icon</strong> (next to the monitor icon) in the
              tracker header. Then click <strong>Generate Link</strong> to create a unique
              shareable URL.
            </p>
            <h3>Sharing with Players</h3>
            <p>
              Copy the link and send it to your players through Discord, text, email, or
              any other messaging platform. Players open the link on any device &mdash;
              phone, tablet, or laptop &mdash; and see the same player view that updates
              in real time (syncing approximately every 2 seconds).
            </p>
            <h3>Stopping the Share</h3>
            <p>
              Click <strong>Stop Sharing</strong> to revoke the link at any time. Once
              revoked, the link will no longer work for anyone who has it.
            </p>
          </section>

          {/* 8. Cloud Saves & Sync */}
          <section className="help-section" id="cloud-sync">
            <h2>Cloud Saves &amp; Sync <span className="help-badge">Full Access</span></h2>
            <p>
              Full Access subscribers get automatic cloud saving and cross-device sync for
              encounters, characters, and encounter presets.
            </p>
            <h3>Auto-Save</h3>
            <p>
              Your encounter saves automatically to the cloud as you play. There is no
              manual save button &mdash; changes are synced in the background. Look for
              the sync indicator in the header to confirm your data is up to date.
            </p>
            <h3>Cross-Device Access</h3>
            <p>
              Log in from any device and your latest encounter loads automatically. Start
              an encounter on your desktop at home and pick it up on your laptop at the
              game store. All your data follows your account.
            </p>
            <h3>Character Library</h3>
            <p>
              Save your players&rsquo; characters for quick re-use across sessions. Instead
              of re-entering PC names, HP, and AC every week, add them from your saved
              character library with one click.
            </p>
            <h3>Encounter Presets</h3>
            <p>
              Save encounter templates to reload later. Prep your encounters ahead of time,
              save them as presets, and load them when combat starts.
            </p>
          </section>

          {/* 9. Accounts & Pricing */}
          <section className="help-section" id="pricing">
            <h2>Accounts &amp; Pricing</h2>
            <h3>Demo (Free)</h3>
            <p>
              The free demo includes everything you need to try Roll Initiative:
            </p>
            <ul>
              <li>20 demo monsters (10 from D&amp;D 5e, 10 from Pathfinder 2e)</li>
              <li>All 3,600+ spells from both game systems</li>
              <li>Built-in dice roller</li>
              <li>Local player view (second monitor / TV)</li>
              <li>Encounters saved to your browser&rsquo;s local storage</li>
            </ul>
            <h3>Full Access ($6/month)</h3>
            <p>
              Full Access unlocks the complete experience:
            </p>
            <ul>
              <li>All 5,700+ monsters from D&amp;D 5e and Pathfinder 2e</li>
              <li>Custom monster creation and JSON import</li>
              <li>Character library for saving PCs</li>
              <li>Cloud saves with cross-device sync</li>
              <li>Shareable player view links for remote players</li>
              <li>Encounter presets</li>
            </ul>
            <h3>Managing Your Subscription</h3>
            <p>
              Create an account at the <Link to="/register">registration page</Link>.
              Subscribe on the <Link to="/pricing">pricing page</Link>. To cancel, update
              your payment method, or view invoices, visit the billing portal through your{' '}
              <Link to="/settings">Settings</Link> page.
            </p>
          </section>

          {/* 10. FAQ */}
          <section className="help-section" id="faq">
            <h2>Frequently Asked Questions</h2>

            <dl>
              <div className="help-faq-item">
                <dt>Why can I only see 20 monsters?</dt>
                <dd>
                  You are on the free Demo tier, which includes 20 iconic creatures to
                  try out the tracker. Subscribe to{' '}
                  <Link to="/pricing">Full Access</Link> to unlock all 5,700+ monsters
                  from D&amp;D 5e and Pathfinder 2e.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>How do I share the initiative order with my players?</dt>
                <dd>
                  For in-person games, click the monitor icon in the tracker header to
                  open a player view on a second screen. For remote players, click the
                  share icon to generate a link you can send through Discord, text, or
                  email. Shareable links require a Full Access subscription.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>Does it work on mobile and tablet?</dt>
                <dd>
                  Yes. The tracker is fully responsive and works on phones, tablets, and
                  desktops. The shared player view is especially optimized for mobile
                  devices so your remote players have a clean, readable display.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>Can I use it offline?</dt>
                <dd>
                  The tracker works locally in your browser without an internet connection.
                  You can add combatants, roll initiative, track HP, and use the dice
                  roller entirely offline. Cloud sync and shareable player view links
                  require an internet connection.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>What is the difference between 5E and PF2E?</dt>
                <dd>
                  Roll Initiative supports both D&amp;D 5th Edition and Pathfinder 2nd
                  Edition. Toggle between them using the system switch on each tab.
                  Creatures, spells, filters, and stat block formats automatically adapt
                  to the selected game system.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>How do I import a custom monster?</dt>
                <dd>
                  Open the Creatures tab, click <strong>Import JSON</strong>, and paste
                  your creature&rsquo;s JSON data or upload a <code>.json</code> file.
                  Use the <strong>Template</strong> button to see a pre-filled example
                  for the currently selected game system. Custom monsters require a Full
                  Access subscription.
                </dd>
              </div>

              <div className="help-faq-item">
                <dt>Can I create my own homebrew creatures?</dt>
                <dd>
                  Yes. Full Access subscribers can create custom monsters using the
                  <strong> Create Monster</strong> button (or <strong>Create
                  Creature</strong> in PF2E). You can also import creatures via JSON
                  for more complex stat blocks.
                </dd>
              </div>
            </dl>
          </section>

        </main>
      </div>

      <Footer />
    </div>
  );
}
