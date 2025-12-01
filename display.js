const HEADER = 0x02;
const FOOTER = 0x03;

let port;
let writer;

/**
 * Converts 1 hex character to 4-bit number
 */
function chrToHexTo4bit(character) {
  return parseInt(character, 16);
}

/**
 * Decode two hex characters to 1 byte
 */
function decode2BytesToNumber(one, two) {
  return (chrToHexTo4bit(one) << 4) | chrToHexTo4bit(two);
}

/**
 * Encode number to 2 hex characters
 */
function encodeNumberTo2Bytes(number) {
  const high = (number >> 4) & 0x0f;
  const low = number & 0x0f;
  return [high, low];
}

/**
 * Calculate checksum
 */
function calculateChecksum(data, header) {
  let sum = HEADER;
  for (const h of header) sum += h;
  for (const d of data) sum += d;
  sum += 1;
  sum &= 0xff;
  sum ^= 0xff;
  sum += 1;
  sum &= 0xff;
  return sum;
}

/**
 * Encode matrix (array of strings with '#' and '-') into Uint8Array
 */
function encode(matrixHashDash, address = 1) {
  const matrix = matrixHashDash.trim().split('\n');
  const rows = matrix.length;
  const columns = matrix[0].length;

  const constant = 1;
  const header = [constant, address];
  const dataSize = (rows * columns) / 8;
  header.push(...encodeNumberTo2Bytes(dataSize));

  const dataBytes = [];

  for (let col = 0; col < columns; col++) {
    const column = matrix.map(row => row[col]).join('').replace(/[- ]/g, '0').replace(/#/g, '1');
    const reversed = column.split('').reverse().join('');
    const nibbles = [
      reversed.slice(8, 12),
      reversed.slice(12, 16),
      reversed.slice(0, 4),
      reversed.slice(4, 8),
    ];
    for (const nib of nibbles) {
      dataBytes.push(parseInt(nib, 2));
    }
  }

  const checksumData = [];
  for (let i = 0; i < dataBytes.length; i += 2) {
    checksumData.push((dataBytes[i] << 4) | dataBytes[i + 1]);
  }

  const footer = calculateChecksum(checksumData, header);
  const finalBytes = [HEADER, ...header, ...checksumData, FOOTER, footer];

  return new Uint8Array(finalBytes);
}


// Open selected port
async function openPort(selectedPort) {
  if (!selectedPort) throw new Error("No port selected");
  port = selectedPort;
  await port.open({ baudRate: 4800 });
  writer = port.writable.getWriter();
}

// Write to port
async function writeIt(bytes) {
  if (!writer) throw new Error("Port not open");
  console.log(bytes)
  await writer.write(bytes);
}

// Display matrix
async function displayMain(matrix, address = 1) {
  if (!port || !writer) throw new Error("Port not open");
  const matrixStr = matrix.map(row => row.join('').replace(/0/g,'-').replace(/1/g,'#')).join('\n');
  const encoded = encode(matrixStr, address);
  await writeIt(encoded);
}

export { displayMain, openPort, writeIt, encode };
