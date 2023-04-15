'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function fillPreferencesWindow(window) {
  // Use the same GSettings schema as in `extension.js`
  const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.autotilingwm');

  // Create a preferences page and group
  const page = new Adw.PreferencesPage();

  const group = new Adw.PreferencesGroup({
    title: 'General settings'
  });
  page.add(group);

  const group2 = new Adw.PreferencesGroup({
    title: 'Appearance settings'
  });
  page.add(group2)

  // Create a new preferences row
  const row = new Adw.ActionRow({
    title: 'Enable Auto Window Tiling',
    subtitle: 'When enabled, the extension will manage tiling your windows on the screen.'
  });
  group.add(row);

  // Create the switch and bind its value
  const toggle = new Gtk.Switch({
    active: settings.get_boolean('tiling-on'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind(
    'tiling-on',
    toggle,
    'active',
    Gio.SettingsBindFlags.DEFAULT
  );

  // Add the switch to the row
  row.add_suffix(toggle);
  row.activatable_widget = toggle;

  const row2 = new Adw.ActionRow({
    title: 'Inner gaps',
    subtitle: 'Amount of space in pixels left between windows'
  });
  group2.add(row2);

  // Create the sliders for gaps
  const innerGaps = new Gtk.Scale.new(Gtk.Orientation.HORIZONTAL, new Gtk.Adjustment({
    'lower': 0,
    'upper': 100,
    'step-increment': 1,
    'value': settings.get_int('inner-gaps')
  }));
  settings.bind(
    'inner-gaps',
    innerGaps,
    'value',
    Gio.SettingsBindFlags.DEFAULT
  );
  row2.add_suffix(innerGaps);
  row2.activatable_widget = innerGaps;

  const row3 = new Adw.ActionRow({
    title: 'Outer gaps',
    subtitle: 'Amount of space in pixels left between all the windows and the borders of the screen.'
  });
  group2.add(row3);

  const outerGaps = new Gtk.Scale.new(Gtk.Orientation.HORIZONTAL, new Gtk.Adjustment({
    'lower': 0,
    'upper': 100,
    'step-increment': 1,
    'value': settings.get_int('outer-gaps')
  }));
  settings.bind(
    'outer-gaps',
    outerGaps,
    'value',
    Gio.SettingsBindFlags.DEFAULT
  );
  row3.add_suffix(outerGaps);
  row3.activatable_widget = outerGaps;

  // Add our page to the window
  window.add(page);
}
