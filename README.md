# Sparkle Jewellery

Sparkle Jewellery är en webbshop för smycken. Projektet började som en e-handel byggd med PHP och MySQL och har sedan vidareutvecklats med React, TypeScript och Express.

## Länkar

* **Webbshop:** https://sparkle-ecommerce-ten.vercel.app/
* **GitHub repository:** https://github.com/LynnWigardt/sparkle-ecommerce
* **Backend:** https://sparkle-ecommerce.onrender.com

## Teknik

* React
* TypeScript
* Vite
* Node.js
* Express
* Supabase (PostgreSQL och Storage)
* Algolia
* Stripe
* PostNord API
* Frankfurter API

## Projektstruktur

Projektet består av två delar:

* `client/` – Frontend byggd med React, TypeScript och Vite.
* `server/` – Backend byggd med Node.js och Express. Här hanteras API-anrop och integrationer med externa tjänster.

## Köra projektet lokalt

### Förutsättningar

Node.js och npm behöver vara installerat.

### 1. Klona projektet

```bash
git clone https://github.com/LynnWigardt/sparkle-ecommerce.git
cd sparkle-ecommerce
```

### 2. Starta backend

```bash
cd server
npm install
```

Skapa en `.env`-fil utifrån `server/.env.example` och fyll i nödvändiga miljövariabler.

Starta servern:

```bash
npm run dev
```

### 3. Starta frontend

Öppna en ny terminal:

```bash
cd client
npm install
npm run dev
```

Frontend startar på `http://localhost:5173`.

## Miljövariabler

Projektet använder miljövariabler för anslutningar och API-nycklar till bland annat Supabase, Algolia, Stripe och PostNord.

Hemliga nycklar ska endast finnas i backendens `.env`-fil och får inte laddas upp till GitHub.

En `.env.example` finns som visar vilka variabler som behöver anges, utan att innehålla riktiga nycklar.

Vid driftsättning anges miljövariablerna i Vercel och Render.

---

## Labb 1-5 Reflektioner

1. Vilken integrationsmodell använder varje tjänst (REST, webhook, redirect, fil eller SDK) och varför passar just den? 

I leverantörsintegrationen hämtas produktinformationen via API och importeras som CSV- och XML-filer. Den passar för att den är smidig att använda och passar bra till projektet i och med att den tillhandahåller produktinformation i de formaten. 
Sen använder jag Algolia som använder SDK för att kunna söka efter produkter, lägga till, uppdatera eller ta bort.  Så när en kund söker efter en produkt så skickas sökningen från Sparkle till Expresservern och sen vidare till Algolia som hämtas sökresultatet.  
För Stripe så använder jag redirect till deras betalsida. När man genomfört betalningen så skickas en webhook till min server och sen uppdateras ordern i Supabase. Så även om kunden skulle stänga ner webbsidan under betalningen så får ändå servern besked om betalningen. 
Sen använder jag Supabase SDK för att ladda upp produktbilder och hämta deras URL:er. 
REST använder jag för att hämta information från leverantörsapiet.  
PostNord använder REST/API-anrop.
 
2. Varför går anropen till externa tjänster via Express och inte direkt från React? 
För att det är betydligt säkrare helt enkelt. Alla API-nycklar och lösenord osv stannar på servern istället för att folk ska kunna hitta det. Och att servern kan kontrollera informationen innan den skickas vidare. Om kunden skulle lyckas manipulera priset så lyckas det inte ändå då React skickar produktens artikelnr och antal till Express som sedan hämtar det riktiga priset från Supabase. Så det är det verkligen priset som skickas till Stripe. 
 
3. Förklara kort för varje tjänst du har integrerat varför det är bättre att integrera den än 
att bygga samma sak själv. Vad skulle det kräva att bygga den själv? 

Det är ju jättesmidigt att använda tjänster som är byggda för just detta istället för att bygga samma sak själv. Dels tar det långt tid att bygga själv och dessutom är ju de framtagna för just detta och kan göra ett betydligt bättre jobb än vad jag själv kan. Sen är ju säkerhet en annan grej. Att använda sig av Stripe istället för att bygga ett betalsystem själv är ju en säkerhetsgrej. Att hantera folks känsliga kortuppgifter och direktkontakt med bank osv.  
Angående Algolia så slipper man bygga en sökmotor själv med allt vad det innebär. Att bygga alla funktioner när folk stavar fel och att ge relevanta sökförslag inom olika kategorier. Allmän filtrering. 
Och Supabase är ju fantastiskt på många olika sätt. Att både kunna lagra bilder, produkter, priser, lagerstatus och ordrar. Varför inte använda sig av hjälpmedel när de finns? Skulle krävas massor för att bygga själv. Hur man laddar upp, lagrar, hämtar bilder och dessutom all säkerhet för att ingen ska kunna komma åt bilderna eller information.  
Och angående CSV/XML så hämtar man ju produktinformationen direkt och allt är up to date. Skulle man bygga det själv så är ju det ett helt system av saker. 
Med Postnord så slipper du själv bygga ett system för att hitta utlämningsställen och beräkna leveranstider.
 
