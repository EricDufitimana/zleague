import { Metadata } from "next"

export const siteConfig = {
  name: "ZLeague",
  description: "Track matches, predict winners, and view tournament brackets for football, basketball, and volleyball competitions.",
  url: "https://zleague.com", // Update with your actual domain
}

export function createMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description || siteConfig.description,
    icons: {
      icon: [
        { url: '/logo/logo.svg', type: 'image/svg+xml' },
      ],
      apple: '/logo/logo.svg',
    },
    openGraph: {
      title,
      description: description || siteConfig.description,
      siteName: siteConfig.name,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || siteConfig.description,
    },
  }
}

