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

const { GObject, Gio, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const ICON_AUTO_ON = Gio.icon_new_for_string(`${Me.path}/icons/auto-on-symbolic.svg`);
const ICON_AUTO_OFF = Gio.icon_new_for_string(`${Me.path}/icons/auto-off-symbolic.svg`);

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

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        log("enabling");
        log("adding toggle to quick settings menu");
        this._quickSettingToggle = new AutoTilingToggle();
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
