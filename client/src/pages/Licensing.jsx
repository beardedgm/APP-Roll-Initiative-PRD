import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

// The legal copy below is rendered verbatim as supplied. Do not rewrite or
// re-style the wording. Sections 7, 8, and 16 intentionally defer the full
// ORC / OGL 1.0a texts and OGL Section 15 to a pre-publication step.
export default function Licensing() {
  return (
    <>
      <SEO
        title="Licensing & Attribution | Roll Initiative"
        description="Licensing and attribution framework for Roll Initiative: original work, open-licensed rules content (ORC, OGL 1.0a, CC BY 4.0), source attributions, and Pathfinder compatibility notice."
        path="/licensing"
      />
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">RoleInitiative.app licensing and attribution</h1>

          <section className="legal-section">
            <p>
              RoleInitiative.app is an independent encounter tracker and game utility. It is not affiliated with,
              endorsed by, sponsored by, or specifically approved by Paizo Inc.
            </p>
            <p>
              This page explains the licensing and attribution framework for the RoleInitiative.app website,
              application code, original site content, and third-party game materials that may appear on the site.
            </p>
          </section>

          <section className="legal-section">
            <h2>Overview</h2>
            <p>
              RoleInitiative.app may include several different categories of material, each with its own legal status
              and license treatment:
            </p>
            <ul>
              <li>Original application code, interface design, branding, written copy, and product features created for RoleInitiative.app</li>
              <li>User-created content stored or managed through the service</li>
              <li>Open-licensed game mechanics and rules content drawn from published tabletop roleplaying game materials</li>
              <li>References to third-party trademarks, product names, and source books for compatibility, attribution, and identification purposes</li>
            </ul>
            <p>These categories are treated separately below.</p>
          </section>

          <section className="legal-section">
            <h2>1. RoleInitiative.app original work</h2>
            <p>
              Unless otherwise stated, the following materials are the original work of RoleInitiative.app and are
              protected by applicable copyright and other intellectual property laws:
            </p>
            <ul>
              <li>The site and application code</li>
              <li>The user interface and user experience design</li>
              <li>The RoleInitiative.app name, product branding, and site presentation, excluding any third-party marks</li>
              <li>Original written copy, help text, documentation, and explanatory content created for the site</li>
              <li>Original encounter-building workflows, filtering tools, search tools, organizational systems, and cloud account features</li>
            </ul>
            <p>
              No part of RoleInitiative.app’s original code, design, branding, or written material may be copied,
              redistributed, republished, reverse engineered for commercial cloning, or reused beyond ordinary personal
              use unless permission is expressly granted.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. User-created content</h2>
            <p>
              Users may create, save, organize, and manage their own content through RoleInitiative.app, including
              encounters, notes, labels, tags, and campaign-related information.
            </p>
            <p>
              Users retain ownership of original content they create and upload, subject to any Terms of Service,
              acceptable use rules, or hosting requirements that apply to use of the platform. By using
              RoleInitiative.app, users grant the service any limited rights reasonably necessary to host, process, back
              up, synchronize, display, and transmit that user-created content as part of operating the service.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Free access to rules content</h2>
            <p>
              RoleInitiative.app may display Pathfinder Second Edition creature stat blocks and related rules reference
              content, along with content from other supported tabletop RPG systems, as a convenience for players and
              game masters.
            </p>
            <p>
              Pathfinder creature stat blocks and related rules reference pages on RoleInitiative.app are intended to be
              freely available.
            </p>
            <p>Viewing publicly available rules reference content on the site does not require payment.</p>
            <p>
              Users do not need a paid subscription to browse, search, or reference supported rules content that is made
              publicly accessible on the site.
            </p>
            <p>
              Any paid features offered by RoleInitiative.app relate only to optional cloud-based services and account
              functionality, not to access to publicly available rules reference content.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Paid subscriptions and cloud services</h2>
            <p>
              RoleInitiative.app may offer optional paid subscriptions for convenience and infrastructure features such
              as:
            </p>
            <ul>
              <li>Cloud storage for saved encounters, notes, campaign data, and user preferences</li>
              <li>Synchronization of user-created data across devices</li>
              <li>Account-based features built on top of user data and personal workflow management</li>
              <li>Other optional service features that do not restrict access to publicly available rules reference content</li>
            </ul>
            <p>
              Subscription fees are charged solely for these account and cloud-service features. Users are not charged
              for access to publicly available creature stat blocks or other openly accessible rules reference content
              presented on the site.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Open-licensed rules content</h2>
            <p>
              RoleInitiative.app may incorporate, reproduce, adapt, transform, or display game mechanics and related
              rules content released under one or more open gaming licenses.
            </p>
            <p>Where applicable, this may include:</p>
            <ul>
              <li>The Open RPG Creative License (ORC) for Pathfinder Second Edition Remaster material and other ORC-licensed works</li>
              <li>The Open Game License version 1.0a (OGL) for legacy Pathfinder Second Edition material originally released as Open Game Content</li>
              <li>The Creative Commons Attribution 4.0 International License (CC BY 4.0) for certain system reference documents and other open reference materials</li>
              <li>Other lawfully used open or public rules materials where separately identified</li>
            </ul>
            <p>
              To the extent RoleInitiative.app includes open-licensed mechanics or derivative implementations of those
              mechanics, that material remains subject to the terms of the applicable license. RoleInitiative.app does
              not claim ownership over third-party licensed rules content except to the extent of its own original
              formatting, data structure, software implementation, annotations, and service-layer presentation.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. System and source licenses</h2>
            <p>
              RoleInitiative.app may support material from multiple tabletop RPG systems and reference documents. The
              following subsections identify selected sources and the licenses under which they are made available.
            </p>

            <h3>Level Up: Advanced 5E license</h3>
            <p>
              This work includes material taken from the A5E System Reference Document (A5ESRD) by EN Publishing and
              available at{' '}
              <a href="https://a5esrd.com" target="_blank" rel="noopener noreferrer">A5ESRD.com</a>, based on Level Up:
              Advanced 5th Edition, available at{' '}
              <a href="https://www.levelup5e.com" target="_blank" rel="noopener noreferrer">www.levelup5e.com</a>. The
              A5ESRD is licensed under the Creative Commons Attribution 4.0 International License, available at{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.
            </p>

            <h3>Wizards of the Coast 5.1 SRD license</h3>
            <p>
              This work includes material taken from the System Reference Document 5.1 (SRD 5.1) by Wizards of the Coast
              LLC and available at{' '}
              <a href="https://dnd.wizards.com/resources/systems-reference-document" target="_blank" rel="noopener noreferrer">https://dnd.wizards.com/resources/systems-reference-document</a>.
              The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.
            </p>

            <h3>Wizards of the Coast 5.2 SRD license</h3>
            <p>
              This work includes material taken from the System Reference Document 5.2 (SRD 5.2) by Wizards of the Coast
              LLC and available at{' '}
              <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer">https://www.dndbeyond.com/srd</a>.
              The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.
            </p>

            <h3>Kobold Press Black Flag license</h3>
            <p>
              This work includes material taken from the Black Flag Reference Document 1.0 (BFRD 1.0) by Kobold Press and
              available at{' '}
              <a href="https://koboldpress.com/Black-Flag-Roleplaying" target="_blank" rel="noopener noreferrer">https://koboldpress.com/Black-Flag-Roleplaying</a>.
              The BFRD 1.0 is licensed under the Creative Commons Attribution 4.0 International License, available at{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.
            </p>

            <h3>Kobold Press OGL-based works</h3>
            <p>
              This work may include Open Game Content from products published by Open Design LLC / Kobold Press, such as
              Deep Magic, Vault of Magic, Tome of Beasts 1, 2, and 3, Creature Codex, and related titles. Such content is
              used under the Open Game License version 1.0a and is identified in the Open Game License section and
              associated copyright notice.
            </p>

            <h3>Pathfinder Second Edition compatibility notice</h3>
            <p>
              This work includes game mechanics and rules content compatible with Pathfinder Second Edition by Paizo Inc.
              RoleInitiative.app displays Pathfinder creature stat blocks and related rules information to support
              encounter building and play. Pathfinder and all associated marks are trademarks of Paizo Inc. and are used
              solely to indicate compatibility and reference Paizo’s published game rules. RoleInitiative.app is an
              independent tool and is not affiliated with, endorsed by, or sponsored by Paizo Inc. Pathfinder creature
              stat blocks and related rules references displayed by RoleInitiative.app are freely accessible and are not
              subject to any subscription or paywall; optional subscriptions cover only cloud-based storage and account
              services.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. ORC notice</h2>
            <p>
              Where RoleInitiative.app uses content released under the Open RPG Creative License, the site should provide
              a dedicated ORC notice or legal appendix identifying the applicable source works and complying with the
              notice requirements of the ORC license.
            </p>
            <p>
              That ORC notice should identify each relevant source work used by the site, such as applicable Pathfinder
              Second Edition Remaster titles or other ORC-licensed publications referenced by the service.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. OGL notice</h2>
            <p>
              Where RoleInitiative.app uses legacy material released under the Open Game License version 1.0a, the site
              should provide:
            </p>
            <ul>
              <li>The full text of the OGL 1.0a</li>
              <li>A complete Section 15 identifying each Open Game Content source used by the site</li>
              <li>Any other source or attribution details reasonably necessary to identify the origin of legacy OGL-derived content</li>
            </ul>
            <p>
              Legacy OGL content and ORC content should be tracked separately so the applicable source and license status
              of each item can be identified accurately.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Pathfinder compatibility and third-party references</h2>
            <p>
              RoleInitiative.app may refer to Pathfinder, Pathfinder Second Edition, creature names, product titles, book
              titles, and other publisher identifiers for compatibility, source attribution, indexing, search, citation,
              identification, or descriptive reference.
            </p>
            <p>
              Pathfinder, Pathfinder Second Edition, and related names, marks, logos, and branding are the property of
              Paizo Inc. Any such marks appearing on the site are used solely to identify compatibility or source
              material, unless otherwise expressly stated.
            </p>
            <p>
              RoleInitiative.app is an independent third-party product and is not published, endorsed, sponsored, or
              specifically approved by Paizo Inc.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Product identity and reserved publisher content</h2>
            <p>Open-licensed rules mechanics are treated separately from publisher-owned product identity.</p>
            <p>
              Paizo’s product identity, including but not limited to logos, trade dress, artwork, setting-specific lore,
              unique named characters, unique story elements, and other protected expressive content, remains the
              property of Paizo Inc. except to the extent any particular material is separately licensed for public use.
            </p>
            <p>RoleInitiative.app does not claim ownership over any such publisher-owned product identity.</p>
          </section>

          <section className="legal-section">
            <h2>11. Artwork, logos, and visual assets</h2>
            <p>
              Unless expressly stated otherwise, RoleInitiative.app does not claim any ownership over third-party
              artwork, trademarks, or logos.
            </p>
            <p>
              Unless expressly licensed or otherwise permitted, third-party logos, trade dress, and artwork should not be
              reproduced as part of the site’s interface, marketing materials, or product presentation. Original
              RoleInitiative.app artwork, icons, interface elements, site branding, and visual design remain the property
              of their respective owners.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Third-party data sources and attribution</h2>
            <p>
              RoleInitiative.app may rely on third-party data sources, reference texts, or structured datasets to prepare
              rules references, indexing, filters, and encounter-building workflows.
            </p>
            <p>
              Where third-party sources are used, RoleInitiative.app should identify them in an attribution, legal, or
              sources section as appropriate. If a source has its own license terms, attribution requirements, or
              restrictions, those source-specific terms apply in addition to this page.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Original site writing and documentation</h2>
            <p>
              Any original explanatory writing, interface text, help text, documentation, release notes, blog content, or
              editorial material created for RoleInitiative.app is owned by its respective authors unless otherwise
              stated.
            </p>
            <p>
              No third party receives any implied license to republish or redistribute that original written material
              except as expressly allowed by law or by separate written permission.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. No transfer of rights</h2>
            <p>
              Nothing on this page transfers ownership of any third-party intellectual property to RoleInitiative.app,
              and nothing on this page grants users any rights beyond those already granted by applicable law, applicable
              open licenses, or any express permission separately provided by RoleInitiative.app.
            </p>
          </section>

          <section className="legal-section">
            <h2>15. Non-affiliation statement</h2>
            <p>For clarity:</p>
            <blockquote>
              <p>
                RoleInitiative.app is an independent third-party encounter tracker and game utility. It is not affiliated
                with, endorsed by, sponsored by, or specifically approved by Paizo Inc. Pathfinder and related marks are
                the property of Paizo Inc. and are used only to indicate compatibility, identify source material, and
                support lawful descriptive reference.
              </p>
            </blockquote>
          </section>

          <section className="legal-section">
            <h2>16. Source notices to add before publication</h2>
            <p>Before publishing this page in production, add or link the following where applicable:</p>
            <ul>
              <li>The full text of the Open RPG Creative License or a compliant ORC legal notice</li>
              <li>The full text of the Open Game License version 1.0a, if legacy OGL content is used</li>
              <li>A complete OGL Section 15 for any OGL-derived content</li>
              <li>A list of Pathfinder and other source books used in the site’s rules data</li>
              <li>Any additional source notices required by third-party datasets or structured reference materials</li>
              <li>The full Open Game License appendix and copyright notices for any Kobold Press or other OGL-based materials used by the site</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>17. Reservation of rights</h2>
            <p>
              Except for content made available under applicable open licenses and except for user-created content owned
              by users, all rights in the original RoleInitiative.app product, code, design, branding, written material,
              and service features are reserved.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
