// display.js
const HEADER = '\x02';
const FOOTER = '\x03';

let port;
let writer;

function chrToHexTo4bit(character) {
  const number = parseInt(character, 16);
  return number.toString(2).padStart(4, '0');
}

function decode2BytesToNumber(one, two) {
  const bits = chrToHexTo4bit(one) + chrToHexTo4bit(two);
  return parseInt(bits, 2);
}

function encodeNumberTo2Bytes(number) {
  const binary = number.toString(2).padStart(8, '0');
  const one = parseInt(binary.slice(0, 4), 2).toString(16).toUpperCase();
  const two = parseInt(binary.slice(4), 2).toString(16).toUpperCase();
  return [one, two];
}

function calculateChecksum(data, header, head) {
  let summed = 0;
  const tmp = [head.charCodeAt(0), ...header.map(c => c.charCodeAt(0))];
  summed += tmp.reduce((a, b) => a + b, 0);

  const dataBytes = [];
  for (const number of data) {
    for (const val of encodeNumberTo2Bytes(number)) {
      dataBytes.push(val.charCodeAt(0));
    }
  }

  summed += dataBytes.reduce((a, b) => a + b, 0);
  summed += 1;

  summed &= 0xFF;
  summed ^= 255;
  summed += 1;
  return summed;
}

function encode(matrixHashDash, address = 1) {
  const matrix = matrixHashDash.trim().split('\n');
  const constant = 1;
  const rows = matrix.length;
  const columns = matrix[0].length;

  const header = [String(constant), String(address)];
  const dataSize = (rows * columns) / 8;
  for (const c of encodeNumberTo2Bytes(dataSize)) header.push(c);

  const data = [];
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
      const num = parseInt(nib, 2);
      data.push(num.toString(16).toUpperCase());
    }
  }

  const checksumData = [];
  for (let i = 0; i < data.length; i += 2) {
    checksumData.push(decode2BytesToNumber(data[i], data[i + 1]));
  }

  let footer = calculateChecksum(checksumData, header, HEADER);
  footer = encodeNumberTo2Bytes(footer);

  return [HEADER, ...header, ...data, FOOTER, ...footer].join('');
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

async function writeIt(encoded) {
  if (!writer) throw new Error('Port not open');

  const data = new Uint8Array(
    Array.from(encoded).map(c => c.charCodeAt(0))
  );
  await writer.write(data);
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
