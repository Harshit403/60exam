import { MetadataRoute } from 'next'

const SITE_URL = 'https://missioncstestseries.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/?view=reviews`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/?view=discussions`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/?view=cs-executive`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/?view=cs-professional`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/?view=signin`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/?view=signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/?view=forgot-password`, lastModified: now, changeFrequency: 'monthly', priority: 0.1 },
    { url: `${SITE_URL}/admin`, lastModified: now, changeFrequency: 'monthly', priority: 0.1 },
  ]
}
