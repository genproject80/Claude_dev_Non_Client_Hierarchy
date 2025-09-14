/**
 * Hex Data Conversion Service
 * Client-side TypeScript implementation of Python decoder logic
 * Converts raw hex data from IoT devices into meaningful parameters
 */

// Type definitions
export interface ConversionStep {
  step: number;
  description: string;
  input: string;
  output: string;
  notes?: string;
}

export interface DecodedData {
  [key: string]: string | number;
}

export interface ConversionResult {
  steps: ConversionStep[];
  decodedData: DecodedData;
  success: boolean;
  error?: string;
  logicType: 'P1' | 'P2' | 'Unknown';
}

// P1 Fault codes mapping (matching Python implementation)
const P1_FAULT_CODES: Record<number, string> = {
  0: "FAULT_HT_VTG_TOO_LOW",
  1: "FAULT_HT_ARC_CNT_SHORT",
  2: "FAULT_HT_I_TOO_LOW",
  3: "FAULT_THERMOSTAT_BROKEN",
  4: "FAULT_GENSET_SIG_LOST",
  5: "FAULT_MOTOR_CURRENT_TOO_LOW",
  6: "FAULT_MOTOR_CURRENT_TOO_HIGH",
  7: "FAULT_SCRAPPING_PENDING",
  8: "FAULT_SOOT_COLLECTION_PENDING",
  9: "FAULT_MOTOR_OUT_OF_PARK",
  10: "FAULT_GSM_SIG_LOST",
  11: "FAULT_INDUCEMENT_REQUESTED",
  12: "FAULT_ES_SIGNAL",
  13: "FAULT_SHAKER_MOTOR_CURRENT_TOO_LOW",
  14: "FAULT_SHAKER_MOTOR_CURRENT_TOO_HIGH",
  15: "FAULT_INVALID_FAULT_REPORTED"
};

// Utility function to convert hex to binary with specified length
function hexToBinary(hexValue: string, length: number = 16): string {
  return parseInt(hexValue, 16).toString(2).padStart(length, '0');
}

/**
 * P1 Logic Decoder - Genvolt fault-related data
 * Processes numeric strings converted to 16-character hex
 */
