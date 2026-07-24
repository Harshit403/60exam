import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import { siteConfig } from "@/lib/site-config";
import {
  OrganizationJsonLd,
  BreadcrumbJsonLd,
  CourseJsonLd,
  FAQJsonLd,
  ProductJsonLd,
  JsonLdScript,
} from "next-seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = siteConfig.url;
const LOGO_URL = `${SITE_URL}/logo.png`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MISSION CS Test Series - Ace Your CS Exams with India's Premier Test Series",
  description:
    "Join 20,000+ CS aspirants preparing with Mission CS Test Series. Comprehensive test series for CSEET, CS Executive, and CS Professional with 24-hour evaluation, expert feedback, and proven results including AIR 8 & 9.",
  keywords: [
    "CS Test Series",
    "CSEET Test Series",
    "CS Executive Test Series",
    "CS Professional Test Series",
    "Company Secretary",
    "CS Exam Preparation",
    "ICSI Mock Tests",
    "CSEET Mock Tests",
    "CS Executive Mock Tests",
    "CS Professional Mock Tests",
    "Company Secretary Course",
    "CS Answer Writing Practice",
    "Mission CS",
  ],
  authors: [{ name: "Mission CS Test Series" }],
  creator: "Mission CS Test Series",
  publisher: "Mission CS Test Series",
  applicationName: "Mission CS Test Series",
  category: "Education",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "MISSION CS Test Series - India's Premier CS Exam Preparation",
    description:
      "Join 20,000+ CS aspirants. Comprehensive test series for CSEET, CS Executive & CS Professional with 24-hour evaluation.",
    url: SITE_URL,
    siteName: "Mission CS Test Series",
    locale: "en_IN",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Mission CS Test Series - India's Premier CS Exam Preparation Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MISSION CS Test Series",
    description: "India's Premier CS Exam Preparation Platform",
    images: [OG_IMAGE],
    creator: "@missioncs",
  },
};

