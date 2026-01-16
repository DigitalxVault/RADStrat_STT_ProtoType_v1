```json
{
  "schema": "rt_transcript_template_v1",
  "version": "1.0",
  "ruleset": {
    "eventTypes": ["PERIODIC", "EMERGENCY"],
    "noClosingPhrases": {
      "enabled": true,
      "disallowedTokens": [
        "roger",
        "copy",
        "copied",
        "over",
        "out",
        "wilco"
      ],
      "replacementStrategy": {
        "standaloneAck": "Replace with action/readback/status line (e.g., holding, crossing, vacated, on-scene, complete).",
        "endOfTransmission": "Remove closing word; keep message complete with intent + readback + report promise if needed."
      }
    },
    "formatting": {
      "callsignsCase": "UPPERCASE",
      "locationsCase": "UPPERCASE",
      "numbersStyle": "RT_HYPHENATED",
      "numbersExamples": ["TWO-ZERO", "ZERO-TWO", "one-five", "three-zero"],
      "oneTransmissionPerLine": true,
      "keepTransmissionsShort": true,
      "minSpeakingRolesRecommended": 3
    },
    "structureCompliance": {
      "requiredOrder": [
        "receiver_callsign",
        "sender_callsign",
        "location",
        "intent_instruction_request",
        "constraints_optional",
        "readback_acknowledgement",
        "report_promise_optional"
      ],
      "acknowledgementPolicy": "Acknowledge via readback/action/status; do not use filler acknowledgements."
    },
    "scenarioEndConditions": {
      "allowedEndStates": [
        "VACATED",
        "ARRIVED",
        "ON_SCENE",
        "COMPLETE",
        "CLEAR_OF_MANOEUVRING_AREA",
        "RESTRICTION_LIFTED",
        "CASUALTY_HANDED_OVER",
        "STANDING_BY_FOR_INSTRUCTION"
      ],
      "endRule": "Scenario ends immediately after the end-state report OR after final instruction is read back and actioned."
    }
  },
  "template": {
    "packHeader": {
      "packTitle": "Periodic Events — <Name>",
      "eventType": "PERIODIC",
      "primaryController": {
        "callsign": "<CALLSIGN>",
        "role": "<ROLE_NAME>"
      },
      "rolesIncluded": ["<ROLE_1>", "<ROLE_2>", "<ROLE_3>"],
      "totalScenarios": "<INTEGER>",
      "notes": "<OPTIONAL_TEXT>"
    },
    "roleGroups": [
      {
        "roleGroupName": "<ROLE_GROUP_NAME>",
        "scenarioCount": "<INTEGER>",
        "scenarios": [
          {
            "scenarioId": 1,
            "scenarioTitle": "<Short scenario name>",
            "participants": [
              {
                "callsign": "<CALLSIGN>",
                "role": "<ROLE_NAME>",
                "type": "PRIMARY"
              },
              {
                "callsign": "<CALLSIGN>",
                "role": "<ROLE_NAME>",
                "type": "SUPPORT"
              }
            ],
            "metadata": {
              "trigger": "<What started the event>",
              "startLocation": "<START_LOCATION>",
              "rolesInvolved": ["<CALLSIGN_1>", "<CALLSIGN_2>", "<CALLSIGN_3>"],
              "objectiveEndState": "<END_STATE_DESCRIPTION>",
              "restrictions": [
                "<e.g., hold short Taxiway CHARLIE>",
                "<e.g., max speed two-zero>",
                "<e.g., shoulder only>"
              ]
            },
            "transmissions": [
              {
                "seq": 1,
                "receiver": "<RECEIVER_CALLSIGN>",
                "sender": "<SENDER_CALLSIGN>",
                "location": "<LOCATION>",
                "message": "<Intent/Request/Info>",
                "constraints": ["<OPTIONAL_CONSTRAINT_1>", "<OPTIONAL_CONSTRAINT_2>"],
                "readbackOrAck": "<Readback/status acknowledgement without roger/copy/over>",
                "reportPromise": "<OPTIONAL: will report holding/vacated/on-scene/complete>",
                "tags": [
                  "REQUEST",
                  "CLEARANCE",
                  "HOLD_SHORT",
                  "CROSSING",
                  "STATUS_REPORT",
                  "RESTRICTION"
                ]
              }
            ],
            "endState": {
              "state": "VACATED",
              "finalReportLine": "<End-state status line only; no roger/copy/over>"
            }
          }
        ]
      }
    ]
  },
  "validation": {
    "requiredFields": [
      "template.packHeader.packTitle",
      "template.packHeader.eventType",
      "template.packHeader.primaryController.callsign",
      "template.roleGroups[].roleGroupName",
      "template.roleGroups[].scenarios[].scenarioId",
      "template.roleGroups[].scenarios[].scenarioTitle",
      "template.roleGroups[].scenarios[].transmissions[].receiver",
      "template.roleGroups[].scenarios[].transmissions[].sender",
      "template.roleGroups[].scenarios[].transmissions[].message"
    ],
    "disallowedStandaloneAckLines": true,
    "disallowedTokensCheckAppliesTo": [
      "transmissions[].message",
      "transmissions[].readbackOrAck",
      "transmissions[].reportPromise",
      "endState.finalReportLine"
    ]
  }
}
```
