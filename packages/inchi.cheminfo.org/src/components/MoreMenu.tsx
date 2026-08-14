import { Button, Menu, MenuItem, Popover } from '@blueprintjs/core';

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
 * The More dropdown, rendered inside the root tab list beside the tabs.
 * It opens a menu of the pages that are not part of the daily flow.
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
      <Button
        className="more-tab"
        variant="minimal"
        active={active}
        endIcon="caret-down"
        text="More"
      />
    </Popover>
  );
}
