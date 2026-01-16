/**
 * Scenario Data Transformation Script
 *
 * Transforms scenario data from flat transmission array format
 * to tree-based ScenarioTreeNode structure.
 *
 * Usage: npx ts-node src/scripts/transformScenarios.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Type Definitions
// ============================================================================

interface SourceTransmission {
  from: string;
  to: string | string[];
  message: string;
  message_raw: string;
}

interface SourceScenario {
  scenario_id: string;
  title: string;
  objectives: string[];
  transmissions: SourceTransmission[];
}

interface SourceSeries {
  series_id: string;
  scenarios: SourceScenario[];
}

interface SourceData {
  training: {
    series: SourceSeries[];
  };
}

// New tree-based structure
interface ScenarioTreeNode {
  scenarioId: number;
  id: number;
  message: string;
  source: 'ATC' | 'P';
  source_callsign: string;
  source_n: number;
  destination: 'ATC' | 'P' | null;
  destination_callsign: string | null;
  destination_n: number | null;
  next_pos: number | null;
  next_neg: number | null;
}

interface TransformedScenario {
  id: number;
  scenario_id: string;
  series_id: string;
  title: string;
  description: string;
  objectives: string[];
  start_node: number;
  nodes: ScenarioTreeNode[];
}

interface TransformedData {
  version: string;
  generated: string;
  scenarios: TransformedScenario[];
}

// ============================================================================
// Callsign Mapping Functions
// ============================================================================

/**
 * Extract source type from callsign
 * SHEPHARD = ATC (controller)
 * All others = P (player/other roles)
 */
function getSourceType(callsign: string): 'ATC' | 'P' {
  return callsign.toUpperCase() === 'SHEPHARD' ? 'ATC' : 'P';
}

/**
 * Extract instance number from callsign
 * Examples:
 *   "SHEPHARD" -> 0
 *   "REDCROSS 1" -> 1
 *   "STALKER 2" -> 2
 *   "TENDER 1" -> 1
 */
function extractInstanceNumber(callsign: string): number {
  if (callsign.toUpperCase() === 'SHEPHARD') {
    return 0;
  }

  // Match pattern: "CALLSIGN N" where N is a number
  const match = callsign.match(/\s+(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Default to 1 if no number found (single instance)
  return 1;
}

/**
 * Get destination type from "to" field
 * Handles both single destination and broadcast (array)
 */
function getDestinationType(to: string | string[]): 'ATC' | 'P' | null {
  // Broadcast: destination is null
  if (Array.isArray(to)) {
    return null;
  }

  return getSourceType(to);
}

/**
 * Get destination callsign
 */
function getDestinationCallsign(to: string | string[]): string | null {
  if (Array.isArray(to)) {
    return null; // Broadcast
  }
  return to;
}

/**
 * Get destination instance number
 */
function getDestinationNumber(to: string | string[]): number | null {
  if (Array.isArray(to)) {
    return null; // Broadcast
  }
  return extractInstanceNumber(to);
}

// ============================================================================
// Transformation Logic
// ============================================================================

/**
 * Transform a single transmission to a ScenarioTreeNode
 */
function transformTransmission(
  transmission: SourceTransmission,
  scenarioId: number,
  nodeId: number,
  nextNodeId: number | null
): ScenarioTreeNode {
  return {
    scenarioId,
    id: nodeId,
    message: transmission.message,
    source: getSourceType(transmission.from),
    source_callsign: transmission.from,
    source_n: extractInstanceNumber(transmission.from),
    destination: getDestinationType(transmission.to),
    destination_callsign: getDestinationCallsign(transmission.to),
    destination_n: getDestinationNumber(transmission.to),
    next_pos: nextNodeId,
    next_neg: null, // Linear path - no branching in initial implementation
  };
}

/**
 * Transform a scenario from flat transmissions to tree structure
 */
function transformScenario(
  scenario: SourceScenario,
  seriesId: string,
  scenarioIndex: number
): TransformedScenario {
  const nodes: ScenarioTreeNode[] = [];

  scenario.transmissions.forEach((transmission, index) => {
    const nodeId = index + 1; // 1-based node IDs
    const isLast = index === scenario.transmissions.length - 1;
    const nextNodeId = isLast ? null : nodeId + 1;

    nodes.push(transformTransmission(
      transmission,
      scenarioIndex,
      nodeId,
      nextNodeId
    ));
  });

  // Generate description from objectives
  const description = scenario.objectives.length > 0
    ? scenario.objectives[0]
    : `Training scenario: ${scenario.title}`;

  return {
    id: scenarioIndex,
    scenario_id: scenario.scenario_id,
    series_id: seriesId.toUpperCase(),
    title: scenario.title,
    description,
    objectives: scenario.objectives,
    start_node: 1, // Always start at node 1
    nodes,
  };
}

/**
 * Transform all source data to new format
 */
function transformAllScenarios(sourceData: SourceData): TransformedData {
  const scenarios: TransformedScenario[] = [];
  let scenarioIndex = 1; // 1-based scenario IDs

  for (const series of sourceData.training.series) {
    for (const scenario of series.scenarios) {
      scenarios.push(transformScenario(scenario, series.series_id, scenarioIndex));
      scenarioIndex++;
    }
  }

  return {
    version: '2.0.0',
    generated: new Date().toISOString(),
    scenarios,
  };
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  const projectRoot = path.resolve(__dirname, '../../..');
  const sourcePath = path.join(projectRoot, 'docs/radstrat_training_pack_aligned_v2.json');
  const outputPath = path.join(projectRoot, 'server/src/data/scenarios_v2.json');

  console.log('RADStrat Scenario Data Transformation');
  console.log('=====================================');
  console.log(`Source: ${sourcePath}`);
  console.log(`Output: ${outputPath}`);
  console.log('');

  // Read source data
  console.log('Reading source data...');
  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const sourceData: SourceData = JSON.parse(sourceContent);

  // Count source statistics
  let totalTransmissions = 0;
  let totalScenarios = 0;
  for (const series of sourceData.training.series) {
    totalScenarios += series.scenarios.length;
    for (const scenario of series.scenarios) {
      totalTransmissions += scenario.transmissions.length;
    }
  }
  console.log(`Found ${sourceData.training.series.length} series`);
  console.log(`Found ${totalScenarios} scenarios`);
  console.log(`Found ${totalTransmissions} transmissions`);
  console.log('');

  // Transform data
  console.log('Transforming data...');
  const transformedData = transformAllScenarios(sourceData);

  // Count output statistics
  let totalNodes = 0;
  for (const scenario of transformedData.scenarios) {
    totalNodes += scenario.nodes.length;
  }
  console.log(`Generated ${transformedData.scenarios.length} scenarios`);
  console.log(`Generated ${totalNodes} nodes`);
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Write output
  console.log('Writing output...');
  const outputContent = JSON.stringify(transformedData, null, 2);
  fs.writeFileSync(outputPath, outputContent, 'utf-8');
  console.log(`Output written to: ${outputPath}`);
  console.log('');

  // Summary
  console.log('Transformation complete!');
  console.log(`File size: ${(outputContent.length / 1024).toFixed(2)} KB`);

  // Print sample node for verification
  if (transformedData.scenarios.length > 0 && transformedData.scenarios[0].nodes.length > 0) {
    console.log('');
    console.log('Sample node (first scenario, first node):');
    console.log(JSON.stringify(transformedData.scenarios[0].nodes[0], null, 2));
  }
}

// Run if executed directly
main();
