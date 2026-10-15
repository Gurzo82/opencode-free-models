# opencode-free-models

Plugin per **OpenCode 2**: nel selettore `/models` lascia visibili **solo i modelli gratuiti**, nascondendo tutto il resto. Niente dipendenze, nessuna chiave API, funziona con l'API del server e con l'app desktop.

Un modello viene mostrato se:

1. il provider è in `providers` **e** il modello è gratuito: token `free` nel nome/ID (`space-bunny-free`, `dots-3:free`, `openrouter/free`) **oppure** prezzo `0` su tutte le fasce (input, output, cache read/write);
2. **oppure** il provider è in `allFree` (tutti i suoi modelli sono gratuiti per te, es. NVIDIA con credito gratuito);
3. in ogni caso il modello **non** corrisponde a nessun pattern di `exclude` (embedding, rerank, guard, voce, traduzione…).

Il filtro gira a ogni ricostruzione del catalogo (refresh di models.dev, cambio provider o credenziali, reload della config), quindi i modelli che vengono aggiunti o rimossi vengono filtrati da soli. Il modello di default **non** viene toccato: lo sceglie OpenCode, e siccome restano solo modelli gratuiti, resta gratuito.

## Installazione

Da un repository git (consigliata, così è aggiornabile su più macchine):

```sh
opencode plugin add github:<tuo-utente>/opencode-free-models
```

oppure direttamente nella configurazione (`~/.config/opencode/opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:<tuo-utente>/opencode-free-models"],
}
```

Per pinnare una versione: `"github:<tuo-utente>/opencode-free-models#v1.0.0"`.

Locale, senza git: copia la cartella in `~/.config/opencode/plugins/` (i pacchetti plugin vengono scoperti automaticamente) oppure referenziala con un path:

```jsonc
"plugins": ["file:///percorso/assoluto/opencode-free-models"]
```

## Opzioni

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "github:<tuo-utente>/opencode-free-models",
      "options": {
        "providers": ["opencode", "openrouter"],
        "allFree": ["nvidia"],
        "exclude": ["*embed*", "*rerank*", "*guard*"],
        "nameToken": "free",
        "includeZeroCost": true,
        "log": true
      }
    }
  ]
}
```

| Opzione | Default | Significato |
| --- | --- | --- |
| `providers` | `["opencode", "openrouter"]` | Provider per cui si applica la regola "gratuito" |
| `allFree` | `["nvidia"]` | Provider con **tutti** i modelli gratuiti: nessun filtro di prezzo |
| `exclude` | vedi `index.ts` | Glob (`*` = qualsiasi sequenza) su `provider/modello`, nascosti ovunque |
| `nameToken` | `"free"` | Parola cercata nel nome/ID del modello |
| `includeZeroCost` | `true` | Include i modelli a prezzo 0 anche senza `free` nel nome |
| `log` | `true` | Righe di log (deduplicate) sul console del server |

## Note

- Un modello con prezzi **sconosciuti** (nessuna fascia di costo) non viene considerato gratuito.
- Le sessioni già aperte mantengono il modello selezionato: il filtro vale per nuove selezioni e nuove sessioni.
- Il file è watchato: le modifiche si applicano senza riavviare OpenCode.