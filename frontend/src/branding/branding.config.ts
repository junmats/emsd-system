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
  schoolName: 'Eager Minds School of Dalaguete',
  schoolShortName: 'EMSD System',
  address: 'Poblacion, Dalaguete, Cebu 6022',
  phone: '',
  email: '',
  primaryColor: '#800020',
  primaryDark: '#5c0018',
  sideMenuColor: '#2c3e50',
  sideMenuDark: '#1a252f',
  sideMenuFontColor: '#ffffff',
  faviconPath: 'favicons/emsd.ico',
  // EMSD uses default "Grade N" labels — omit gradeLevelLabels
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
