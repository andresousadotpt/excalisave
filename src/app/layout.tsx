import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import {Providers} from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Excalisave",
    description: "Self-hosted Excalidraw with end-to-end encryption",
    icons: {
        icon: "/excalisave-logo.png",
        apple: "/excalisave-logo.png",
    },
};

const themeScript = `
(function(){
  var t=localStorage.getItem('theme');
  var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  if(d)document.documentElement.classList.add('dark');
})();
`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{__html: themeScript}} />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
