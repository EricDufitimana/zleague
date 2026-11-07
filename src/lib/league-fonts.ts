import localFont from 'next/font/local';
const host = localFont({ src: '../../public/fonts/design-lab/host-grotesk-latin-variable.woff2', weight: '300 800', display: 'swap', variable: '--font-matchday-body' });
const archivo = localFont({ src: '../../public/fonts/design-lab/archivo-latin-variable.woff2', weight: '100 900', display: 'swap', variable: '--font-matchday-brand' });
export const leagueFonts = `${host.variable} ${archivo.variable}`;
