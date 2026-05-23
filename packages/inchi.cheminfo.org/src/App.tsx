import { InchiToStructurePanel } from './components/InchiToStructurePanel.tsx';
import { StructureToInchiPanel } from './components/StructureToInchiPanel.tsx';

/**
 * Root of the playground. Two side-by-side panels: structure → InChI on
 * the left, InChI → structure on the right.
 * @returns The application root.
 */
export function App() {
  return (
    <div className="app-shell">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>
          inchi.cheminfo.org — InChI playground
        </h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <a
            href={`https://www.npmjs.com/package/inchi-js/v/${import.meta.env.INCHI_JS_VERSION}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13 }}
          >
            inchi-js v{import.meta.env.INCHI_JS_VERSION}
          </a>
          <a
            href="https://github.com/cheminfo/inchi"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13 }}
          >
            source
          </a>
        </div>
      </div>
      <div className="panel-grid">
        <StructureToInchiPanel />
        <InchiToStructurePanel />
      </div>
    </div>
  );
}
