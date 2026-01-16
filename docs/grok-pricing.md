# Grok Models & Pricing (Markdown)

_Last compiled: 2026-01-14_

This file consolidates the Grok pricing information **as provided in your screenshot and pasted pricing excerpt**.

---

## Pricing units (as shown in the excerpts)

- **Token pricing** is shown **per 1,000,000 (1M) tokens**.
- Some features are priced differently:
  - **Image generation**: priced **per generated image output**.
  - **Live search**: priced **per 1,000 sources** (for models/features that support it).

---

## Grok 4.1 Fast (featured excerpt)

**Model name:** `grok-4-1-fast-reasoning`  
**Aliases:** `grok-4-1-fast`, `grok-4-1-fast-reasoning-latest`  
**Context window:** 2,000,000  
**Regions mentioned:** `us-east-1`, `eu-west-1`  

### Pricing (per 1M tokens)
| Item | Price |
|---|---:|
| Input tokens | $0.20 |
| Cached input tokens | $0.05 |
| Output tokens | $0.50 |

### Live search
| Item | Price |
|---|---:|
| Live search | $25.00 per 1K sources |

### Rate limits (as stated)
| Metric | Limit |
|---|---:|
| Requests per minute (RPM) | 480 |
| Tokens per minute (TPM) | 4,000,000 |

### Higher-context note
- A separate “higher context pricing” applies for requests exceeding **128K context**, but the excerpt does not include the exact rates.

---

## Available models (from your “Available models” screenshot)

> Pricing column is shown as **Input • Output** (per 1M tokens) unless otherwise noted.

### Language models

| Model | Context | Rate limits | Input ($/1M) | Output ($/1M) |
|---|---:|---|---:|---:|
| `grok-4-1-fast-reasoning` | 2,000,000 | 4M TPM • 480 RPM | 0.20 | 0.50 |
| `grok-4-1-fast-non-reasoning` | 2,000,000 | 4M TPM • 480 RPM | 0.20 | 0.50 |
| `grok-code-fast-1` | 256,000 | 2M TPM • 480 RPM | 0.20 | 1.50 |
| `grok-4-fast-reasoning` | 2,000,000 | 4M TPM • 480 RPM | 0.20 | 0.50 |
| `grok-4-fast-non-reasoning` | 2,000,000 | 4M TPM • 480 RPM | 0.20 | 0.50 |
| `grok-4-0709` | 256,000 | 2M TPM • 480 RPM | 3.00 | 15.00 |
| `grok-3-mini` | 131,072 | 480 RPM | 0.30 | 0.50 |
| `grok-3` | 131,072 | 600 RPM | 3.00 | 15.00 |
| `grok-2-vision-1212` | 32,768 | 600 RPM | 2.00 | 10.00 |
| `grok-2-1212` | 131,072 | 900 RPM | 2.00 | 10.00 |

### Image generation models

| Model | Rate limits | Price |
|---|---|---:|
| `grok-2-image-1212` | 300 RPM | $0.07 per generated image |

---

## Models & Pricing table (from your pasted “Models and Pricing” excerpt)

> This section is reproduced from the provided table text.  
> Note: Some values (e.g., vision context size) may differ from the screenshot above.

| Model | Modalities | Context | Input ($/1M) | Output ($/1M) | Other |
|---|---|---:|---:|---:|---|
| `grok-3-beta` / `grok-3` / `grok-3-latest` | TEXT → TEXT | 131,072 | 3.00 | 15.00 | — |
| `grok-3-fast-beta` / `grok-3-fast` / `grok-3-fast-latest` | TEXT → TEXT | 131,072 | 5.00 | 25.00 | — |
| `grok-3-mini-beta` / `grok-3-mini` / `grok-3-mini-latest` | TEXT → TEXT | 131,072 | 0.30 | 0.50 | — |
| `grok-3-mini-fast-beta` / `grok-3-mini-fast` / `grok-3-mini-fast-latest` | TEXT → TEXT | 131,072 | 0.60 | 4.00 | — |
| `grok-2-vision-1212` / `grok-2-vision` / `grok-2-vision-latest` | IMAGE+TEXT → TEXT | 8,192 | 2.00 | 10.00 | Image input: $2.00 / 1M tokens |
| `grok-2-image-1212` / `grok-2-image` / `grok-2-image-latest` | TEXT → (Image) | 131,072 | — | — | $0.07 per generated image |
| `grok-2-1212` / `grok-2` / `grok-2-latest` | TEXT → TEXT | 131,072 | 2.00 | 10.00 | — |
| `grok-vision-beta` | IMAGE+TEXT → TEXT | 8,192 | 5.00 | 15.00 | Image input: $5.00 / 1M tokens |
| `grok-beta` | TEXT → TEXT | 131,072 | 5.00 | 15.00 | — |

---

## Notes / sanity checks

- **Cached input tokens**: The featured Grok 4.1 Fast excerpt includes a discounted cached-input rate ($0.05 / 1M).
- **Live search billing** (where applicable) is separate and priced per **1,000 sources**.
- **Context size discrepancies**: your screenshot shows `grok-2-vision-1212` with **32,768** context, while the pasted pricing table lists **8,192**. Use the value shown in your account/region for billing and limits.

---

## Source material (provided by you)

- Screenshot: “Available models”
- Text excerpt: “Grok 4.1 Fast” pricing details + “Models and Pricing” table
