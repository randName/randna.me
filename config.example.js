export default {
  username: 'exampleName',

  // URL for site
  url: 'https://example.com',
  // path to ActivityPub profile
  profilePath: 'me',

  // (optional) ActivityPub Actor profile info
  profile: {
    name: 'Example Name',
  },

  // (optional) WebFinger Link Relations (https://webfinger.net/rel/)
  linkRelations: {
    'http://webfinger.net/rel/profile-page': {
      type: 'text/html',
      href: 'https://example.com',
    },
  },
}
