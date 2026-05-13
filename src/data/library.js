// Built-in device templates.
// Shape: { libId, name, cat, uH, u, pwr: {type, conn, w}, ports: [{t, n, s}] }
// pwr.type: 'cord' | 'brick' | 'poe' | 'usb' | 'passive'
// port.t:   'ethernet'|'sfp'|'qsfp'|'usb-a'|'usb-c'|'hdmi'|'dp'|'serial'|'audio'|'ipmi'

const BUILTIN_LIBRARY = [
  // ── Generic Networking ──────────────────────────────────────────────────────
  {
    libId: 'core-switch',
    name: 'Core switch',
    cat: 'networking', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 150 },
    ports: [{ t: 'ethernet', n: 24, s: '1GbE' }, { t: 'sfp', n: 4, s: '1GbE' }],
  },
  {
    libId: 'patch-panel',
    name: 'Patch panel 24p',
    cat: 'networking', uH: 1, u: 6,
    pwr: { type: 'passive', conn: '', w: 0 },
    ports: [{ t: 'ethernet', n: 24, s: '' }],
  },
  {
    libId: 'firewall',
    name: 'Firewall / router',
    cat: 'networking', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 65 },
    ports: [{ t: 'ethernet', n: 8, s: '1GbE' }],
  },
  {
    libId: 'tor-switch',
    name: '10G ToR switch',
    cat: 'networking', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 300 },
    ports: [{ t: 'ethernet', n: 48, s: '10GbE' }, { t: 'qsfp', n: 4, s: '40GbE' }],
  },

  // ── Compute ─────────────────────────────────────────────────────────────────
  {
    libId: '1u-server',
    name: '1U server',
    cat: 'compute', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 350 },
    ports: [{ t: 'ethernet', n: 2, s: '10GbE' }, { t: 'ipmi', n: 1, s: '' }],
  },
  {
    libId: '2u-server',
    name: '2U server',
    cat: 'compute', uH: 2, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 500 },
    ports: [
      { t: 'ethernet', n: 4, s: '10GbE' },
      { t: 'usb-a', n: 2, s: 'USB 3.0' },
      { t: 'hdmi', n: 1, s: '' },
      { t: 'ipmi', n: 1, s: '' },
    ],
  },

  // ── Storage ─────────────────────────────────────────────────────────────────
  {
    libId: 'nas',
    name: 'NAS / storage',
    cat: 'storage', uH: 2, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 120 },
    ports: [{ t: 'ethernet', n: 2, s: '1GbE' }, { t: 'usb-a', n: 2, s: 'USB 3.0' }],
  },

  // ── Power ───────────────────────────────────────────────────────────────────
  {
    libId: 'ups',
    name: 'UPS 1500VA',
    cat: 'power', uH: 2, u: 6,
    pwr: { type: 'cord', conn: 'C19', w: 0 },
    ports: [],
  },
  {
    libId: 'pdu',
    name: 'PDU (horizontal)',
    cat: 'power', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C19', w: 0 },
    ports: [],
  },

  // ── KVM / Console ───────────────────────────────────────────────────────────
  {
    libId: 'kvm',
    name: 'KVM switch',
    cat: 'kvm', uH: 1, u: 3,
    pwr: { type: 'cord', conn: 'C13', w: 20 },
    ports: [{ t: 'usb-a', n: 8, s: '' }, { t: 'hdmi', n: 1, s: '' }],
  },
  {
    libId: 'console',
    name: 'Console server',
    cat: 'kvm', uH: 1, u: 3,
    pwr: { type: 'cord', conn: 'C13', w: 15 },
    ports: [{ t: 'serial', n: 8, s: '' }, { t: 'ethernet', n: 1, s: '1GbE' }],
  },

  // ── Misc ────────────────────────────────────────────────────────────────────
  {
    libId: 'blank',
    name: 'Blank panel',
    cat: 'misc', uH: 1, u: 6,
    pwr: { type: 'passive', conn: '', w: 0 },
    ports: [],
  },

  // ── UniFi Switches ──────────────────────────────────────────────────────────
  {
    libId: 'uf-usw24',
    name: 'USW-24',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 13 },
    ports: [{ t: 'ethernet', n: 24, s: '1GbE' }, { t: 'sfp', n: 2, s: '1GbE' }],
  },
  {
    libId: 'uf-usw24p',
    name: 'USW-24-POE (250W)',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 250 },
    ports: [{ t: 'ethernet', n: 24, s: '1GbE PoE' }, { t: 'sfp', n: 2, s: '1GbE' }],
  },
  {
    libId: 'uf-usw48',
    name: 'USW-48',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 23 },
    ports: [{ t: 'ethernet', n: 48, s: '1GbE' }, { t: 'sfp', n: 4, s: '1GbE' }],
  },
  {
    libId: 'uf-usw48p',
    name: 'USW-48-POE (500W)',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 500 },
    ports: [{ t: 'ethernet', n: 48, s: '1GbE PoE' }, { t: 'sfp', n: 4, s: '1GbE' }],
  },
  {
    libId: 'uf-pro24',
    name: 'USW-Pro-24',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 22 },
    ports: [{ t: 'ethernet', n: 24, s: '1GbE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-pro48',
    name: 'USW-Pro-48',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 34 },
    ports: [{ t: 'ethernet', n: 48, s: '1GbE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-pro24p',
    name: 'USW-Pro-24-POE',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 400 },
    ports: [{ t: 'ethernet', n: 24, s: '1GbE PoE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-ent24p',
    name: 'USW-Enterprise-24-PoE',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 400 },
    ports: [{ t: 'ethernet', n: 24, s: '2.5GbE PoE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-ent48p',
    name: 'USW-Enterprise-48-PoE',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 600 },
    ports: [{ t: 'ethernet', n: 48, s: '1GbE PoE' }, { t: 'sfp', n: 4, s: '10GbE' }],
  },
  {
    libId: 'uf-agg',
    name: 'USW-Aggregation',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 17 },
    ports: [{ t: 'sfp', n: 8, s: '10GbE' }],
  },
  {
    // 20× SFP+ 10G data ports + 4× SFP28 25G uplinks, no PoE
    libId: 'uf-pro-xg24',
    name: 'USW-Pro-XG-24',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 90 },
    ports: [
      { t: 'sfp',  n: 20, s: '10GbE' },
      { t: 'qsfp', n: 4,  s: '25GbE' },
    ],
  },
  {
    // 8× GbE PoE+ (802.3at) + 8× 2.5GbE PoE++ (802.3bt) + 2× SFP+ 10G uplinks
    // PoE budget ~300W; total max draw ~370W
    libId: 'uf-pro-max16p',
    name: 'USW-Pro-Max-16-PoE',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 370 },
    ports: [
      { t: 'ethernet', n: 8, s: '1GbE PoE+' },
      { t: 'ethernet', n: 8, s: '2.5GbE PoE++' },
      { t: 'sfp',      n: 2, s: '10GbE' },
    ],
  },

  // ── UniFi Gateways ──────────────────────────────────────────────────────────
  {
    // 8× GbE LAN + 1× GbE WAN (RJ45) + 1× SFP+ 10G WAN + 1× SFP+ 10G LAN
    libId: 'uf-udmpro',
    name: 'UDM-Pro',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 33 },
    ports: [
      { t: 'ethernet', n: 9, s: '1GbE' },
      { t: 'sfp',      n: 2, s: '10GbE' },
    ],
  },
  {
    libId: 'uf-udmse',
    name: 'UDM-SE',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 33 },
    ports: [{ t: 'ethernet', n: 8, s: '1GbE PoE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-uxgpro',
    name: 'UXG-Pro',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 25 },
    ports: [{ t: 'ethernet', n: 8, s: '1GbE' }, { t: 'sfp', n: 2, s: '10GbE' }],
  },
  {
    libId: 'uf-usgpro',
    name: 'USG-PRO-4',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 8 },
    ports: [{ t: 'ethernet', n: 4, s: '1GbE' }, { t: 'sfp', n: 2, s: '1GbE' }],
  },

  // ── UniFi NVR / Other ───────────────────────────────────────────────────────
  {
    libId: 'uf-unvr',
    name: 'UNVR',
    cat: 'unifi', uH: 1, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 30 },
    ports: [{ t: 'ethernet', n: 2, s: '1GbE' }],
  },
  {
    libId: 'uf-unvrpro',
    name: 'UNVR-Pro',
    cat: 'unifi', uH: 2, u: 6,
    pwr: { type: 'cord', conn: 'C13', w: 60 },
    ports: [{ t: 'ethernet', n: 2, s: '1GbE' }],
  },
  {
    libId: 'uf-uckg2p',
    name: 'UCK-G2-Plus',
    cat: 'unifi', uH: 1, u: 3,
    pwr: { type: 'poe', conn: 'RJ45', w: 15 },
    ports: [{ t: 'ethernet', n: 1, s: '1GbE' }, { t: 'usb-a', n: 1, s: '' }],
  },

  // ── Thin Clients / Mini PCs / SBCs ─────────────────────────────────────────
  // These are shelf-mounted (uH:1, sub-full-width); place them on a 1U/2U shelf.
  {
    libId: 'wyse-5070',
    name: 'Dell Wyse 5070',
    cat: 'compute', uH: 1, u: 3,   // ½ width — two fit side-by-side on a shelf
    pwr: { type: 'brick', conn: 'DC', w: 35 },
    ports: [
      { t: 'ethernet', n: 1, s: '1GbE' },
      { t: 'ethernet', n: 1, s: '2.5GbE' },
      { t: 'usb-a',    n: 6, s: 'USB 3.1' },
      { t: 'usb-c',    n: 2, s: 'USB 3.1' },
    ],
  },
  {
    libId: 'rpi4',
    name: 'Raspberry Pi 4',
    cat: 'compute', uH: 1, u: 2,   // ⅓ width — three per shelf row
    pwr: { type: 'usb', conn: 'USB-C', w: 7 },
    ports: [
      { t: 'ethernet', n: 1, s: '1GbE' },
      { t: 'usb-a',    n: 2, s: 'USB 3.0' },
      { t: 'usb-a',    n: 2, s: 'USB 2.0' },
      { t: 'hdmi',     n: 2, s: 'micro' },
    ],
  },
  {
    // MomentPlus N100 Mini PC — 112×125×23mm, Intel N100 4C up to 3.4GHz,
    // 8GB DDR4 (removable), 256GB M.2 SSD, WiFi 5, BT, mini SD, Win 11 Pro
    libId: 'n100-minipc',
    name: 'MomentPlus N100 Mini PC',
    cat: 'compute', uH: 1, u: 2,   // ⅓ width — 112mm wide, three per shelf row
    pwr: { type: 'brick', conn: 'DC', w: 15 },
    ports: [
      { t: 'ethernet', n: 1, s: '1GbE' },
      { t: 'usb-a',    n: 4, s: 'USB 3.0' },
      { t: 'hdmi',     n: 2, s: '' },
    ],
  },
  {
    // SEi8 Mini PC — i5-8279U 4C/8T up to 4.1GHz, 16GB DDR4, 500GB NVMe
    libId: 'sei8-minipc',
    name: 'SEi8 Mini PC (i5-8279U)',
    cat: 'compute', uH: 1, u: 3,   // ½ width — two per shelf row
    pwr: { type: 'brick', conn: 'DC', w: 45 },
    ports: [
      { t: 'ethernet', n: 1, s: '1GbE' },
      { t: 'usb-a',    n: 4, s: 'USB 3.0' },
      { t: 'hdmi',     n: 2, s: '4K' },
    ],
  },
  {
    // Lutron Caseta Smart Bridge (L-BDG2-WH)
    libId: 'lutron-lbdg2',
    name: 'Lutron Smart Bridge',
    cat: 'misc', uH: 1, u: 2,   // ⅓ width — tiny box, ~101×77mm
    pwr: { type: 'brick', conn: 'USB-A', w: 2 },
    ports: [
      { t: 'ethernet', n: 1, s: '100Mbps' },
      { t: 'usb-a',    n: 1, s: '' },
    ],
  },

  // ── ISP / WAN Equipment ──────────────────────────────────────────────────────
  {
    // Verizon FiOS ONT (Calix 716GE-I / Nokia G-010G-P — model varies by install)
    // SC/APC fiber in → RJ45 GbE out; wall-mount device placed on shelf
    libId: 'fios-ont',
    name: 'Verizon FiOS ONT',
    cat: 'networking', uH: 1, u: 3,   // ½ width
    pwr: { type: 'brick', conn: 'DC', w: 10 },
    ports: [
      { t: 'ethernet', n: 1, s: '1GbE' },
    ],
  },

  // ── Shelves ──────────────────────────────────────────────────────────────────
  // Shelves hold unracked units using the same ½ / ⅓ / ⅔ sizing.
  {
    libId: 'shelf-1u',
    name: '1U Vented Shelf',
    cat: 'shelf', uH: 1, u: 6,
    pwr: { type: 'passive', conn: '', w: 0 },
    ports: [],
  },
  {
    libId: 'shelf-2u',
    name: '2U Vented Shelf',
    cat: 'shelf', uH: 2, u: 6,
    pwr: { type: 'passive', conn: '', w: 0 },
    ports: [],
  },
]

export default BUILTIN_LIBRARY
