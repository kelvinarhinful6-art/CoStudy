// One place for CoStudy's look. Change colors here and the whole app updates.
export const colors = {
  // Ocean sky gradient (top -> bottom)
  sky: ['#052a52', '#0b6f8e', '#14a39a', '#56e0c4'] as [string, string, string, string],
  white: '#ffffff',
  glassBg: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.25)',
  textOnSky: '#ffffff',
  textSoft: 'rgba(255,255,255,0.8)',
  textFaint: 'rgba(255,255,255,0.6)',
  accentInk: '#0b6f8e', // text colour for white buttons
};

export const glass = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  overflow: 'hidden',
};
