import './globals.css';
import type {Metadata,Viewport} from 'next';
export const metadata:Metadata={title:'IRON STANDARD | Mission Control',description:'Local tactical fitness and recomposition tracker'};
export const viewport:Viewport={themeColor:'#0c0e0c',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
