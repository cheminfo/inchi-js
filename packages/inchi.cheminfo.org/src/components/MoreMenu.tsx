import { Icon, Menu, MenuItem, Popover } from '@blueprintjs/core';

import type { MoreTabId } from './moreTabs.ts';
import { MORE_TABS, isMoreTab } from './moreTabs.ts';

/** Props of {@link MoreMenu}. */
export interface MoreMenuProps {
  /** The active root tab, so the menu can mark its own page. */
  selected: string;
  /** Called with the page the reader picked. */
  onSelect: (id: MoreTabId) => void;
}

/**
 * The More dropdown, rendered in the header bar beside the pages. It opens a
 * menu of the pages that are not part of the daily flow, and carries
 * `nav-link` so it reads as one of the menu items rather than as a button
 * dropped among them.
 * @param props - The active tab and the selection callback.
 * @returns The dropdown trigger.
 */
export function MoreMenu(props: MoreMenuProps) {
  const { selected, onSelect } = props;
  const active = isMoreTab(selected);

  return (
    <Popover
      minimal
      placement="bottom-start"
      content={
        <Menu>
          {MORE_TABS.map((tab) => (
            <MenuItem
              key={tab.id}
              icon={tab.icon}
              text={tab.title}
              active={selected === tab.id}
              onClick={() => onSelect(tab.id)}
            />
          ))}
        </Menu>
      }
    >
      <button
        type="button"
        className={active ? 'nav-link nav-link--active' : 'nav-link'}
      >
        More
        <Icon icon="caret-down" size={14} />
      </button>
    </Popover>
  );
}
