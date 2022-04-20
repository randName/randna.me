# ActivityPub Serverless

> [ActivityPub](https://activitypub.rocks/) implementation using [Netlify Functions](https://functions.netlify.com/)

- supports [WebFinger](https://webfinger.net) using redirects

## Quick start

1. Generate an RSA keypair

```sh
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -outform PEM -pubout public.pem
```

2. Copy `config.example.js` to `config.js` and configure it
3. Place your site files at `/public`
4. Generate a build with `npm run build`
5. Deploy with `npm run deploy`

## Further reading

- [How to read ActivityPub](https://tinysubversions.com/notes/reading-activitypub/)
