# Foașca Online

Joc de cărți multiplayer real-time (2–6 jucători), bazat pe jocul local „Foașca”.
Monorepo cu 4 pachete npm workspaces:

```
packages/
  shared/   tipuri TypeScript partajate (Card, evenimente Socket.IO, constante)
  engine/   motorul de joc — pachet, coz, reguli, licitații, scor, mașina de stări (TESTAT, 62 teste)
  server/   Node.js + Express + Socket.IO — autoritate unică asupra stării jocului
  client/   React + Vite + Tailwind + PWA — interfața mobilă
```

## 1. Instalare

Necesită Node.js 18+ și npm 9+.

```bash
npm install
```

(instalează toate cele 4 pachete dintr-o dată, datorită npm workspaces)

## 2. Rulare locală

Deschide **două terminale**:

```bash
# Terminal 1 — serverul de joc (Socket.IO), implicit pe portul 3001
npm run dev:server

# Terminal 2 — clientul (Vite), implicit pe portul 5173
npm run dev:client
```

Apoi deschide `http://localhost:5173` în browser.

### Variabile de mediu

**`packages/server/.env`** (copiază din `.env.example`):

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**`packages/client/.env`** (opțional, doar dacă serverul nu e pe `localhost:3001`):

```
VITE_SERVER_URL=http://localhost:3001
```

## 3. Cum creezi o cameră și testezi multiplayer-ul

1. Pe telefonul/browserul tău: deschide site-ul → „Creează o cameră” → introdu numele →
   primești un cod de 5 caractere (ex. `ABCD7`).
2. Pe **alte telefoane/browsere** (sau taburi incognito, pentru test rapid pe același
   laptop): „Intră cu un cod” → introdu codul → introdu numele.
3. Ca să testezi de pe telefoane reale conectate la același Wi-Fi ca laptopul:
   - pornește clientul cu `npm run dev:client -- --host` (Vite afișează o adresă
     `http://192.168.x.x:5173`)
   - pe server, setează `CORS_ORIGIN=http://192.168.x.x:5173` (sau `*` temporar, pt. test local)
   - pe client, setează `VITE_SERVER_URL=http://192.168.x.x:3001`
   - deschide adresa respectivă pe telefoane
4. Hostul apasă **START JOC** când sunt minim 2 jucători conectați.
5. Testul automat de fum (`node smoketest.mjs`, inclus în acest zip) simulează exact
   acest flux cu 2 clienți reali WebSocket și joacă o partidă completă de 14 runde —
   rulează-l cu serverul pornit ca verificare rapidă că totul funcționează:
   ```bash
   npm run dev:server &
   node smoketest.mjs
   ```

## 4. Teste

Motorul de joc are 62 de teste unitare/integrare (Vitest), acoperind exact cerințele:
pachet, amestecare, distribuire 2–6 jucători, cozul, J♠ (J de verde) special, J♠-ca-coz, regula
formei, obligația de coz, câștigătorul mânii (inclusiv mai mulți coji și J♣),
rotația cererilor, regula sumei, PASS, toate scorurile (inclusiv runda 14),
confidențialitatea mâinilor, reconectarea, transferul de host, un joc complet
de 14 runde pentru 2/3/4/6 jucători.

```bash
npm run test:engine
```

## 5. Build de producție

```bash
npm run build:engine
npm run build:server
npm run build:client
```

`packages/client/dist/` conține site-ul static (cu PWA — installabil pe iPhone,
vezi secțiunea 7). `packages/server/dist/` conține serverul compilat (`node dist/index.js`).

## 6. Deploy

- **Server**: orice gazdă Node.js cu WebSocket persistent (Render, Railway, Fly.io,
  un VPS). Setează `PORT` și `CORS_ORIGIN` (domeniul clientului).
- **Client**: orice hosting static (Vercel, Netlify, Cloudflare Pages). Setează
  `VITE_SERVER_URL` la adresa publică a serverului (`https://api.domeniul-tau.com`).
- Ambele trebuie servite prin **HTTPS** în producție (necesar pentru WebSocket
  stabil pe rețele mobile și pentru instalarea PWA pe iPhone).

## 7. Instalare pe iPhone (PWA)

Nu există `.ipa` — asta ar necesita Xcode + macOS + cont Apple Developer + semnare
de cod, lucruri imposibile de produs dintr-un mediu Linux fără Xcode. În schimb,
aplicația e o **PWA completă**, instalabilă direct din Safari:

1. Deschide adresa site-ului în **Safari** pe iPhone.
2. Apasă butonul de „Share” (pătratul cu săgeata în sus).
3. „Add to Home Screen”.

