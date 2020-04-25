const config = {
  siteTitle: 'Muh Isfhani Ghiath',
  siteTitleShort: 'Muh Isfhani Ghiath',
  siteTitleAlt: 'Muh Isfhani Ghiath',
  siteLogo: '/logos/logo-1024.png',
  siteUrl: 'https://www.isfaa.js.org',
  repo: 'https://github.com/isfaaghyth/isfaa.js.org',
  pathPrefix: '',
  dateFromFormat: 'YYYY-MM-DD',
  dateFormat: 'MMMM Do, YYYY',
  siteDescription:
    'Isfha Ganteng',
  siteRss: '/rss.xml',
  googleAnalyticsID: 'UA-42068444-1',
  postDefaultCategoryID: 'Tech',
  newsletter: 'https://isfaaghyth.substack.com',
  newsletterEmbed: 'https://isfaaghyth.substack.com/embed',
  userName: 'isfaaghyth',
  userEmail: 'hello@isfaa.js.org',
  userTwitter: 'isfaaghyth',
  menuLinks: [
    {
      name: 'About',
      link: '/me/',
    },
    {
      name: 'Articles',
      link: '/blog/',
    },
    {
      name: 'Newsletter',
      link: '/newsletter/',
    },
  ],
  themeColor: '#3F80FF', // Used for setting manifest and progress theme colors.
  backgroundColor: '#ffffff',
}

// Make sure pathPrefix is empty if not needed
if (config.pathPrefix === '/') {
  config.pathPrefix = ''
} else {
  // Make sure pathPrefix only contains the first forward slash
  config.pathPrefix = `/${config.pathPrefix.replace(/^\/|\/$/g, '')}`
}

// Make sure siteUrl doesn't have an ending forward slash
if (config.siteUrl.substr(-1) === '/') config.siteUrl = config.siteUrl.slice(0, -1)

// Make sure siteRss has a starting forward slash
if (config.siteRss && config.siteRss[0] !== '/') config.siteRss = `/${config.siteRss}`

module.exports = config
