# Unity Scoring API Documentation

## Overview

The Unity Scoring API provides an isolated endpoint for scoring radio telephony transmissions from the Unity game client. This API is completely separate from the web-based STT Test scoring system.

Every scoring request is processed by **all 3 models in parallel**:
- **GPT-4o** - Highest quality, highest cost
- **GPT-4o-mini** - Good balance of quality and cost
- **Grok 4.1 Fast** - Fastest response, lowest cost

---

## Endpoint

```
POST /api/unity/score
```

---

## Authentication

Include your API key in the `X-API-Key` header.

```http
X-API-Key: your-api-key-here
```

The API key can be configured in the web dashboard under **STANDALONE SCORING (Unity) > Configuration**.

---

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `X-API-Key` | Your API key | Yes |

### Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcript` | string | Yes | What the user actually said |
| `expected` | string | Yes | The correct/expected transmission |
| `difficulty` | string | Yes | `"easy"`, `"medium"`, or `"hard"` |
| `customPrompt` | string | No | Override the default scoring prompt |

### Example Request

```json
{
  "transcript": "Tower Alpha One ready for departure runway two seven",
  "expected": "Tower, Alpha One, ready for departure runway 27",
  "difficulty": "medium"
}
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "input": {
    "transcript": "Tower Alpha One ready for departure runway two seven",
    "expected": "Tower, Alpha One, ready for departure runway 27",
    "difficulty": "medium"
  },
  "modelResults": {
    "gpt-4o": {
      "scores": {
        "structure": {
          "score": 28,
          "details": "Correct order: receiver, sender, intent"
        },
        "accuracy": {
          "score": 45,
          "details": "Minor omission of comma after Tower"
        },
        "fluency": {
          "score": 20,
          "fillers": [],
          "details": "No hesitation detected"
        }
      },
      "total": 93,
      "feedback": "Excellent transmission with minor punctuation difference.",
      "cost": 0.00312,
      "latency_ms": 1250
    },
    "gpt-4o-mini": {
      "scores": {
        "structure": { "score": 27, "details": "..." },
        "accuracy": { "score": 44, "details": "..." },
        "fluency": { "score": 20, "fillers": [], "details": "..." }
      },
      "total": 91,
      "feedback": "Good transmission overall.",
      "cost": 0.00078,
      "latency_ms": 820
    },
    "grok-4.1-fast": {
      "scores": {
        "structure": { "score": 26, "details": "..." },
        "accuracy": { "score": 43, "details": "..." },
        "fluency": { "score": 19, "fillers": [], "details": "..." }
      },
      "total": 88,
      "feedback": "Acceptable transmission.",
      "cost": 0.00045,
      "latency_ms": 580
    }
  },
  "summary": {
    "totalCost": 0.00435,
    "bestValue": "grok-4.1-fast",
    "highestScore": "gpt-4o"
  }
}
```

### Score Breakdown

| Component | Max Points | Description |
|-----------|------------|-------------|
| `structure` | 30 | Transmission order (receiver > sender > location > intent) |
| `accuracy` | 50 | Word-level accuracy with number equivalence |
| `fluency` | 20 | Filler words and hesitation detection |
| **Total** | **100** | Sum of all components |

---

## Error Responses

### 400 Bad Request

Missing required fields.

```json
{
  "success": false,
  "error": "Missing required fields",
  "message": "Required: transcript, expected, difficulty"
}
```

### 401 Unauthorized

Invalid or missing API key.

```json
{
  "success": false,
  "error": "Invalid API key",
  "message": "X-API-Key header is required"
}
```

### 405 Method Not Allowed

Wrong HTTP method.

```json
{
  "success": false,
  "error": "Method not allowed",
  "message": "Only POST requests are accepted"
}
```

### 500 Internal Server Error

Scoring failed.

```json
{
  "success": false,
  "error": "Scoring failed",
  "message": "Error details here"
}
```

---

## Scoring Rules

### Number Equivalence

The following are treated as equivalent during scoring:

| Number | Word |
|--------|------|
| 1 | one |
| 2 | two |
| 3 | three |
| 4 | four |
| 5 | five |
| 6 | six |
| 7 | seven |
| 8 | eight |
| 9 | nine |
| 10 | ten |

**Example:** `"runway 27"` and `"runway two seven"` are considered equivalent.

### Filler Word Detection

The following filler words reduce the fluency score:

- um, uh, er, ah
- like, you know
- basically, actually (when used as fillers)

### Difficulty Modifiers

| Difficulty | Filler Penalty | Accuracy Threshold |
|------------|----------------|-------------------|
| Easy | 1 pt/filler | 50% WER tolerance |
| Medium | 2 pt/filler | 30% WER tolerance |
| Hard | 3 pt/filler | 15% WER tolerance |

---

## Unity C# Integration

### Complete Client Script

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

[System.Serializable]
public class ScoringRequest
{
    public string transcript;
    public string expected;
    public string difficulty;
}

