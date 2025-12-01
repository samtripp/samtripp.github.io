// display.js
const HEADER = '\x02';
const FOOTER = '\x03';

let port;
let writer;

/* ---------------- Helper functions ---------------- */

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
  const matrix = matrixHashDash.map(row => row.join('')).join('\n').trim().split('\n');
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

/* ---------------- Web Serial functions ---------------- */

/**
 * Open a Web Serial port.
 * Must be called from a user gesture (button click).
 * @param {SerialPort} selectedPort - Port returned by requestPort()
 * @param {number} baudRate - Baud rate (default 4800)
 */
export async function openPort(selectedPort, baudRate = 4800) {
  port = selectedPort;
  await port.open({ baudRate });
  writer = port.writable.getWriter();
}

/**
 * Write an encoded matrix to the connected port.
 * @param {string[][]} matrix - 2D array of 0/1 values
 * @param {number} address - Device address
 */
export async function displayMain(matrix, address = 1) {
  if (!port || !writer) {
    throw new Error("Port not open! Call openPort() first.");
  }

  const encoded = encode(matrix, address);
  const data = new Uint8Array(Array.from(encoded).map(c => c.charCodeAt(0)));
  await writer.write(data);
}

/**
 * Close the port and release writer lock.
 */
export async function closePort() {
  if (writer) {
    await writer.releaseLock();
    writer = null;
  }
  if (port) {
    await port.close();
    port = null;
  }
}
