/**
 * API Documentation Sub-Tab
 *
 * Displays Unity API endpoint documentation with:
 * - Endpoint details
 * - Request/Response examples
 * - Error codes
 * - Unity C# code snippet
 */

import { useState } from 'react';
import { useUnityConfig } from '../../../stores/unityScoringStore';

export function ApiDocsSubTab() {
  const config = useUnityConfig();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      alert('Failed to copy. Please copy manually.');
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const requestExample = `{
  "transcript": "Tower Alpha One ready for departure runway two seven",
  "expected": "Tower, Alpha One, ready for departure runway 27",
  "difficulty": "medium"
}`;

  const responseExample = `{
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
        "structure": { "score": 28, "details": "Correct order: receiver, sender, intent" },
        "accuracy": { "score": 45, "details": "Minor omission of comma after Tower" },
        "fluency": { "score": 20, "fillers": [], "details": "No hesitation detected" }
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
}`;

  const curlExample = `curl -X POST ${baseUrl}/api/unity/score \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${config.apiKey}" \\
  -d '${requestExample}'`;

  const unityExample = `using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

[System.Serializable]
public class ScoringRequest
{
    public string transcript;
    public string expected;
    public string difficulty; // "easy", "medium", or "hard"
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
public class ModelResults
{
    [SerializeField] private ModelResult gpt_4o;
    [SerializeField] private ModelResult gpt_4o_mini;
    [SerializeField] private ModelResult grok_4_1_fast;

    // Unity can't deserialize keys with hyphens directly
    // Use a custom deserializer or rename in JSON
}

[System.Serializable]
public class ScoringResponse
{
    public bool success;
    public string timestamp;
    public ModelResults modelResults;
}

public class UnityScoringClient : MonoBehaviour
{
    private const string API_URL = "${baseUrl}/api/unity/score";
    private const string API_KEY = "${config.apiKey}";

    public IEnumerator ScoreTransmission(
        string transcript,
        string expected,
        string difficulty,
        System.Action<ScoringResponse> onSuccess,
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

        using (UnityWebRequest www = new UnityWebRequest(API_URL, "POST"))
        {
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("X-API-Key", API_KEY);

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<ScoringResponse>(
                    www.downloadHandler.text
                );
                onSuccess?.Invoke(response);
            }
            else
            {
                onError?.Invoke(www.error + ": " + www.downloadHandler.text);
            }
        }
    }

    // Example usage:
    public void TestScoring()
    {
        StartCoroutine(ScoreTransmission(
            "Tower Alpha One ready for departure",
            "Tower, Alpha One, ready for departure runway 27",
            "medium",
            (response) => {
                Debug.Log($"Score: {response.success}");
                // Access model results and display in UI
            },
            (error) => {
                Debug.LogError($"Scoring failed: {error}");
            }
        ));
    }
}`;

  return (
    <div className="api-docs-subtab">
      {/* Endpoint Overview */}
      <section className="doc-section mb-lg">
        <h3>Endpoint Overview</h3>
        <div className="endpoint-box">
          <span className="method">POST</span>
          <code className="url">{baseUrl}/api/unity/score</code>
        </div>
        <p className="text-muted mt-md">
          Scores a radio transmission against the expected answer using all 3 models
          (GPT-4o, GPT-4o-mini, Grok 4.1 Fast) in parallel.
        </p>
      </section>

      {/* Authentication */}
      <section className="doc-section mb-lg">
        <h3>Authentication</h3>
        <p className="text-muted mb-md">
          Include your API key in the <code>X-API-Key</code> header.
        </p>
        <div className="code-block">
          <div className="code-header">
            <span>Headers</span>
          </div>
          <pre>{`Content-Type: application/json
X-API-Key: ${config.apiKey}`}</pre>
        </div>
      </section>

      {/* Request Body */}
      <section className="doc-section mb-lg">
        <h3>Request Body</h3>
        <table className="param-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>transcript</code></td>
              <td>string</td>
              <td>Yes</td>
              <td>What the user actually said</td>
            </tr>
            <tr>
              <td><code>expected</code></td>
              <td>string</td>
              <td>Yes</td>
              <td>The correct/expected transmission</td>
            </tr>
            <tr>
              <td><code>difficulty</code></td>
              <td>string</td>
              <td>Yes</td>
              <td>"easy" | "medium" | "hard"</td>
            </tr>
            <tr>
              <td><code>customPrompt</code></td>
              <td>string</td>
              <td>No</td>
              <td>Override the default scoring prompt</td>
            </tr>
          </tbody>
        </table>

        <div className="code-block mt-md">
          <div className="code-header">
            <span>Example Request</span>
            <button
              className="btn btn-sm"
              onClick={() => copyToClipboard(requestExample, 'request')}
            >
              {copiedSection === 'request' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre>{requestExample}</pre>
        </div>
      </section>

      {/* Response */}
      <section className="doc-section mb-lg">
        <h3>Response</h3>
        <p className="text-muted mb-md">
          Returns scoring results from all 3 models with individual scores, costs, and latencies.
        </p>

        <h4 className="mt-md mb-sm">Score Breakdown</h4>
        <table className="param-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Max Score</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>structure</code></td>
              <td>30</td>
              <td>Transmission order (receiver → sender → location → intent)</td>
            </tr>
            <tr>
              <td><code>accuracy</code></td>
              <td>50</td>
              <td>Word-level accuracy with number equivalence</td>
            </tr>
            <tr>
              <td><code>fluency</code></td>
              <td>20</td>
              <td>Filler words and hesitation detection</td>
            </tr>
          </tbody>
        </table>

        <div className="code-block mt-md">
          <div className="code-header">
            <span>Example Response</span>
            <button
              className="btn btn-sm"
              onClick={() => copyToClipboard(responseExample, 'response')}
            >
              {copiedSection === 'response' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="response-pre">{responseExample}</pre>
        </div>
      </section>

      {/* Error Codes */}
      <section className="doc-section mb-lg">
        <h3>Error Codes</h3>
        <table className="param-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Error</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>400</td>
              <td><code>Missing required fields</code></td>
              <td>transcript, expected, or difficulty not provided</td>
            </tr>
            <tr>
              <td>401</td>
              <td><code>Invalid API key</code></td>
              <td>X-API-Key header missing or incorrect</td>
            </tr>
            <tr>
              <td>405</td>
              <td><code>Method not allowed</code></td>
              <td>Only POST requests are accepted</td>
            </tr>
            <tr>
              <td>500</td>
              <td><code>Scoring failed</code></td>
              <td>Internal error during LLM scoring</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* cURL Example */}
      <section className="doc-section mb-lg">
        <h3>cURL Example</h3>
        <div className="code-block">
          <div className="code-header">
            <span>Terminal</span>
            <button
              className="btn btn-sm"
              onClick={() => copyToClipboard(curlExample, 'curl')}
            >
              {copiedSection === 'curl' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre>{curlExample}</pre>
        </div>
      </section>

      {/* Unity C# Example */}
      <section className="doc-section mb-lg">
        <h3>Unity C# Integration</h3>
        <p className="text-muted mb-md">
          Complete Unity client script for scoring transmissions.
        </p>
        <div className="code-block">
          <div className="code-header">
            <span>UnityScoringClient.cs</span>
            <button
              className="btn btn-sm"
              onClick={() => copyToClipboard(unityExample, 'unity')}
            >
              {copiedSection === 'unity' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="unity-pre">{unityExample}</pre>
        </div>
      </section>

      {/* Notes */}
      <section className="doc-section">
        <h3>Notes</h3>
        <ul className="notes-list">
          <li>
            <strong>Number Equivalence:</strong> "1" and "one", "2" and "two", etc. are treated as equivalent
          </li>
          <li>
            <strong>Filler Detection:</strong> Words like "um", "uh", "er", "ah", "like", "you know" reduce fluency score
          </li>
          <li>
            <strong>Difficulty Modifiers:</strong>
            <ul>
              <li>Easy: 1 pt penalty per filler</li>
              <li>Medium: 2 pt penalty per filler</li>
              <li>Hard: 3 pt penalty per filler</li>
            </ul>
          </li>
          <li>
            <strong>All Models:</strong> Every request runs through all 3 models in parallel for comparison
          </li>
          <li>
            <strong>Custom Prompt:</strong> Override the default scoring prompt via the Configuration tab or request body
          </li>
        </ul>
      </section>

      {/* Styles */}
      <style>{`
        .api-docs-subtab {
          max-width: 900px;
        }

        .doc-section {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
        }

        .doc-section h3 {
          margin: 0 0 0.75rem 0;
          color: var(--accent-gold, #d4af37);
        }

        .doc-section h4 {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-color, #fff);
        }

        .endpoint-box {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
        }

        .method {
          padding: 0.25rem 0.5rem;
          background: #4ade80;
          color: #000;
          font-weight: bold;
          font-size: 0.75rem;
          border-radius: 3px;
        }

        .url {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .code-block {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          overflow: hidden;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid var(--border-color, #333);
          font-size: 0.8rem;
          color: var(--text-muted, #888);
        }

        .code-block pre {
          margin: 0;
          padding: 1rem;
          font-family: monospace;
          font-size: 0.8rem;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre;
        }

        .response-pre {
          max-height: 400px;
          overflow-y: auto;
        }

        .unity-pre {
          max-height: 500px;
          overflow-y: auto;
        }

        .param-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .param-table th,
        .param-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #333);
        }

        .param-table th {
          font-weight: 600;
          color: var(--text-muted, #888);
          background: rgba(0, 0, 0, 0.2);
        }

        .param-table code {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.8rem;
        }

        .notes-list {
          margin: 0;
          padding-left: 1.25rem;
        }

        .notes-list li {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .notes-list ul {
          margin-top: 0.5rem;
          padding-left: 1.25rem;
        }

        .notes-list ul li {
          margin-bottom: 0.25rem;
        }

        code {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .mt-sm { margin-top: 0.5rem; }
        .mt-md { margin-top: 1rem; }
        .mb-sm { margin-bottom: 0.5rem; }
        .mb-md { margin-bottom: 1rem; }
        .mb-lg { margin-bottom: 1.5rem; }
      `}</style>
    </div>
  );
}