[System.Serializable]
public class ScoreDetail
{
    public int score;
    public string details;
}

[System.Serializable]
public class FluencyScore
{
    public int score;
    public string[] fillers;
    public string details;
}

[System.Serializable]
public class Scores
{
    public ScoreDetail structure;
    public ScoreDetail accuracy;
    public FluencyScore fluency;
}

[System.Serializable]
public class ModelResult
{
    public Scores scores;
    public int total;
    public string feedback;
    public float cost;
    public int latency_ms;
}

[System.Serializable]
public class ScoringInput
{
    public string transcript;
    public string expected;
    public string difficulty;
}

[System.Serializable]
public class ScoringSummary
{
    public float totalCost;
    public string bestValue;
    public string highestScore;
}

// Note: Unity's JsonUtility cannot deserialize keys with hyphens
// You'll need to use a JSON library like Newtonsoft.Json for proper parsing
// or transform the JSON response on the server side

public class UnityScoringClient : MonoBehaviour
{
    [Header("API Configuration")]
    [SerializeField] private string apiUrl = "https://your-domain.com/api/unity/score";
    [SerializeField] private string apiKey = "your-api-key";

    /// <summary>
    /// Score a radio transmission
    /// </summary>
    /// <param name="transcript">What the user said</param>
    /// <param name="expected">The correct transmission</param>
    /// <param name="difficulty">easy, medium, or hard</param>
    /// <param name="onSuccess">Callback with raw JSON response</param>
    /// <param name="onError">Callback with error message</param>
    public IEnumerator ScoreTransmission(
        string transcript,
        string expected,
        string difficulty,
        System.Action<string> onSuccess,
        System.Action<string> onError)
    {
        var request = new ScoringRequest
        {
            transcript = transcript,
            expected = expected,
            difficulty = difficulty
        };

        string jsonBody = JsonUtility.ToJson(request);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

        using (UnityWebRequest www = new UnityWebRequest(apiUrl, "POST"))
        {
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("X-API-Key", apiKey);

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                onSuccess?.Invoke(www.downloadHandler.text);
            }
            else
            {
                string errorMsg = $"{www.responseCode}: {www.downloadHandler.text}";
                onError?.Invoke(errorMsg);
            }
        }
    }

    // Example usage
    public void TestScoring()
    {
        StartCoroutine(ScoreTransmission(
            "Tower Alpha One ready for departure",
            "Tower, Alpha One, ready for departure runway 27",
            "medium",
            (jsonResponse) => {
                Debug.Log($"Success! Response: {jsonResponse}");
                // Parse JSON and update UI
            },
            (error) => {
                Debug.LogError($"Scoring failed: {error}");
            }
        ));
    }
}
```

### Using Newtonsoft.Json (Recommended)

For proper JSON parsing with hyphenated keys, install **Newtonsoft.Json** via the Unity Package Manager and use:

```csharp
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// In your success callback:
var response = JObject.Parse(jsonResponse);
var gpt4oScore = response["modelResults"]["gpt-4o"]["total"].Value<int>();
var gpt4oMiniScore = response["modelResults"]["gpt-4o-mini"]["total"].Value<int>();
var grokScore = response["modelResults"]["grok-4.1-fast"]["total"].Value<int>();

Debug.Log($"GPT-4o: {gpt4oScore}, Mini: {gpt4oMiniScore}, Grok: {grokScore}");
```

---

## cURL Examples

### Basic Request

```bash
curl -X POST https://your-domain.com/api/unity/score \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "transcript": "Tower Alpha One ready for departure runway two seven",
    "expected": "Tower, Alpha One, ready for departure runway 27",
    "difficulty": "medium"
  }'
```

### With Custom Prompt

```bash
curl -X POST https://your-domain.com/api/unity/score \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "transcript": "Tower Alpha One ready for departure runway two seven",
    "expected": "Tower, Alpha One, ready for departure runway 27",
    "difficulty": "medium",
    "customPrompt": "Score this aviation radio transmission..."
  }'
```

---

## Best Practices

1. **Use the summary.highestScore** field to display the best score to the player
2. **Use the summary.bestValue** field if you want to optimize for cost
3. **Cache API responses** for identical transcript/expected pairs
4. **Handle network errors gracefully** with retry logic
5. **Log the full response** for debugging during development
6. **Use environment variables** for the API key in production builds

---

## Rate Limits

Currently, there are no rate limits enforced. However, each request incurs API costs from the LLM providers:

| Model | Approximate Cost per Request |
|-------|------------------------------|
| GPT-4o | ~$0.003 |
| GPT-4o-mini | ~$0.0008 |
| Grok 4.1 Fast | ~$0.0005 |

**Total per request:** ~$0.004-$0.005

---

## Support

For issues or questions:
1. Check the web dashboard at **STANDALONE SCORING (Unity) > Dashboard** for request logs
2. Use the **Configuration** tab to test manual scoring
3. Review error messages in the **API Docs** tab
