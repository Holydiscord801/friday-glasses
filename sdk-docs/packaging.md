# Packaging and deployment

## Even Hub CLI

```bash
npm install -D @evenrealities/evenhub-cli
```

Commands: `evenhub login`, `evenhub init`, `evenhub qr`, `evenhub pack`

### QR code for dev

```bash
npx evenhub qr --url "https://friday-glasses.vercel.app"
npx evenhub qr --http --port 5173  # local dev
```

### Production pack

```bash
npm run build && evenhub pack app.json dist -o friday.ehpk
```

## app.json manifest

```json
{
  "package_id": "ai.coreline.friday",
  "edition": "202601",
  "name": "Friday",
  "version": "1.0.0",
  "min_app_version": "0.1.0",
  "tagline": "Friday AI on your glasses",
  "description": "Connects Friday AI assistant to G2 glasses display",
  "author": "Micah Baird",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["*"]
  }
}
```

> Source: https://github.com/nickustinov/even-g2-notes — archived 2026-03-20
