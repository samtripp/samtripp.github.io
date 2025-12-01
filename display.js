const HEADER = '\x02';
const FOOTER = '\x03';

let port;
let writer;

function chrToHexTo4bit(character) {
  return parseInt(character, 16);
}

function decode2BytesToNumber(one, two) {
  return (chrToHexTo4bit(one) << 4) | chrToHexTo4bit(two);
}

function encodeNumberTo2Bytes(number) {
  const high = (number >> 4) & 0x0F;
  const low = number & 0x0F;
  // Return ASCII characters '0'-'F'
  return [high.toString(16).toUpperCase(), low.toString(16).toUpperCase()];
}

function calculateChecksum(data, header) {
  let sum = HEADER.charCodeAt(0);
  for (const h of header) sum += h.charCodeAt(0);
  for (const d of data) sum += d.charCodeAt(0);
  sum += 1;
  sum &= 0xFF;
  sum ^= 0xFF;
  sum += 1;
  sum &= 0xFF;
  return sum;
}

function encode(matrixHashDash, address = 1) {
  const matrix = matrixHashDash.trim().split('\n');
  const rows = matrix.length;
  const columns = matrix[0].length;

  const constant = 1;
  const header = [String(constant), String(address)];

  const data = [];
  for (let col = 0; col < columns; col++) {
    const column = matrix.map(row => row[col]).join('').replace(/[- ]/g,'0').replace(/#/g,'1');
    const reversed = column.split('').reverse().join('');
    const nibbles = [
      reversed.slice(8,12),
      reversed.slice(12,16),
      reversed.slice(0,4),
      reversed.slice(4,8)
    ];
    for (const nib of nibbles) {
      data.push(parseInt(nib,2).toString(16).toUpperCase());
    }
  }

  // checksum
  const checksum = calculateChecksum(data, header);
  const footerBytes = encodeNumberTo2Bytes(checksum);

  // build final string
  return HEADER + header.join('') + data.join('') + FOOTER + footerBytes.join('');
}

// Open port
async function openPort(selectedPort) {
  if (!selectedPort) throw new Error("No port selected");
  port = selectedPort;
  await port.open({ baudRate: 4800 });
  writer = port.writable.getWriter();
}

// Write string to port (converted to Uint8Array)
async function writeIt(str) {
  if (!writer) throw new Error("Port not open");
  const encoded = new TextEncoder().encode(str); // ASCII bytes
  await writer.write(encoded);
}

// Display matrix
async function displayMain(matrix, address = 1) {
  if (!writer) throw new Error("Port not open");
  const matrixStr = matrix.map(row => row.join('').replace(/0/g,'-').replace(/1/g,'#')).join('\n');
  const encodedString = encode(matrixStr, address);
  await writeIt(encodedString);
}

export { displayMain, openPort, writeIt, encode };
