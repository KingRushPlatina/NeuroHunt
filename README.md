# NeuroHunt - Reddit API NestJS Project

Un progetto NestJS che espone API per interfacciarsi con Reddit utilizzando le credenziali fornite.

## Struttura del Progetto

```
NeuroHunt/
├── lib/
│   └── reddit-client.ts          # Classe per interfacciarsi con Reddit API
├── src/
│   ├── reddit/
│   │   ├── reddit.controller.ts  # Controller per esporre le API
│   │   ├── reddit.service.ts     # Service per la logica di business
│   │   └── reddit.module.ts      # Modulo Reddit
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── .env                          # Variabili d'ambiente
└── package.json
```

## API Endpoints

Il server espone i seguenti endpoint:

### 1. Status dell'API
```
GET /reddit/status
```
Verifica lo stato dell'autenticazione con Reddit.

### 2. Post da Subreddit
```
GET /reddit/subreddit/:subreddit?sort=hot&limit=25&after=
```
Ottiene i post da un subreddit specifico.

**Parametri:**
- `subreddit`: Nome del subreddit (es: "programming")
- `sort`: Ordinamento (hot, new, top, rising) - default: hot
- `limit`: Numero di post da recuperare - default: 25
- `after`: ID per paginazione

**Esempio:**
```
GET /reddit/subreddit/programming?sort=hot&limit=10
```

### 3. Ricerca Post
```
GET /reddit/search?q=query&subreddit=&sort=relevance&limit=25
```
Cerca post su Reddit.

**Parametri:**
- `q`: Query di ricerca (obbligatorio)
- `subreddit`: Limita la ricerca a un subreddit specifico
- `sort`: Ordinamento (relevance, hot, top, new, comments) - default: relevance
- `limit`: Numero di risultati - default: 25

**Esempio:**
```
GET /reddit/search?q=javascript&subreddit=programming&limit=5
```

### 4. Dettagli Post
```
GET /reddit/post/:subreddit/:postId
```
Ottiene i dettagli di un post specifico.

**Esempio:**
```
GET /reddit/post/programming/abc123
```

### 5. Informazioni Utente
```
GET /reddit/user/:username
```
Ottiene informazioni su un utente Reddit.

**Esempio:**
```
GET /reddit/user/spez
```

## Configurazione

### Variabili d'Ambiente

Il progetto utilizza le seguenti variabili d'ambiente (configurate nel file `.env`):

```env
REDDIT_CLIENT_ID=bGcHCfYbwpst97TmgMNpvg
REDDIT_CLIENT_SECRET=dM2flqptvZ27u_rIEmSn-XEemOVGrg
REDDIT_USER_AGENT=IdeaFinderBot by u/Bulky_Wash_8244
PORT=3000
```

## Installazione e Avvio

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm

### Installazione
```bash
# Installa le dipendenze
npm install
```

### Avvio del Server
```bash
# Modalità sviluppo (con hot reload)
npm run start:dev

# Modalità produzione
npm run start:prod

# Build del progetto
npm run build
```

Il server sarà disponibile su `http://localhost:3000`

## Dipendenze Principali

- **@nestjs/core**: Framework NestJS
- **@nestjs/config**: Gestione configurazione e variabili d'ambiente
- **axios**: Client HTTP per le chiamate alle API Reddit
- **TypeScript**: Linguaggio di programmazione

## Classe RedditClient

La classe `RedditClient` nella cartella `lib/` gestisce:

- Autenticazione con Reddit API usando OAuth2
- Recupero post da subreddit
- Ricerca di post
- Recupero dettagli post specifici
- Informazioni utenti
- Gestione automatica del token di accesso

## Esempi di Utilizzo

### Test delle API con curl

```bash
# Verifica status
curl http://localhost:3000/reddit/status

# Post da r/programming
curl "http://localhost:3000/reddit/subreddit/programming?limit=5"

# Ricerca
curl "http://localhost:3000/reddit/search?q=nestjs&limit=3"

# Informazioni utente
curl http://localhost:3000/reddit/user/spez
```

## Note di Sicurezza

- Le credenziali Reddit sono configurate tramite variabili d'ambiente
- Il file `.env` non dovrebbe essere committato nel repository
- L'autenticazione con Reddit avviene automaticamente quando necessario
