/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'my-indicator-extension';

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { GObject, Gio, St, Meta, Shell } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const ICON_AUTO_ON = Gio.icon_new_for_string(`${Me.path}/icons/auto-on-symbolic.svg`);
const ICON_AUTO_OFF = Gio.icon_new_for_string(`${Me.path}/icons/auto-off-symbolic.svg`);

const TilingMode = {
    Stack: 'stack',
    Tab: 'tab',
    Split: 'split'
};

const NodeTypes = {
    Leaf: 'leaf',
    Branch: 'branch'
};

const Orientation = {
    H: 'horizontal',
    V: 'vertical'
};

class AutoTilingLayoutHandler {
    constructor() {
        // We represent layouts as an imperfect binary tree where leaves are a
        // stack of windows (so we can do i3 style stacking or tabs, like Pop
        // Shell does) and branches represent a split with a ratio. (Orientation
        // is decided by the size of the containing container, as in Pop Shell.)
        //
        // type Container = { type: Leaf, windows: [Window] } | {
        //     type: Branch,
        //     containers: [Container, Container],
        //     ratio: Float,
        //     orientation: Orientation
        // }
        // layouts :: [{ container: Container, workspace: Workspace }]
        this._layouts = [];
        for (let i = 0; i < global.workspace_manager.n_workspaces; i++) {
            this._addWorkspace(i);
        }
        global.workspace_manager.connect('notify::n-workspaces',
            this._nWorkspacesChanged.bind(this));
    }

    _nWorkspacesChanged() {
        let newNumWorkspaces = global.workspace_manager.n_workspaces;
        let oldNumWorkspaces = this._layouts.length;
        if (newNumWorkspaces > oldNumWorkspaces) {
            // assumes workspaces are always added on the end
            for (let i = oldNumWorkspaces; i < newNumWorkspaces; i++) {
                this._addWorkspace(i);
            }
        } else if (newNumWorkspaces < oldNumWorkspaces) {
            let removedNum = oldNumWorkspaces - newNumWorkspaces;
            let removedIndex;
            for (let i = 0; i < oldNumWorkspaces; i++) {
                let workspace = global.workspace_manager.get_workspace_by_index(i);
                if (this._layouts[i].workspace != workspace) {
                    removedIndex = i;
                    break;
                }
            }

            this._removeWorkspaces(removedIndex, removedNum);
        }
    }

    _addWorkspace(i) {
        log(`added workspace: ${i}`);
        // Get the workspace for this index
        let workspace = global.workspace_manager.get_workspace_by_index(i);

        if (!workspace) {
            logError(`workspace ${i} not defined in Workspace Manager, got ${workspace}`, 'window manager error');
            return;
        }

        // Create a layout for this workspace with no windows on it
        this._layouts[i] = {
            container: { type: NodeTypes.Leaf, windows: [] },
            workspace
        };

        // Add all the windows on this workspace to this workspace's layout
        for (let actor in global.get_window_actors()) {
            if (typeof actor == "object" && actor.meta_window_get_type() == Meta.WindowType.NORMAL) {
                let meta_window = actor.get_meta_window();
                if (meta_window.on_all_workspaces() || meta_window.get_workspace().index() != i)
                    continue;
                this._windowAdded(workspace, actor);
            }
        }

        // Keep track of any new/deleted windows
        workspace.connectObject(
            'window-added', this._windowAdded.bind(this),
            'window-removed', this._windowRemoved.bind(this),
            this
        );
    }

    _removeWorkspaces(startIdx, num) {
        log(`removed workspaces ${startIdx}-${startIdx + num - 1}`);
        let removedWorkspaces = this._layouts.splice(startIdx, num);
        removedWorkspaces.forEach(l => l.workspace.disconnectObject(this));
    }

    _windowAdded(workspace, window) {
        log(`window '${window.title}' added on workspace ${workspace.workspace_index}`);
    }

    _windowRemoved(workspace, window) {
        log(`window '${window.title}' removed on workspace ${workspace.workspace_index}`);
    }
}

const AutoTilingToggle = GObject.registerClass(
    class AutoTilingToggle extends QuickSettings.QuickToggle {
        _init() {
            super._init({
                title: 'Auto Tiling',
                gicon: ICON_AUTO_ON,
                toggleMode: true
            });

            this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.autotilingwm');

            this._settings.bind(
                'tiling-on',
                this,
                'checked',
                Gio.SettingsBindFlags.DEFAULT
            );

            log('binding icon');
            this.connect('notify::checked', (_) => {
                this.gicon = this.checked ? ICON_AUTO_ON : ICON_AUTO_OFF;
            });
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        this._quickSettingToggle = new AutoTilingToggle();
        this._layoutHandler = new AutoTilingLayoutHandler();

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        log("enabling");
        log("adding toggle to quick settings menu");
        QuickSettingsMenu._addItems([this._quickSettingToggle]);
        QuickSettingsMenu.menu._grid.set_child_below_sibling(
            this._quickSettingToggle,
            QuickSettingsMenu._backgroundApps.quickSettingsItems[0]
        );
        log("toggle added");
    }

    disable() {
        this._quickSettingToggle.get_parent().remove_child(this._quickSettingToggle);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
