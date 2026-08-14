import { AnchorButton, Icon, Tag } from '@blueprintjs/core';
import type { IconName } from '@blueprintjs/icons';
import { INCHI_C_VERSION } from 'inchi-js';

import { Logo } from './Logo.tsx';

interface NavCard {
  /** Tab the card routes to via the hash router. */
  tab: 'convert' | 'sdf';
  icon: IconName;
  title: string;
  description: string;
  action: string;
}

const NAV_CARDS: NavCard[] = [
  {
    tab: 'convert',
    icon: 'draw',
    title: 'One molecule',
    description:
      'Draw or paste a structure and read its InChI and InChIKey, recomputed live on every edit.',
    action: 'Convert a structure',
  },
  {
    tab: 'sdf',
    icon: 'th',
    title: 'A list of molecules',
    description:
      'Drop a whole SDF (or .sdf.gz) file, get the InChI and InChIKey for every structure, and download the enriched SDF.',
    action: 'Process an SDF file',
  },
];

interface Feature {
  icon: IconName;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'shield',
    title: '100% in your browser',
    description:
      'Every conversion runs locally on WebAssembly. Your structures stay on your machine.',
  },
  {
    icon: 'offline',
    title: 'No upload, no server',
    description:
      'Molecules and SDF files are never sent anywhere — there is no backend to send them to.',
  },
  {
    icon: 'box',
    title: 'No install, nothing to set up',
    description:
      'Open the link, and it works — even offline. The IUPAC InChI engine ships inside one file.',
  },
];

/**
 * Landing page. Presents the playground in one glance: the headline
 * promise (the simplest way to get an InChI for one molecule or a whole
 * SDF file), two cards routing to the end-user tools, and a privacy strip
 * insisting that everything runs locally and no data is ever sent to a
 * server. Cards navigate through the existing hash router, so the active
 * tab and shareable URL stay in sync.
 * @returns The Home panel JSX.
 */
export function HomePanel() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-brand">
          <Logo size={26} />
          <span className="home-hero-eyebrow">InChI · in your browser</span>
        </div>
        <h1 className="home-hero-title">The simplest way to get an InChI.</h1>
        <p className="home-hero-lead">
          Turn a single molecule — or a whole SDF file — into its{' '}
          <strong>InChI</strong> and <strong>InChIKey</strong>, instantly. It
          all happens right here in your browser:{' '}
          <strong>no data is ever sent to a server</strong>.
        </p>
        <div className="home-hero-actions">
          <AnchorButton href="#/convert" intent="primary" icon="draw">
            Convert a molecule
          </AnchorButton>
          <AnchorButton href="#/sdf" icon="th">
            Process an SDF file
          </AnchorButton>
          <AnchorButton
            href="https://github.com/cheminfo/inchi"
            target="_blank"
            rel="noreferrer"
            icon="git-repo"
            variant="minimal"
          >
            Source on GitHub
          </AnchorButton>
        </div>
        <div className="home-hero-badges">
          <Tag minimal intent="primary">
            inchi-js v{__INCHI_JS_VERSION__}
          </Tag>
          <Tag minimal intent="success">
            IUPAC InChI v{INCHI_C_VERSION}
          </Tag>
          <Tag minimal icon="lock">
            Runs offline
          </Tag>
        </div>
      </section>

      <section className="home-cards">
        {NAV_CARDS.map((card) => (
          <a key={card.tab} className="home-card" href={`#/${card.tab}`}>
            <span className="home-card-icon">
              <Icon icon={card.icon} size={22} />
            </span>
            <span className="home-card-title">{card.title}</span>
            <span className="home-card-desc">{card.description}</span>
            <span className="home-card-open">
              {card.action} <Icon icon="arrow-right" size={13} />
            </span>
          </a>
        ))}
      </section>

      <section className="home-features">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="home-feature">
            <span className="home-feature-icon">
              <Icon icon={feature.icon} size={18} />
            </span>
            <div>
              <div className="home-feature-title">{feature.title}</div>
              <div className="home-feature-desc">{feature.description}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
