export const ROW_H = 36
export const MAX_U = 6

export const CAT_COLORS = {
  networking: { bg: '#185fa5', fg: '#b5d4f4' },
  compute:    { bg: '#3c3489', fg: '#cecbf6' },
  storage:    { bg: '#0f6e56', fg: '#9fe1cb' },
  power:      { bg: '#a32d2d', fg: '#f7c1c1' },
  kvm:        { bg: '#854f0b', fg: '#fac775' },
  misc:       { bg: '#444441', fg: '#b8b8b5' },
  custom:     { bg: '#3b6d11', fg: '#c0dd97' },
  unifi:      { bg: '#0C447C', fg: '#85B7EB' },
  shelf:      { bg: '#252835', fg: '#7880a0' },
}

export const PORT_LBL = {
  ethernet: 'RJ45', sfp: 'SFP', qsfp: 'QSFP',
  'usb-a': 'USB-A', 'usb-c': 'USB-C',
  hdmi: 'HDMI', dp: 'DP', serial: 'Serial',
  audio: '3.5mm', ipmi: 'IPMI',
}

export const UNITS_LBL = { 6: 'Full', 3: '½', 2: '⅓', 4: '⅔' }

export const RACK_SIZES = [4, 8, 12, 16, 24, 42]

export const CAT_ORDER = ['networking', 'compute', 'storage', 'power', 'kvm', 'unifi', 'misc', 'custom', 'shelf']

export const CAT_NAMES = {
  networking: 'Networking',
  compute:    'Compute',
  storage:    'Storage',
  power:      'Power',
  kvm:        'KVM / Console',
  unifi:      'UniFi',
  misc:       'Misc',
  custom:     'Custom',
  shelf:      'Shelves',
}
