// Single source of truth for school identity/branding.
// To white-label this app for a new school, edit this file before building/deploying.
export const branding: {
  schoolName: string;
  schoolShortName: string;
  address: string;
  phone: string;
  email: string;
  primaryColor: string;
  primaryDark: string;
  sideMenuColor: string;
  sideMenuDark: string;
  sideMenuFontColor: string;
  faviconPath: string;
  gradeLevelLabels?: { [key: number]: string };
} = {
  schoolName: 'Meadow of Growth',
  schoolShortName: 'MOG System',
  address: 'Poblacion, Dalaguete, Cebu 6022',
  phone: '',
  email: '',
  primaryColor: '#025ded',
  primaryDark: '#033c96',
  sideMenuColor: '#ffffff',
  sideMenuDark: '#e3e3e3',
  sideMenuFontColor: '#1a1a1a',
  faviconPath: 'favicons/mog.png',
  gradeLevelLabels: {
    1: 'Play Group',
    2: 'Nursery',
    3: 'Kinder',
    4: 'Preparatory'
  }
};

export function getGradeLabel(level: number): string {
  return branding.gradeLevelLabels?.[level] ?? `Grade ${level}`;
}

export const minGrade: number = branding.gradeLevelLabels
  ? Math.min(...Object.keys(branding.gradeLevelLabels).map(Number))
  : 1;

export const maxGrade: number = branding.gradeLevelLabels
  ? Math.max(...Object.keys(branding.gradeLevelLabels).map(Number))
  : 6;