Aplicația apare cu propria iconiță, pornește fullscreen (fără bara Safari) și se
comportă ca o aplicație nativă instalată.

### Drumul spre un `.ipa` real (opțional, pas următor)

Dacă vrei ulterior un `.ipa` semnat, cel mai simplu drum e **Capacitor**
(împachetează exact acest site într-un shell nativ iOS):

```bash
cd packages/client
npm install @capacitor/core @capacitor/ios
npx cap init "Foașca" "com.numele-tau.foaica"
npm run build
npx cap add ios
npx cap copy
npx cap open ios   # deschide proiectul în Xcode (necesită un Mac)
```

Din Xcode: semnezi cu contul tău Apple Developer și faci „Archive” → „Distribute
App” pentru un `.ipa`. Acest ultim pas nu poate fi făcut din acest mediu.

## 8. Arhitectura codului

- **`engine`** e complet independent de rețea — o clasă `GameRoom` care e o mașină
  de stări pură (`LOBBY → DEALING/TRUMP_REVEAL → BIDDING → ROUND_14_LOOK_PHASE? →
  PLAYING_TRICK → TRICK_RESULT → ROUND_RESULT → NEXT_ROUND → FINAL_RESULT`), testabilă
  fără server sau UI.
- **`server`** e un strat subțire peste `engine`: primește evenimente Socket.IO,
  le pasează motorului (care validează TOTUL — rândul, cartea deținută, regula
  formei/cozii, suma cererilor), și retrimite starea filtrată fiecărui client.
  Niciun client nu primește vreodată cărțile altui jucător — doar `handCount`.
- **`client`** e doar prezentare: nu conține nicio regulă de joc, doar afișează
  `ClientGameState` primit de la server și trimite acțiuni.

## 9. Decizii / presupuneri documentate (reguli ambigue în cerințe)

Cerințele au fost extrem de detaliate; câteva puncte nespecificate explicit au
fost rezolvate astfel (căutabile în cod după cuvântul „presupunere”):

1. **Cine deschide prima mână a fiecărei runde (nu doar runda 1)**: am generalizat
   regula rundei 1 („jucătorul de după host deschide”) — pornim de la aceeași
   poziție rotativă (`host + numărul rundei`) pentru runda 1; pentru rundele
   următoare, câștigătorul mânii precedente conduce mâna următoare (regulă
   explicită, secțiunea 10), deci generalizarea afectează doar PRIMA mână a
   fiecărei runde. Ușor de schimbat în `engine/src/bidding.ts` (`getBiddingOrder`)
   dacă vrei altă regulă.
2. **Egalitate de valoare în runda „noTrump” (J♣ e coz)**: dacă doi jucători joacă
   aceeași valoare pe culori diferite, câștigă cel jucat primul (nemenționat
   explicit în cerințe). Vezi `engine/src/rules.ts`, `bestByRankPower`.
3. **Pauza dintre mâini / runde**: „TRICK_RESULT” avansează automat după ~1.6s
   (server-side, `scheduleTrickAdvance`), ca jocul să curgă fără click-uri
   inutile; „ROUND_RESULT” așteaptă un click explicit al hostului (`Continuă`),
   ca jucătorii să apuce să citească scorurile rundei. Ambele praguri sunt ușor
   de schimbat.
4. **Host disconnect**: implementat transfer automat de host către următorul
   jucător conectat (secțiunea 29, varianta completă, nu doar reconectare).
5. **Persistență**: pentru acest MVP, starea jocului trăiește în memoria
   serverului (nu într-o bază de date) — reconectarea funcționează cât timp
   procesul serverului rămâne pornit (session token în `localStorage` pe
   client). Pentru producție cu restart-uri de server sau scalare pe mai multe
   instanțe, following pasul următor logic ar fi persistarea `GameRoom` în
   Postgres/Redis (structura e deja izolată în `roomManager.ts`, ușor de
   înlocuit cu un adaptor de bază de date fără să atingi `engine`).

## 10. Limitări cunoscute ale acestui MVP

- Fără bază de date — repornirea serverului pierde toate camerele active.
- Fără animații (dealing, trump-reveal) — stare instant, UI simplu. Ușor de
  adăugat ulterior în `GameTable.tsx` pe baza tranzițiilor de fază.
- Testarea end-to-end reală (2+ telefoane fizice) nu a putut fi automatizată în
  acest mediu (fără browser headless disponibil); a fost validată în schimb cu
  un test de fum (`smoketest.mjs`) folosind 2 clienți WebSocket reali (nu doar
  motorul intern), care joacă o partidă completă prin server. Testarea manuală
  pe telefoane reale rămâne recomandată înainte de a considera proiectul gata
  de partajat cu prietenii.
