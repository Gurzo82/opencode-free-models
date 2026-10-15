/**
 * free-models — nel selettore /models lascia SOLO i modelli gratuiti.
 *
 * Sono ammessi due tipi di provider:
 *   - DEFAULTS.providers: si applica la regola "gratuito" (token "free" nel nome/ID
 *     oppure prezzo 0 su tutte le fasce)
 *   - DEFAULTS.allFree: provider con TUTTI i modelli gratuiti per te, nessun filtro
 *     (es. nvidia: credito NVIDIA gratuito su tutto il catalogo)
 *
 * DEFAULTS.exclude nasconde sempre i modelli che non servono come modello di lavoro
 * (embedding, rerank, guard di sicurezza, modelli voce/traduzione): e' dinamico, quindi
 * vale anche per i modelli che NVIDIA o OpenRouter aggiungeranno in futuro.
 *
 * Tutto il resto viene impostato enabled = false e sparisce dal selettore.
 * Il default NON viene toccato: lo sceglie OpenCode (solo tra i modelli rimasti, quindi gratis).
 *
 * Il filtro e' dinamico: gira a ogni ricostruzione del catalogo (refresh models.dev,
 * cambio provider o credenziali, reload della configurazione), quindi i modelli aggiunti
 * o rimossi vengono filtrati senza toccare nessun file.
 */

const DEFAULTS = {
  providers: ["opencode", "openrouter"],
  allFree: ["nvidia"],
  // modelli da nascondere su QUALSIASI provider (embedding, rerank, guard, voce...):
  // pattern con * = qualsiasi sequenza, confrontato su "provider/modello"
  exclude: [
    "*embed*",
    "*bge*",
    "*rerank*",
    "*retriever*",
    "*guard*",
    "*safety*",
    "*usd*",
    "*esm*",
    "*voice*",
    "*translate*",
  ],
  nameToken: "free",
  includeZeroCost: true,
  log: true,
}

type Options = Partial<typeof DEFAULTS>

type CostTier = {
  input?: number
  output?: number
  cache?: { read?: number; write?: number }
}

type ModelLike = {
  id: string
  name?: string
  enabled?: boolean
  cost?: CostTier[]
}

export default {
  id: "free-models",

  async setup(ctx: any) {
    const options: Options = { ...DEFAULTS, ...(ctx.options ?? {}) }
    const allowed = new Set<string>(options.providers)
    const allFree = new Set<string>(options.allFree ?? [])
    const token = options.nameToken.toLowerCase()

    // "*" = qualsiasi sequenza; il confronto e' su "provider/modello", case-insensitive
    const excludedPatterns = (options.exclude ?? []).map(
      (pattern) =>
        new RegExp(
          "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
          "i",
        ),
    )
    const isExcluded = (providerID: string, modelID: string) => {
      const ref = `${providerID}/${modelID}`
      return excludedPatterns.some((re) => re.test(ref))
    }

    const log = (...args: unknown[]) => {
      if (options.log) console.log("[free-models]", ...args)
    }

    // regola 1: "free" nel nome o nell'ID del modello
    const freeByName = (model: ModelLike) =>
      String(model.id).toLowerCase().includes(token) ||
      String(model.name ?? "").toLowerCase().includes(token)

    // regola 2: prezzo zero su ogni fascia. Senza prezzi noti il modello non e' "gratis".
    const freeByCost = (model: ModelLike) => {
      const tiers = Array.isArray(model.cost) ? model.cost : []
      if (tiers.length === 0) return false
      return tiers.every(
        (tier) => !tier.input && !tier.output && !tier.cache?.read && !tier.cache?.write,
      )
    }

    const isFree = (model: ModelLike) =>
      freeByName(model) || (options.includeZeroCost && freeByCost(model))

    // firma del risultato: evita di ripetere il log a ogni ricostruzione del catalogo
    let lastSignature = ""

    log(
      `attivo — filtrati per nome/prezzo: ${[...allowed].join(", ") || "nessuno"} | ` +
        `tutti i modelli ammessi senza filtro: ${[...allFree].join(", ") || "nessuno"}`,
    )

    await ctx.model.transform((editor: any) => {
      const models = editor.list() as ModelLike[]
      const kept: ModelLike[] = []

      for (const model of models) {
        const providerAllFree = allFree.has(model.providerID)
        const keep =
          !isExcluded(model.providerID, model.id) &&
          (providerAllFree || (allowed.has(model.providerID) && isFree(model)))
        if (model.enabled !== keep) {
          editor.update(model.providerID, model.id, (draft: any) => {
            draft.enabled = keep
          })
        }
        if (keep) kept.push(model)
      }

      const keptIds = kept.map((m) => `${m.providerID}/${m.id}`).sort()
      const signature = keptIds.join(",")
      if (signature !== lastSignature) {
        lastSignature = signature
        log(`${kept.length} modelli gratuiti attivi su ${models.length} in catalogo`)
        log(`attivi: ${keptIds.join(", ")}`)
      }
    })
  },
}