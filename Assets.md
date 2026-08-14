# Assets explaination

## Recommendation Architecture
```
Client (PBS KIDS website/app)
  └── GET /recommendations?id=...&type=game|video
        └── API Gateway
              └── Lambda (Node.js 22)
                    ├── Load bundled CSV dataset
                    ├── Look up source content by ID
                    ├── Score all candidates via Jaccard similarity
                    └── Return 4 recommendations (JSON)

## CSV columns

| Column | Description |
|--------|-------------|
| `id` | Unique content identifier |
| `type` | `game` or `video` |
| `title` | Display title |
| `slug` | URL slug |
| `theme` | Pipe-delimited theme tags (e.g., `Space\|Animals`) |
| `tags` | Pipe-delimited cross-cutting tags |
| `gameplay` | Pipe-delimited gameplay style tags |
| `mechanic` | Pipe-delimited learning mechanic tags |
| `perspective` | Pipe-delimited perspective tags |
| `minimumAge` | Editorial minimum age (may be null) |
| `maximumAge` | Editorial maximum age (may be null) |
| `showMinimumAge` | Show-level minimum age fallback |
| `showMaximumAge` | Show-level maximum age fallback |
| `minCurriculumAge` | Curriculum minimum age fallback |
| `maxCurriculumAge` | Curriculum maximum age fallback |

## Project structure

```
bin/                              CDK app entry point
lib/
├── config.ts                     Environment configuration (dotenv + getConfig)
├── recommendation-service-stack.ts   CDK stack definition
├── lambda-layer-stack.ts         Lambda layer stack
├── lambda-handler/
│   ├── index.ts                  Lambda handler entry point
│   ├── data/
│   │   └── content.csv           Bundled content dataset
│   ├── scoring/
│   │   ├── jaccard.ts            Jaccard index calculation
│   │   ├── dimensions.ts         themeScore, mechScore, ageScore
│   │   └── recommender.ts        Four-pairing selection logic
│   ├── models/
│   │   └── content-item.ts       CSV row → domain model
│   ├── validation/
│   │   └── input-validator.ts    Query param validation
│   ├── responses/
│   │   └── response-builder.ts   Response shape
│   ├── errors/
│   │   └── error-handler.ts      Error types and HTTP mapping
│   └── logging/
│       └── logger.ts             Structured JSON logger (AWS Lambda Powertools)
├── layer/                        Lambda layer dependencies
test/                             Jest test suite
docs/                             Architecture and algorithm documentation
.github/workflows/                CI/CD pipelines
```  

