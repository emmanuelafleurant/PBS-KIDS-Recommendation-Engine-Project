# Assets explaination

# Asset folder
```
Assets 
    ├──STEAM-inspo-v2.jpeg              mockup inspired by STEAM discovery page
    ├──STEAM-inspo-zoom-out.jpeg        mockup inspired by STEAM discovery page zoom out
    ├──STEAM-inspo.jpeg
    ├──design-board.pdf                 canvas board design
    ├──final-user-experience.jpeg       mockup implemented for video demonstration
    ├──gameplayer-v1.jpeg               gameplay mockup
    ├──gameplayer-v2.jpeg               gameplay mockup
    ├──survey-1.png                     first survey question (ranking system)
    ├──survey-2.png                     second survery question (ranking system)
    └──survey-3.png                     third survey quesiton (ranking system)
```

These assets were used to visualize possible user experience. (see Assets folder)

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
```

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


## API service 

### `Get /recommendations`

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Content ID to get recommendations for |
| `type` | No | `game` or `video` — optional hint, ID lookup handles disambiguation |

**Success Response — 200**

```json
{
  "sourceId": "abc123",
  "recommendations": [
    {
      "slot": "theme_mech_match",
      "id": "def456",
      "title": "Molly's Math Adventure",
      "type": "game",
      "slug": "mollys-math-adventure",
      "scores": {
        "theme": 0.83,
        "mech": 0.75,
        "age": 0.60,
        "combined": 0.73
      }
    },
    {
      "slot": "theme_match_mech_diff",
      ...
    },
    {
      "slot": "mech_match_theme_diff",
      ...
    },
    {
      "slot": "random",
      ...
    }
  ]
}
```