const courseLevels = [
  { key: "cseet", title: "CSEET Test Series", level: "Beginner", desc: "Comprehensive CS Executive Entrance Test preparation with mock tests, detailed feedback, and expert evaluation covering Business Communication, Legal Aptitude, Economic Environment, and Current Affairs." },
  { key: "executive", title: "CS Executive Test Series", level: "Intermediate", desc: "In-depth CS Executive test series covering Jurisprudence, Company Law, Tax Laws, Corporate Accounting, and Securities Law with line-by-line answer evaluation." },
  { key: "professional", title: "CS Professional Test Series", level: "Advanced", desc: "Advanced CS Professional test series covering Governance, Risk Management, Advanced Tax Laws, Secretarial Audit, and Corporate Funding with exam-pattern mock tests." },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="theme-color" content="#059669" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mission CS" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Mission CS" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="alternate" hrefLang="en-IN" href={SITE_URL} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="msapplication-config" content="none" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <OrganizationJsonLd
          type="Organization"
          name={siteConfig.fullName}
          alternateName={siteConfig.name}
          url={SITE_URL}
          logo={LOGO_URL}
          email="support@missioncstestseries.com"
          foundingDate="2021"
          sameAs={[
            "https://instagram.com/missioncs",
            "https://youtube.com/@missioncs",
            "https://linkedin.com/company/missioncs",
          ]}
        />
        <JsonLdScript
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: siteConfig.fullName,
            alternateName: siteConfig.name,
            url: SITE_URL,
            inLanguage: "en-IN",
            publisher: { "@id": `${SITE_URL}/#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          }}
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", item: SITE_URL },
            { name: "CS Test Series", item: `${SITE_URL}/#courses` },
            { name: "CSEET Test Series", item: `${SITE_URL}/#cseet` },
            { name: "CS Executive Test Series", item: `${SITE_URL}/#executive` },
            { name: "CS Professional Test Series", item: `${SITE_URL}/#professional` },
          ]}
        />
        {courseLevels.map((c) => (
          <CourseJsonLd
            key={c.key}
            type="single"
            name={c.title}
            description={c.desc}
            url={`${SITE_URL}/#${c.key}`}
          />
        ))}
        <FAQJsonLd
          questions={[
            { question: "What is the CSEET exam?", answer: "CSEET (CS Executive Entrance Test) is the entrance exam for the Company Secretary course conducted by ICSI, covering Business Communication, Legal Aptitude, Economic Environment, and Current Affairs." },
            { question: "How many papers are there in CS Executive?", answer: "CS Executive has 8 papers divided into 2 modules covering Jurisprudence, Company Law, Setting up Business, Tax Laws, Corporate Accounting, and Securities Law." },
            { question: "What is the eligibility for CS Professional?", answer: "Students who have cleared both modules of CS Executive are eligible to register for CS Professional, the final level of the Company Secretary course." },
            { question: "How does the test series evaluation work?", answer: "Our expert faculty evaluates each answer line-by-line and provides detailed feedback within 24 working hours, highlighting strengths and areas for improvement." },
            { question: "Can I access mock tests on mobile?", answer: "Yes, our platform is fully responsive and PWA-enabled, allowing you to access all mock tests and study materials on any device, including mobile phones." },
          ]}
        />
        <ProductJsonLd
          name={siteConfig.fullName}
          description="Comprehensive online test series for CSEET, CS Executive, and CS Professional examinations."
          url={SITE_URL}
          brand={{ "@type": "Brand", name: siteConfig.name }}
          aggregateRating={{
            "@type": "AggregateRating",
            ratingValue: 4.8,
            bestRating: 5,
            ratingCount: 2500,
          }}
          review={[
            {
              "@type": "Review",
              author: { "@type": "Person", name: "Priya Sharma" },
              reviewBody: "Mission CS Test Series helped me secure AIR 12 in CS Executive.",
              reviewRating: { "@type": "Rating", ratingValue: 5 },
            },
            {
              "@type": "Review",
              author: { "@type": "Person", name: "Rahul Verma" },
              reviewBody: "Best test series for CSEET preparation. Detailed feedback on every answer.",
              reviewRating: { "@type": "Rating", ratingValue: 5 },
            },
          ]}
        />
        <JsonLdScript
          data={{
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${SITE_URL}/#service`,
            name: siteConfig.fullName,
            description: "Comprehensive online test series for CSEET, CS Executive, and CS Professional Company Secretary examinations with expert faculty evaluation within 24 working hours.",
            serviceType: "CS Exam Test Series & Mock Tests",
            url: SITE_URL,
            inLanguage: "en-IN",
            areaServed: { "@type": "Country", name: "India" },
            provider: { "@id": `${SITE_URL}/#organization` },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: 4.8,
              bestRating: 5,
              worstRating: 1,
              ratingCount: 2500,
              reviewCount: 2500,
            },
          }}
        />
        <JsonLdScript
          data={{
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "@id": `${SITE_URL}/#organization`,
            name: siteConfig.fullName,
            alternateName: siteConfig.name,
            description: "India's premier Company Secretary exam preparation platform offering comprehensive test series for CSEET, CS Executive, and CS Professional with expert faculty evaluation and proven all-India ranks.",
            url: SITE_URL,
            logo: LOGO_URL,
            image: OG_IMAGE,
            email: "support@missioncstestseries.com",
            foundingDate: "2021",
            sameAs: [
              "https://instagram.com/missioncs",
              "https://youtube.com/@missioncs",
              "https://linkedin.com/company/missioncs",
            ],
          }}
        />
        {[
          { name: "Student Reviews", desc: "Read genuine reviews and success stories from CS aspirants who cleared their exams with Mission CS Test Series.", path: "/?view=reviews" },
          { name: "Discussion Forum", desc: "CS exam discussion forum where aspirants ask doubts, share strategies, and connect with peers and faculty.", path: "/?view=discussions" },
          { name: "CS Executive Test Series", desc: "Comprehensive CS Executive test series with mock tests, expert evaluation, and detailed answer feedback.", path: "/?view=cs-executive" },
          { name: "CS Professional Test Series", desc: "Advanced CS Professional test series with case-study based mock tests and expert faculty evaluation.", path: "/?view=cs-professional" },
        ].map((v) => (
          <JsonLdScript
            key={v.path}
            data={{
              "@context": "https://schema.org",
              "@type": "WebPage",
              "@id": `${SITE_URL}${v.path}#webpage`,
              name: v.name,
              description: v.desc,
              url: `${SITE_URL}${v.path}`,
              inLanguage: "en-IN",
              isPartOf: { "@id": `${SITE_URL}/#website` },
              about: { "@id": `${SITE_URL}/#organization` },
            }}
          />
        ))}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
