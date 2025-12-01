const HEADER = '\x02';
const FOOTER = '\x03';

function chrToHexTo4bit(c) {
  return parseInt(c, 16).toString(2).padStart(4, '0');
}

function decode2BytesToNumber(one, two) {
  return parseInt(chrToHexTo4bit(one) + chrToHexTo4bit(two), 2);
}

function encodeNumberTo2Bytes(number) {
  const binary = number.toString(2).padStart(8, '0');
  const one = parseInt(binary.slice(0,4),2).toString(16).toUpperCase();
  const two = parseInt(binary.slice(4),2).toString(16).toUpperCase();
  return [one, two];
}

function calculateChecksum(data, header, head) {
  let summed = [head.charCodeAt(0), ...header.map(c=>c.charCodeAt(0))].reduce((a,b)=>a+b,0);
  const dataBytes = data.flatMap(n => encodeNumberTo2Bytes(n).map(v=>v.charCodeAt(0)));
  summed += dataBytes.reduce((a,b)=>a+b,0) + 1;
  summed &= 0xFF;
  summed ^= 255;
  summed += 1;
  return summed;
}

function encode(matrixHashDash, address=1) {
  const matrix = matrixHashDash.trim().split('\n');
  const header = [1, address];
  const dataSize = (matrix.length * matrix[0].length)/8;
  header.push(...encodeNumberTo2Bytes(dataSize));

  const data = [];
  for(let col=0;col<matrix[0].length;col++){
    const column = matrix.map(r=>r[col]).join('').replace(/[- ]/g,'0').replace(/#/g,'1');
    const reversed = column.split('').reverse().join('');
    const nibbles = [reversed.slice(8,12), reversed.slice(12,16), reversed.slice(0,4), reversed.slice(4,8)];
    nibbles.forEach(nib=>data.push(parseInt(nib,2).toString(16).toUpperCase()));
  }

  const checksumData = [];
  for(let i=0;i<data.length;i+=2) checksumData.push(decode2BytesToNumber(data[i], data[i+1]));

  const footer = encodeNumberTo2Bytes(calculateChecksum(checksumData, header, HEADER));
  return [HEADER,...header,...data,FOOTER,...footer].join('');
}

// Web Serial
let port;
let writer;

async function openPort(selectedPort) {
  port = selectedPort;
  if (!port.readable) {
    await port.open({ baudRate: 4800 });
  }
  writer = port.writable.getWriter();
}

async function writeIt(encoded) {
  if (!writer) throw new Error("Serial port not open.");
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(encoded));
}

async function displayMain(matrix, address=1) {
  if (!port || !writer) throw new Error("Port not open.");
  const matrixStr = matrix.map(r=>r.join('').replace(/0/g,'-').replace(/1/g,'#')).join('\n');
  const encoded = encode(matrixStr,address);
  await writeIt(encoded);
}

export { displayMain, openPort, writeIt, encode };
