// display.js
const HEADER = '\x02';
const FOOTER = '\x03';

let port;
let writer;

/**
 * Convert single hex char to 4-bit number
 */
function chrToHexTo4bit(char) {
  return parseInt(char, 16);
}

/**
 * Decode two hex characters to one byte
 */
function decode2BytesToNumber(one, two) {
  return (chrToHexTo4bit(one) << 4) | chrToHexTo4bit(two);
}

/**
 * Encode number to two hex characters
 */
function encodeNumberTo2Bytes(number) {
  const high = (number >> 4) & 0x0f;
  const low = number & 0x0f;
  return [high.toString(16).toUpperCase(), low.toString(16).toUpperCase()];
}

/**
 * Calculate checksum over header + data
 */
function calculateChecksum(data, header) {
  let sum = HEADER.charCodeAt(0);
  for (const h of header) sum += h.charCodeAt(0);
  for (const d of data) sum += d.charCodeAt(0);
  sum += 1;
  sum &= 0xff;
  sum ^= 0xff;
  sum += 1;
  sum &= 0xff;
  return sum;
}

/**
 * Encode matrix to ASCII string for FlipDot
 * matrixHashDash: string with '#' = on, '-' = off, newline-separated rows
 */
function encode(matrixHashDash, address = 1) {
  const matrix = matrixHashDash.trim().split('\n');
  const rows = matrix.length;
  const columns = matrix[0].length;

  const constant = 1;
  const header = [String(constant), String(address)];

  // Data bytes as hex characters
  const data = [];
  for (let col = 0; col < columns; col++) {
    const column = matrix.map(row => row[col]).join('').replace(/[- ]/g, '0').replace(/#/g, '1');
    const reversed = column.split('').reverse().join('');
    const nibbles = [
      reversed.slice(8, 12),
      reversed.slice(12, 16),
      reversed.slice(0, 4),
      reversed.slice(4, 8)
    ];
    for (const nib of nibbles) {
      data.push(parseInt(nib, 2).toString(16).toUpperCase());
    }
  }

  // checksum
  const checksum = calculateChecksum(data, header);
  const footerBytes = encodeNumberTo2Bytes(checksum);

  // Build final string
  return HEADER + header.join('') + data.join('') + FOOTER + footerBytes.join('');
}

/**
 * Open Web Serial port
 */
async function openPort(selectedPort) {
  if (!selectedPort) throw new Error("No port selected");
  port = selectedPort;
  await port.open({ baudRate: 4800 });
  writer = port.writable.getWriter();
}

/**
 * Write ASCII string to port
 */
async function writeIt(str) {
  if (!writer) throw new Error("Port not open");
  const encoded = new TextEncoder().encode(str); // Uint8Array of ASCII codes
  await writer.write(encoded);
}

/**
 * Display matrix on FlipDot
 * matrix: array of arrays of 0/1
 */
async function displayMain(matrix, address = 1) {
  if (!writer) throw new Error("Port not open");
  const matrixStr = matrix.map(row => row.map(cell => (cell ? '#' : '-')).join('')).join('\n');
  const encodedString = encode(matrixStr, address);
  await writeIt(encodedString);
}

export { displayMain, openPort, writeIt, encode };
