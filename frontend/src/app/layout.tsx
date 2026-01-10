import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/navbar";
import { AuthProvider } from './context/authContext';
import { Kode_Mono, Exo_2} from 'next/font/google'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

import { JetBrains_Mono } from "next/font/google";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});
const exo2=Exo_2({
  subsets:["latin"],
  weight:['400','700']
})

const kodeMono = Kode_Mono({
  subsets: ['latin'],         // or whatever subsets you need
  weight: ['400','700'],      // optional: specify weights if needed
  display: 'swap',            // optional, recommended for better loading behavior
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
import { Fira_Code } from "next/font/google";

const firaCode = Fira_Code({
  subsets: ["latin"],
});


import { Source_Code_Pro } from "next/font/google";

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge",
  description: "Online Code Editor",
  icons:{
    icon:"/logo.jpeg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={exo2.className}
      >
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
