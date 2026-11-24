import type { ReactNode } from 'react';

export interface PropertyEntry {
  label: string;
  value: ReactNode;
}

export interface PropertyGroup {
  title: string;
  entries: PropertyEntry[];
}

export interface PropertiesPanelProps {
  /** accessible name for the inspector */
  label: string;
  groups?: PropertyGroup[];
  /** format-specific controls, below the groups */
  children?: ReactNode;
}

/**
 * The right-hand inspector a reader opens for the current page, slide or cell. No reader opens it yet:
 * it exists so a properties window is a slot in the frame, not a second layout. Values are plain text
 * or nodes, so a format decides what is worth showing and never how the panel looks.
 */
export function PropertiesPanel({ label, groups = [], children }: PropertiesPanelProps) {
  return (
    <aside className="lb-properties" aria-label={label}>
      {groups.map((group) => (
        <section className="lb-properties-group" key={group.title}>
          <h2 className="lb-properties-title">{group.title}</h2>
          <dl className="lb-properties-list">
            {group.entries.map((entry) => (
              <div className="lb-properties-row" key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {children}
    </aside>
  );
}
