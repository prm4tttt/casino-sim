# Clutch Picks

A free-play casino game simulator that runs entirely in the browser. Credits are play money with no cash
value: there are no deposits, withdrawals or payments of any kind.

## Games

Dice, Limbo, Mines, Plinko, Crash, Keno, HiLo, Blackjack, plus two originals: Coin Ladder and Vault Cracker.

## How results are generated

Every outcome is derived from `HMAC-SHA256(serverSeed, clientSeed:nonce:round)`. The server seed's SHA-256
hash is shown before you bet; rotating the seed pair reveals the old server seed so any past bet can be
recomputed on the Fairness page. Because there is no backend, the "server" seed lives in your browser: the
scheme is here to show how verification works, not to protect anything of value.

Payout tables are built so each game returns about 99% of stakes over time (Blackjack follows standard
rules instead). `npm test` checks the maths.

## Develop

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Stack: React, TypeScript, Vite, Tailwind CSS, Zustand.

## Deploy

Pushing to `main` builds and publishes the site with GitHub Pages. Enable it once under
**Settings → Pages → Source: GitHub Actions**.