export function convertP1Logic(hexData: string): ConversionResult {
  const steps: ConversionStep[] = [];
  let stepCounter = 1;

  try {
    // Step 1: Input validation
    steps.push({
      step: stepCounter++,
      description: "Validate input format",
      input: `"${hexData}"`,
      output: hexData.length > 0 ? "Valid numeric string" : "Invalid: empty input",
      notes: "P1 requires numeric string input (digits only)"
    });

    if (!hexData || !hexData.trim()) {
      return {
        steps,
        decodedData: {},
        success: false,
        error: "Empty input data",
        logicType: 'P1'
      };
    }

    // Check if input contains only digits
    if (!/^\d+$/.test(hexData)) {
      steps.push({
        step: stepCounter++,
        description: "Format validation failed",
        input: hexData,
        output: "Invalid format",
        notes: "P1 logic requires numeric string (digits only)"
      });

      return {
        steps,
        decodedData: {},
        success: false,
        error: "Invalid format: P1 logic requires numeric string (digits only)",
        logicType: 'P1'
      };
    }

    // Step 2: Convert to 16-character hex string
    const hexStr = parseInt(hexData).toString(16).toUpperCase().padStart(16, '0');
    steps.push({
      step: stepCounter++,
      description: "Convert to 16-character hex string",
      input: hexData,
      output: hexStr,
      notes: "Format as 16-character hex with leading zeros"
    });

    // Step 3: Extract runtime from last 4 characters
    const runtimeHex = hexStr.slice(-4);
    const runtime = parseInt(runtimeHex, 16);
    steps.push({
      step: stepCounter++,
      description: "Extract runtime from last 4 characters",
      input: `"${runtimeHex}" (hex)`,
      output: `${runtime} minutes`,
      notes: "Direct hex to decimal conversion"
    });

    // Step 4: Extract fault codes from positions -8 to -4
    const faultCodeHex = hexStr.slice(-8, -4);
    const faultCodeBinary = hexToBinary(faultCodeHex, 16);
    const faultPositions = [];
    for (let i = 0; i < faultCodeBinary.length; i++) {
      if (faultCodeBinary[i] === '1') {
        faultPositions.push(15 - i);
      }
    }
    const faultDescriptions = faultPositions.map(pos => P1_FAULT_CODES[pos] || "No Fault");

    steps.push({
      step: stepCounter++,
      description: "Extract and decode fault codes",
      input: `"${faultCodeHex}" → "${faultCodeBinary}" (binary)`,
      output: `Active faults: [${faultPositions.join(', ')}]`,
      notes: "Convert to binary, find bit positions where value = 1"
    });

    steps.push({
      step: stepCounter++,
      description: "Map fault codes to descriptions",
      input: `Fault positions: [${faultPositions.join(', ')}]`,
      output: faultDescriptions.join(', ') || "No active faults",
      notes: "Look up fault descriptions from fault code table"
    });

    // Step 5: Extract leading fault code and time
    const leadingFaultCode = parseInt(hexStr[-10], 16);
    const leadingFaultTime = parseInt(hexStr.slice(-12, -10), 16);
    steps.push({
      step: stepCounter++,
      description: "Extract leading fault information",
      input: `Code: "${hexStr[-10]}", Time: "${hexStr.slice(-12, -10)}"`,
      output: `Leading fault: ${leadingFaultCode}, Duration: ${leadingFaultTime}hr`,
      notes: "Single hex character for code, 2 hex chars for time in hours"
    });

    // Step 6: Extract signal status (positions -14 to -12)
    const signalStatusHex = hexStr.slice(-14, -12);
    const signalStatusBinary = hexToBinary(signalStatusHex, 8);
    const gensetSignal = signalStatusBinary[0] === '1' ? "On" : "Off";
    const thermostatStatus = signalStatusBinary[1] === '1' ? "On" : "Off";
    const hvOutputVoltage = parseInt(signalStatusBinary.slice(2), 2);

    steps.push({
      step: stepCounter++,
      description: "Extract signal status information",
      input: `"${signalStatusHex}" → "${signalStatusBinary}" (binary)`,
      output: `Genset: ${gensetSignal}, Thermostat: ${thermostatStatus}, HV: ${hvOutputVoltage}kV`,
      notes: "Bit 0: Genset Signal, Bit 1: Thermostat, Bits 2-7: HV Output Voltage"
    });

    // Step 7: Extract HV current information (first 2 hex characters)
    const hvCurrentHex = hexStr.slice(0, 2);
    const hvCurrentBinary = hexToBinary(hvCurrentHex, 8);
    const hvSourceNo = parseInt(hvCurrentBinary.slice(0, 2), 2);
    const hvOutputCurrent = parseInt(hvCurrentBinary.slice(-6), 2);

    steps.push({
      step: stepCounter++,
      description: "Extract HV current information",
      input: `"${hvCurrentHex}" → "${hvCurrentBinary}" (binary)`,
      output: `Source: ${hvSourceNo}, Current: ${hvOutputCurrent}mA`,
      notes: "Bits 0-1: HV Source Number, Bits 2-7: HV Output Current"
    });

    // Final decoded data
    const decodedData: DecodedData = {
      "RuntimeMin": runtime,
      "FaultCodes": faultPositions.join(", "),
      "FaultDescriptions": faultDescriptions.join(", "),
      "LeadingFaultCode": leadingFaultCode,
      "LeadingFaultTimeHr": leadingFaultTime,
      "GensetSignal": gensetSignal,
      "ThermostatStatus": thermostatStatus,
      "HVOutputVoltage_kV": hvOutputVoltage,
      "HVSourceNo": hvSourceNo,
      "HVOutputCurrent_mA": hvOutputCurrent
    };

    return {
      steps,
      decodedData,
      success: true,
      logicType: 'P1'
    };

  } catch (error) {
    steps.push({
      step: stepCounter++,
      description: "Conversion failed",
      input: hexData,
      output: "Error occurred",
      notes: `Error: ${error instanceof Error ? error.message : String(error)}`
    });

    return {
      steps,
      decodedData: {},
      success: false,
      error: `Failed to decode P1 hex data: ${error instanceof Error ? error.message : String(error)}`,
      logicType: 'P1'
    };
  }
}

/**
 * P2 Logic Decoder - SICK sensor operational data
 * Processes 64-character hex strings using XOR decryption
 */