4. Vad händer i shoppen om var och en av tjänsterna är nere, och hur har du hanterat det? 

Jag har använt mig av felhantering och tidsgränser om något ligger nere eller tar för långt tid.  
Om leverantörsAPIet inte funkar alls så hämtas inga nya produkter och är det något fel så hoppas enskilda produkter över och orsaken rapporteras. 
Om Algolia ligger nere funkar inte sökningen som den ska men produkterna kan ändå sparas i databasen och servern kan ändå starta även om Algolia inte funkar.  
Om Stripe ligger nere kan inte kunden genomföra betalningen. Då får kunden felmeddelanden. Ordern går bara igenom och betalas om Stripe bekräftar betalningen via webhooken. Annars kommer felmeddelanden och ordern markeras inte som betald. Samma med att en betalning inte går igenom flera gånger. 
Om supabase krånglar går det inte att ladda upp nya produktbilder. Och om man lägger in nya bilder och det blir något fel så sparas ändå de gamla produktbilderna. 
Men om det ligger nere helt så kan vi inte alls spara eller hämta information från databasen. 
Svarar inte Postnord så finns felhantering och tidsgränser.

 
5. Vilka risker för beroendet med sig för minst en tjänst, t.ex. kostnad, ändrade villkor eller 
persondata (GDPR)? 

En risk med externa tjänster är ju att ändrar de i sina tjänster så ändras det ju hos mig också även om det inte är något jag vill eller planerat. Det kan även vara att de ändrar funktioner så att min webshop inte funkar med de funktioner de ändrat. Stripe är ju en säker tjänst istället för om jag själv hade behövt bygga den och sen tänkt på allt vad det innebär med GDPR t.ex. Nu i dagsläget ligger inte någon av kundens känsliga kortinformation hos mig.  
Ändras kostnaden för en tjänst så måste jag ta ett aktivt val om det är något jag vill fortsätta använda mig av och om det lönar sig. 
---

## Labb 5 – PostNord AI-dokumentation

Jag har använt ChatGPT i webbläsaren som hjälp under arbetet med PostNord-integrationen men kollar även av med chatgpt under arbetets gång. Jag har klistrat in relevanta delar av min kod och fått hjälp med att förstå API-anrop, strukturera lösningen och felsöka. 

Prompter jag använde: 

- Lägg till fält för postnummer så att kunden kan ange sitt postnummer och få fram närliggande PostNord-ombud. 
- Uppdatera min befintliga CheckoutPage.tsx i Sparkle Jewellery. Lägg till följande funktioner: 

Ett fält där kunden kan ange sitt postnummer. 
En knapp för att hämta närliggande PostNord-ombud via vår egen Express-server. 
En lista över ombuden där kunden kan välja ett. 
Möjlighet att välja mellan PostNord-ombud och hemleverans. 
Skicka leveranssätt, postnummer och valt ombuds ID tillsammans med produkterna till befintlig checkout-endpoint (/api/checkout). 

Krav: 
Visa felmeddelanden på svenska. 
Ändra inte på saker. 
Undvik onödiga saker och funktioner. 

Vad AI föreslog:
ChatGPT hjälpte mig att bygga upp flödet för PostNord. Kunden kan ange sitt postnummer, hämta närliggande ombud och välja vilket ombud som ska användas. 
Jag fick även hjälp med att hämta beräknad leveranstid utifrån kundens postnummer och det valda ombudet. Förslaget var att låta Express-servern sköta kommunikationen med PostNord och sedan skicka informationen vidare till React. 

Kontroll mot PostNords dokumentation:
Jag gick igenom PostNords API-dokumentation för att försöka förstå hur deras API fungerade och vilka uppgifter som behövdes för att hämta ombud och beräkna leveranstid. Jag tyckte dock att dokumentationen var ganska teknisk och hade svårt att förstå alla delar. 
Därför använde jag ChatGPT som stöd för att förstå hur API-anropen skulle byggas upp. Jag kontrollerade sedan lösningen genom att testa anropen mot PostNords sandbox och se att jag fick tillbaka rätt information. Jag testade även att hämta ombud och leveranstider i den färdiga webbshoppen. 
 
Hur jag löste det:
Jag använde ChatGPT, men testade lösningen själv och kontrollerade att den fungerade. 
Jag testade bland annat att hämta ombud, välja ett ombud och få fram en beräknad leveranstid. Jag kontrollerade också att leveranssätt och valt ombud sparades tillsammans med ordern. 
Hela tiden testade jag så att funktioner och hämtningar blev rätt. 

## Testning

Under arbetet har jag bland annat testat:

* Produktimport från CSV och XML.
* Produktsökning och paginering i Algolia.
* Stripe-testbetalningar och webhook.
* Bilduppladdning till Supabase Storage.
* PostNord-anrop för utlämningsställen och leveranstid.
* Fraktpriser och sparade fraktuppgifter i ordern.

## Deployment

Frontend är driftsatt via Vercel och backend via Render.

* **Frontend:** https://sparkle-ecommerce-ten.vercel.app/
* **Backend:** https://sparkle-ecommerce.onrender.com

Projektets miljövariabler är konfigurerade i respektive driftsättningstjänst.
