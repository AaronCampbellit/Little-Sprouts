# Self-hosting and recovery

Little Sprouts is a static website. Development and builds need Node.js 24+; a deployed site needs only an HTTP server and the contents of `dist/`.

## Build and serve

```sh
npm ci
npm test
npm run build
```

Serve **all** of `dist/` at the root of an origin. Assets use absolute paths such as `/assets/` and `/audio/`, so deploying below a URL prefix requires additional application configuration. Use HTTPS for access from other devices; `localhost` is suitable for local testing.

No backend, application credentials, database, Node runtime, or speech-generation service is needed on the production server. Explorer profiles and progress live in each browser, not on the host.

## Docker Compose with Caddy

From the repository root, after building:

```sh
docker compose -f deploy/compose.yaml config -q
docker compose -f deploy/compose.yaml up -d --wait
docker compose -f deploy/compose.yaml ps
```

Open **http://localhost:8080/**. To stop this deployment:

```sh
docker compose -f deploy/compose.yaml down
```

The example uses a pinned Caddy image, uid/gid 1000, a read-only container filesystem, dropped capabilities, temporary writable directories, resource limits, and an HTTP health check. The host's served files must be readable by uid/gid 1000.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `SPROUTS_BIND_ADDRESS` | `127.0.0.1` | Host interface accepting requests |
| `SPROUTS_PORT` | `8080` | Host HTTP port |
| `SPROUTS_SITE_DIR` | `../dist` | Directory mounted as the site root; relative paths resolve from `deploy/` |

For a release directory elsewhere on the host:

```sh
SPROUTS_SITE_DIR=/srv/little-sprouts/current \
  docker compose -f deploy/compose.yaml up -d --force-recreate --wait
```

The example container serves HTTP. Put your existing HTTPS reverse proxy or tunnel in front of it and point the game hostname to that proxy. Choose a private bind interface reachable by your proxy: a proxy in another container cannot reach the host's loopback interface through its own `localhost`. Keep server addresses, tunnel credentials, and account-specific routing outside this public repository.

The default container and Compose project names are `little-sprouts-web` and `little-sprouts`. Adjust both when running multiple independent copies on one Docker host.

## Static-host requirements

`deploy/Caddyfile` includes the headers used by the application. On another host, preserve their intent:

- Serve HTML with `Cache-Control: no-cache, no-transform` so clients revalidate the entry document and intermediaries preserve it.
- Allow scripts, fonts, audio, images, and fetches from the site's own origin. The app fetches `/audio/manifest.json` and decodes same-origin MP3s through Web Audio.
- Preserve the content security policy and anti-framing headers. Do not inject scripts that conflict with `script-src 'self'`.
- Serve MP3 files as `audio/mpeg` and copy the manifest together with every referenced clip.
- Keep HTTPS, compression, and normal static-file responses working for the fonts, artwork, and application chunks.

The supplied policy disables camera, microphone, and geolocation access. Responses also request that search engines not index the site; this is not access control. The live demo and a default self-hosted copy serve public game content unless the host adds authentication.

The HTML `no-transform` policy also follows [Cloudflare's guidance on preventing JavaScript Detections injection](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/). A hosting provider's additional controls should be checked against the site's CSP.

## Release layout

A simple release layout keeps the previous build available:

```text
/srv/little-sprouts/
  current -> releases/<release>/dist
  releases/
    <previous-release>/dist/
    <release>/dist/
```

Build and check a release locally, copy only its static output to a new directory, then switch `current`. Do not copy `.git/`, `node_modules/`, personal exports, local QA files, Python environments, or speech-model weights into the served directory.

If Docker mounts the `current` symlink, recreate only this application's `web` service after switching it: the existing bind mount can continue serving the previously resolved directory. Set the same `SPROUTS_SITE_DIR` and other overrides on every deployment command. Preserve unrelated workloads.

Before accepting a release, check:

1. Tests and production build pass.
2. The intended title and complete home screen load without an error overlay.
3. Narration plays after a user gesture, including repeat and mute.
4. Questions, hints, answers, and manual continuation work.
5. Menus respond promptly; worlds and scenes follow the gentle-motion policy.
6. Desktop and landscape layouts remain usable, including reduced-motion settings.
7. Profile settings and export/restore work with a generic test profile.
8. The container is healthy and public HTTPS assets match the intended build.

## Rollback and backups

Point `current` back to a known-good release and recreate this application's `web` container using the same configuration and overrides. Verify the served document, assets, narration, and health check. Keep older releases until the new build passes acceptance.

A server backup does **not** back up browser progress. Use **Grown-ups → Download backup** in each browser. Restore replaces that browser's local explorer profiles; keep exported files private.

Automatic cross-device saves would require a separate design for authentication, per-family authorization, storage, backups, and schema migration. The current application does not upload progress.