export function convertP2Logic(hexData: string): ConversionResult {
  const steps: ConversionStep[] = [];
  let stepCounter = 1;
  const XOR_KEY = "7AC5B2E1";

  try {
    // Step 1: Input validation
    steps.push({
      step: stepCounter++,
      description: "Validate input format",
      input: `"${hexData}" (${hexData.length} chars)`,
      output: hexData.length === 64 ? "Valid 64-character hex string" : `Invalid: ${hexData.length} characters`,
      notes: "P2 requires exactly 64-character hex string"
    });

    if (!hexData || hexData.length !== 64) {
      return {
        steps,
        decodedData: {},
        success: false,
        error: `Invalid length: P2 logic requires exactly 64-character hex string, got ${hexData.length}`,
        logicType: 'P2'
      };
    }

    // Step 2: XOR Key setup
    const xorKeyInt = parseInt(XOR_KEY, 16);
    steps.push({
      step: stepCounter++,
      description: "Setup XOR decryption key",
      input: `Key: "${XOR_KEY}"`,
      output: `Key integer: ${xorKeyInt}`,
      notes: "Standard decryption key for P2 devices"
    });

    // Step 3: Split into 8 chunks of 8 characters
    const chunks = [];
    for (let i = 0; i < 64; i += 8) {
      chunks.push(hexData.slice(i, i + 8));
    }
    steps.push({
      step: stepCounter++,
      description: "Split 64-character hex into 8 chunks",
      input: `64-char string`,
      output: `8 chunks: [${chunks.join(', ')}]`,
      notes: "Each chunk represents different data categories"
    });

    // Step 4: XOR decrypt each chunk
    const decryptedChunks = [];
    for (const chunk of chunks) {
      const chunkInt = parseInt(chunk, 16);
      const decryptedInt = (chunkInt ^ xorKeyInt) >>> 0; // Unsigned 32-bit operation
      const decryptedHex = decryptedInt.toString(16).toUpperCase().padStart(8, '0');
      decryptedChunks.push(decryptedHex);
    }
    steps.push({
      step: stepCounter++,
      description: "XOR decrypt each chunk",
      input: `Encrypted chunks with key ${XOR_KEY}`,
      output: `Decrypted: [${decryptedChunks.join(', ')}]`,
      notes: "Apply XOR operation to each 8-character chunk"
    });

    // Step 5: Process Chunk 1 for Device ID (optional)
    const chunk1 = decryptedChunks[0];
    const seriesHex = chunk1.slice(0, 4);
    const serialHex = chunk1.slice(4);
    let seriesAscii = "";
    try {
      // Convert hex to ASCII
      seriesAscii = seriesHex.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || "";
      seriesAscii = seriesAscii.replace(/\0/g, ''); // Remove null characters
    } catch (e) {
      seriesAscii = "";
    }
    const serialDecimal = parseInt(serialHex, 16);
    const deviceIdExtracted = seriesAscii + serialDecimal.toString().padStart(5, '0');

    steps.push({
      step: stepCounter++,
      description: "Extract Device ID from Chunk 1",
      input: `Series: "${seriesHex}", Serial: "${serialHex}"`,
      output: `Device ID: "${deviceIdExtracted}"`,
      notes: "Series (4 hex → ASCII) + Serial (4 hex → 5-digit decimal)"
    });

    // Step 6: Process Chunk 2 for operational values
    const chunk2 = decryptedChunks[1];
    let gsmSignalStrength = parseInt(chunk2.slice(0, 2), 16);
    if (gsmSignalStrength > 6) {
      gsmSignalStrength = gsmSignalStrength - 128; // Handle overflow adjustment
    }
    const motorOnTimeSec = parseInt(chunk2.slice(2, 4), 16);
    const motorOffTimeSec = parseInt(chunk2.slice(4, 6), 16);
    const wheelsConfigured = parseInt(chunk2.slice(6, 8), 16);

    steps.push({
      step: stepCounter++,
      description: "Extract operational values from Chunk 2",
      input: `"${chunk2}" split into 2-char segments`,
      output: `GSM: ${gsmSignalStrength}, Motor ON: ${motorOnTimeSec}s, Motor OFF: ${motorOffTimeSec}s, Wheels: ${wheelsConfigured}`,
      notes: "GSM signal (with overflow check), motor timings, wheel count"
    });

    // Step 7: Process Chunk 3 for coordinate integers
    const chunk3 = decryptedChunks[2];
    const latitudeInteger = parseInt(chunk3.slice(0, 4), 16);
    const longitudeInteger = parseInt(chunk3.slice(4), 16);

    steps.push({
      step: stepCounter++,
      description: "Extract coordinate integer parts from Chunk 3",
      input: `"${chunk3}" → Lat: "${chunk3.slice(0, 4)}", Lng: "${chunk3.slice(4)}"`,
      output: `Latitude int: ${latitudeInteger}, Longitude int: ${longitudeInteger}`,
      notes: "Integer parts of GPS coordinates"
    });

    // Step 8: Process Chunks 4 & 5 for coordinate decimals
    const latitudeDecimal = parseInt(decryptedChunks[3], 16);
    const longitudeDecimal = parseInt(decryptedChunks[4], 16);
    const latitude = parseFloat(`${latitudeInteger}.${latitudeDecimal}`);
    const longitude = parseFloat(`${longitudeInteger}.${longitudeDecimal}`);

    steps.push({
      step: stepCounter++,
      description: "Extract coordinate decimal parts and combine",
      input: `Chunk 4: "${decryptedChunks[3]}" (lat decimal), Chunk 5: "${decryptedChunks[4]}" (lng decimal)`,
      output: `Final coordinates: ${latitude}, ${longitude}`,
      notes: "Combine integer.decimal format for final GPS coordinates"
    });

    // Step 9: Process Chunk 6 for detection and current values
    const chunk6 = decryptedChunks[5];
    const wheelsDetected = parseInt(chunk6.slice(0, 2), 16);
    const faultCode = parseInt(chunk6.slice(2, 4), 16);
    // Byte swapping for motor current
    const motorCurrentSwapped = chunk6.slice(6, 8) + chunk6.slice(4, 6);
    const motorCurrentMA = parseInt(motorCurrentSwapped, 16);

    steps.push({
      step: stepCounter++,
      description: "Extract detection and current values from Chunk 6",
      input: `"${chunk6}" with byte swapping for current`,
      output: `Wheels detected: ${wheelsDetected}, Fault: ${faultCode}, Current: ${motorCurrentMA}mA`,
      notes: "Wheels detected, fault code, motor current with byte swapping"
    });

    // Final decoded data
    const decodedData: DecodedData = {
      "device_id_extracted": deviceIdExtracted,
      "GSM_Signal_Strength": gsmSignalStrength,
      "Motor_ON_Time_sec": motorOnTimeSec,
      "Motor_OFF_Time_sec": motorOffTimeSec,
      "Number_of_Wheels_Configured": wheelsConfigured,
      "Latitude": latitude,
      "Longitude": longitude,
      "Number_of_Wheels_Detected": wheelsDetected,
      "Fault_Code": faultCode,
      "Motor_Current_mA": motorCurrentMA
    };

    return {
      steps,
      decodedData,
      success: true,
      logicType: 'P2'
    };

  } catch (error) {
    steps.push({
      step: stepCounter++,
      description: "Conversion failed",
      input: hexData,
      output: "Error occurred",
      notes: `Error: ${error instanceof Error ? error.message : String(error)}`
    });

    return {
      steps,
      decodedData: {},
      success: false,
      error: `Failed to decode P2 hex data: ${error instanceof Error ? error.message : String(error)}`,
      logicType: 'P2'
    };
  }
}

