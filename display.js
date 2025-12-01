// display.js
const HEADER = 0x02;
const FOOTER = 0x03;

let port;
let writer;

function encodeNumberTo2Bytes(number) {
  const high = (number >> 4) & 0x0f;
  const low = number & 0x0f;
  return [high, low];
}

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

function encode(matrixHashDash, address = 1) {
  const matrix = matrixHashDash.trim().split('\n');
  const rows = matrix.length;
  const cols = matrix[0].length;

  const constant = 1;
  const header = [constant, address];
  const dataSize = (rows * cols) / 8;
  header.push(...encodeNumberTo2Bytes(dataSize));

  const dataBytes = [];

  for (let col = 0; col < cols; col++) {
    const column = matrix.map(row => row[col]).join('').replace(/[- ]/g,'0').replace(/#/g,'1');
    const reversed = column.split('').reverse().join('');
    const nibbles = [
      reversed.slice(8,12),
      reversed.slice(12,16),
      reversed.slice(0,4),
      reversed.slice(4,8)
    ];
    // merge nibbles into full byte
    for (let i = 0; i < nibbles.length; i += 2) {
      const high = parseInt(nibbles[i],2);
      const low  = parseInt(nibbles[i+1],2);
      dataBytes.push((high << 4) | low);
    }
  }

  const checksum = calculateChecksum(dataBytes, header);

  const finalBytes = [HEADER, ...header, ...dataBytes, FOOTER, checksum];
  return new Uint8Array(finalBytes);
}

async function openPort(selectedPort) {
  if (!selectedPort) throw new Error("No port selected");
  port = selectedPort;
  await port.open({ baudRate: 4800 });
  writer = port.writable.getWriter();
}

async function writeIt(bytes) {
  if (!writer) throw new Error("Port not open");
  await writer.write(bytes);
}

async function displayMain(matrix, address = 1) {
  if (!port || !writer) throw new Error("Port not open");
  const matrixStr = matrix.map(row => row.map(v => v ? '#' : '-').join('')).join('\n');
  const encoded = encode(matrixStr, address);
  await writeIt(encoded);
}

export { displayMain, openPort, writeIt, encode };