/**
 * Main hex conversion router function
 * Determines device type and applies appropriate decoder
 */
export function convertHexData(hexData: string, logicId: number): ConversionResult {
  if (!hexData || !hexData.trim()) {
    return {
      steps: [],
      decodedData: {},
      success: false,
      error: "No hex data provided",
      logicType: 'Unknown'
    };
  }

  switch (logicId) {
    case 1:
      return convertP1Logic(hexData);
    case 2:
      return convertP2Logic(hexData);
    default:
      return {
        steps: [{
          step: 1,
          description: "Unknown conversion logic",
          input: `Logic ID: ${logicId}`,
          output: "No decoder available",
          notes: "Supported logic IDs: 1 (P1 Fault Data), 2 (P2 SICK Sensor Data)"
        }],
        decodedData: {},
        success: false,
        error: `Unknown conversion logic ID: ${logicId}. Supported values: 1 (P1), 2 (P2)`,
        logicType: 'Unknown'
      };
  }
}

/**
 * Utility function to detect device type from device ID patterns
 */
export function detectLogicIdFromDeviceId(deviceId: string): number {
  if (!deviceId) return 0;

  // P1 device patterns
  if (/^(P\d+|Q\d+|genvolt-.*)$/i.test(deviceId)) {
    return 1;
  }

  // P2 device patterns
  if (/^(HK\d+|sick-.*|test-sensor-.*)$/i.test(deviceId)) {
    return 2;
  }

  return 0; // Unknown
}